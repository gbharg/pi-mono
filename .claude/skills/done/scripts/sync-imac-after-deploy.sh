#!/bin/bash
# sync-imac-after-deploy.sh — Refresh the iMac runtime after deployment.
#
# Commits dirty tracked files, pulls latest main, rebuilds, and restarts
# the gateway. Always operates on the source checkout (no deploy clone).
#
# Usage: sync-imac-after-deploy.sh [--host <user@host>] [--repo <path>] [--quiet]
# Exit: always 0 (non-fatal — failures are logged, never block /done)

set -euo pipefail

IMAC_HOST="${IMAC_HOST:-agent@gautams-imac}"
IMAC_PASS="${IMAC_PASS:-${IMAC_SSH_PASS:-$(cat ~/.imac-ssh-pass 2>/dev/null || echo "")}}"
REPO_DIR="${IMAC_REPO:-/Users/Shared/openclaw}"
LIVE_LINK="${IMAC_LIVE_LINK:-/Users/Shared/openclaw-live}"
REMOTE_URL="${IMAC_REMOTE_URL:-$(git remote get-url origin 2>/dev/null || true)}"
QUIET=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --host) IMAC_HOST="$2"; shift 2 ;;
        --repo) REPO_DIR="$2"; shift 2 ;;
        --quiet) QUIET=1; shift ;;
        *) shift ;;
    esac
done

say() { [[ "$QUIET" -eq 1 ]] || echo "$*"; }

repo_quoted=$(printf '%q' "$REPO_DIR")
live_link_quoted=$(printf '%q' "$LIVE_LINK")
remote_url_quoted=$(printf '%q' "$REMOTE_URL")
remote_cmd=$(cat <<EOF
set -euo pipefail
export PATH="\$HOME/Library/pnpm:\$HOME/.local/share/pnpm:/opt/homebrew/bin:/usr/local/bin:\$PATH"
REPO_DIR=$repo_quoted
LIVE_LINK=$live_link_quoted
REMOTE_URL=$remote_url_quoted
SYNC_SCRIPT="\$HOME/.openclaw/bin/sync-shared-skills.sh"
SYNC_SOURCE_DIR="\$HOME/.openclaw/shared-skills-source"
AUTO_UPDATE_LABEL="com.openclaw.imac-auto-update"

# --- Pre-flight: guard against runtime-path owner conflicts (FU-20260310-004) ---

# Check 1: auto-update service must not be loaded while deploy-sync manages updates
if launchctl list "\$AUTO_UPDATE_LABEL" >/dev/null 2>&1; then
    echo "CONFLICT: \$AUTO_UPDATE_LABEL is loaded — it conflicts with deploy-sync ownership"
    GW_UID=\$(id -u)
    PLIST_PATH="\$HOME/Library/LaunchAgents/\${AUTO_UPDATE_LABEL}.plist"
    if launchctl bootout "gui/\$GW_UID/\$AUTO_UPDATE_LABEL" 2>/dev/null; then
        echo "RESOLVED: unloaded \$AUTO_UPDATE_LABEL"
    elif [[ -f "\$PLIST_PATH" ]]; then
        launchctl unload "\$PLIST_PATH" 2>/dev/null && echo "RESOLVED: unloaded \$AUTO_UPDATE_LABEL (legacy)" || true
    fi
    # Verify it is actually gone
    if launchctl list "\$AUTO_UPDATE_LABEL" >/dev/null 2>&1; then
        echo "FATAL: could not unload \$AUTO_UPDATE_LABEL — aborting deploy-sync to avoid dual-writer conflict"
        exit 1
    fi
fi

# Check 2: live symlink must point at the deploy-sync managed path
if [[ -L "\$LIVE_LINK" ]]; then
    CURRENT_TARGET=\$(readlink "\$LIVE_LINK" 2>/dev/null || echo "")
    if [[ "\$CURRENT_TARGET" != "\$REPO_DIR" ]]; then
        echo "CONFLICT: \$LIVE_LINK points to \$CURRENT_TARGET (expected \$REPO_DIR)"
        echo "Fixing symlink to point at \$REPO_DIR"
        ln -sfn "\$REPO_DIR" "\$LIVE_LINK"
        echo "RESOLVED: \$LIVE_LINK -> \$REPO_DIR"
    fi
elif [[ -e "\$LIVE_LINK" ]]; then
    echo "FATAL: \$LIVE_LINK exists but is not a symlink — refusing to overwrite"
    exit 1
fi

# --- End pre-flight ---

if [[ ! -d "\$REPO_DIR/.git" ]]; then
    echo "SKIP: \$REPO_DIR is not a git repository"
    exit 0
fi

current_branch=\$(git -C "\$REPO_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
if [[ "\$current_branch" != "main" ]]; then
    echo "WARN: iMac source repo is on \$current_branch, switching to main"
    git -C "\$REPO_DIR" checkout main 2>/dev/null || { echo "WARN: cannot switch to main"; exit 0; }
fi

dirty=\$(git -C "\$REPO_DIR" status --short --untracked-files=no 2>/dev/null || true)
if [[ -n "\$dirty" ]]; then
    echo "iMac source repo has local changes, committing before pull"
    git -C "\$REPO_DIR" add -A memory/ config/ skills/
    if ! git -C "\$REPO_DIR" commit -m "chore(iMac): auto-commit local changes before sync"; then
        echo "WARN: iMac auto-commit failed, aborting pull to avoid data loss"
        exit 0
    fi
fi

if ! git -C "\$REPO_DIR" fetch origin main >/dev/null 2>&1; then
    echo "WARN: iMac fetch failed"
    exit 0
fi

if ! git -C "\$REPO_DIR" pull --ff-only origin main >/dev/null 2>&1; then
    echo "WARN: iMac ff-only pull failed, trying rebase"
    git -C "\$REPO_DIR" pull --rebase origin main || { echo "WARN: rebase failed"; exit 0; }
fi

cd "\$REPO_DIR"

# Apply canonical iMac settings
SETTINGS_SRC="\$REPO_DIR/config/claude/settings-imac.json"
SETTINGS_DST="\$HOME/.claude/settings.json"
if [[ -f "\$SETTINGS_SRC" ]]; then
    tmp_settings="\$(mktemp "\$(dirname "\$SETTINGS_DST")/.safe-copy.XXXXXX")"
    cp "\$SETTINGS_SRC" "\$tmp_settings"
    src_sz="\$(stat -f%z "\$SETTINGS_SRC" 2>/dev/null || stat -c%s "\$SETTINGS_SRC" 2>/dev/null)"
    tmp_sz="\$(stat -f%z "\$tmp_settings" 2>/dev/null || stat -c%s "\$tmp_settings" 2>/dev/null)"
    if [[ "\$src_sz" == "\$tmp_sz" ]]; then
        mv -f "\$tmp_settings" "\$SETTINGS_DST"
        echo "iMac settings.json applied from repo (atomic)"
    else
        rm -f "\$tmp_settings"
        echo "WARN: iMac settings copy size mismatch, skipping"
    fi
fi

install_log=\$(mktemp /tmp/done-imac-install.XXXXXX.log)
if pnpm install --frozen-lockfile >"\$install_log" 2>&1; then
    echo "iMac dependencies ready"
elif grep -q 'ERR_PNPM_OUTDATED_LOCKFILE' "\$install_log" 2>/dev/null; then
    echo "WARN: iMac lockfile is stale, retrying install without frozen lockfile"
    if pnpm install --no-frozen-lockfile >"\$install_log" 2>&1; then
        echo "iMac dependencies ready"
    else
        echo "WARN: iMac dependency install failed"
        tail -n 20 "\$install_log"
        rm -f "\$install_log"
        exit 0
    fi
else
    echo "WARN: iMac dependency install failed"
    tail -n 20 "\$install_log"
    rm -f "\$install_log"
    exit 0
fi
rm -f "\$install_log"

if [[ -x "\$SYNC_SCRIPT" ]]; then
    if bash "\$SYNC_SCRIPT" --repo "\$REPO_DIR" --source-dir "\$SYNC_SOURCE_DIR" --mirror-from-repo --force --quiet; then
        echo "iMac skills refreshed"
    else
        echo "WARN: iMac skill refresh failed"
    fi
fi

build_log=\$(mktemp /tmp/done-imac-build.XXXXXX.log)
if pnpm build >"\$build_log" 2>&1; then
    echo "iMac pull/build complete"
    tail -n 5 "\$build_log"
else
    echo "WARN: iMac build failed"
    tail -n 20 "\$build_log"
    rm -f "\$build_log"
    exit 0
fi

# Control UI build (required since 3.8 — /health returns 503 without it)
ui_log=\$(mktemp /tmp/done-imac-ui-build.XXXXXX.log)
if node scripts/ui.js build >"\$ui_log" 2>&1; then
    echo "iMac Control UI built"
else
    echo "WARN: iMac Control UI build failed"
    tail -n 10 "\$ui_log"
    rm -f "\$ui_log" "\$build_log"
    exit 0
fi
rm -f "\$ui_log"

rm -f "\$build_log"

# Remove built-in extensions that conflict with user overrides in ~/.openclaw/extensions/.
# The upstream repo ships bluebubbles + memory-recall as built-in extensions, but the iMac
# uses custom overrides. Without this cleanup, both load and the webhook route breaks.
for ext_name in bluebubbles memory-recall skill-router; do
    if [[ -d "\$REPO_DIR/extensions/\$ext_name" ]] && [[ -d "\$HOME/.openclaw/extensions/\$ext_name" ]]; then
        rm -rf "\$REPO_DIR/extensions/\$ext_name"
        echo "iMac removed duplicate built-in extension: \$ext_name"
    fi
done

ln -sfn "\$REPO_DIR" "\$LIVE_LINK"
echo "iMac live link updated -> \$REPO_DIR"

PLIST="\$HOME/Library/LaunchAgents/ai.openclaw.gateway.plist"
DESIRED_ENTRY="\$LIVE_LINK/dist/entry.js"
if [[ -f "\$PLIST" ]]; then
    current_entry=$(/usr/libexec/PlistBuddy -c "Print :ProgramArguments:1" "\$PLIST" 2>/dev/null || echo "")
    if [[ "\$current_entry" != "\$DESIRED_ENTRY" ]]; then
        if /usr/libexec/PlistBuddy -c "Set :ProgramArguments:1 \$DESIRED_ENTRY" "\$PLIST" 2>/dev/null; then
            echo "iMac gateway plist updated -> \$DESIRED_ENTRY"
        else
            echo "WARN: failed to update gateway plist entrypoint"
        fi
    fi
fi

# Restart gateway via launchctl bootout+bootstrap (not kill+KeepAlive).
# KeepAlive cannot respawn a deregistered service, so always re-bootstrap.
GW_LABEL="ai.openclaw.gateway"
GW_UID=\$(id -u)

# Bootout (stop + deregister); ignore errors if already deregistered
launchctl bootout "gui/\$GW_UID/\$GW_LABEL" 2>/dev/null || true
sleep 2

# Bootstrap (register + start)
if launchctl bootstrap "gui/\$GW_UID" "\$PLIST" 2>/dev/null; then
    echo "iMac gateway bootstrapped"
else
    echo "WARN: bootstrap failed, retrying after brief wait"
    sleep 3
    launchctl bootstrap "gui/\$GW_UID" "\$PLIST" 2>/dev/null || echo "WARN: gateway bootstrap retry failed"
fi

# Health check with retries (gateway needs ~10s to warm up)
for i in 1 2 3; do
    sleep 5
    if curl -sf http://127.0.0.1:18789/health >/dev/null 2>&1; then
        echo "iMac gateway restarted and healthy"
        break
    fi
    if [[ "\$i" -eq 3 ]]; then
        echo "WARN: iMac gateway not healthy after 15s — check logs"
    fi
done

# Notify Gautam that gateway is back online (runs in background)
NOTIFY_SCRIPT="\$REPO_DIR/scripts/gateway-online-notify.sh"
if [[ -x "\$NOTIFY_SCRIPT" ]]; then
    bash "\$NOTIFY_SCRIPT" &
fi
EOF
)
remote_cmd_b64=$(printf '%s' "$remote_cmd" | base64 | tr -d '\n')

# Sync local extension overrides to iMac ~/.openclaw/extensions/ before the
# remote command runs.  The repo ships skill-router as a built-in extension, but
# the iMac uses a custom override.  Rsync the local copy so the override stays
# current after every deploy.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
RSYNC_SSH="sshpass -p '$IMAC_PASS' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10"

for ext_override in skill-router; do
    local_ext="$LOCAL_REPO_ROOT/extensions/$ext_override"
    if [[ -d "$local_ext" ]]; then
        if rsync -az --delete \
            --exclude='node_modules' \
            --exclude='.DS_Store' \
            -e "$RSYNC_SSH" \
            "$local_ext/" "$IMAC_HOST:~/.openclaw/extensions/$ext_override/" < /dev/null 2>&1; then
            say "iMac extension override synced: $ext_override"
        else
            say "WARN: failed to rsync $ext_override to iMac"
        fi
    fi
done

if output=$(sshpass -p "$IMAC_PASS" ssh \
    -o StrictHostKeyChecking=no \
    -o ConnectTimeout=10 \
    "$IMAC_HOST" "printf '%s' '$remote_cmd_b64' | base64 -d | bash" 2>&1); then
    [[ -n "$output" ]] && say "$output"
else
    say "WARN: iMac sync failed ($IMAC_HOST)"
    [[ -n "$output" ]] && say "$output"
fi

# Run validation (non-fatal)
VALIDATE_SCRIPT="$(dirname "$0")/validate-imac-sync.sh"
if [[ -x "$VALIDATE_SCRIPT" ]]; then
    echo ""
    echo "=== iMac Sync Validation ==="
    bash "$VALIDATE_SCRIPT" --host "$IMAC_HOST" || true
fi

exit 0
