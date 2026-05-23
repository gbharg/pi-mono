#!/bin/bash
# validate-imac-sync.sh — Validate iMac sync parity after deployment.
#
# Checks repo HEAD, rules parity, symlink integrity, settings sanity,
# settings parity, dirty state, deploy clone absence, live symlink,
# and auto-update service conflict.
#
# Usage: validate-imac-sync.sh [--host <user@host>] [--quiet]
# Exit: 0 if all checks pass, 1 if any fail

set -euo pipefail

IMAC_HOST="${IMAC_HOST:-agent@gautams-imac}"
IMAC_PASS="${IMAC_PASS:-${IMAC_SSH_PASS:-$(cat ~/.imac-ssh-pass 2>/dev/null || echo "")}}"
REPO_DIR="${IMAC_REPO:-/Users/Shared/openclaw}"
QUIET=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --host) IMAC_HOST="$2"; shift 2 ;;
        --quiet) QUIET=1; shift ;;
        *) shift ;;
    esac
done

say() { [[ "$QUIET" -eq 1 ]] || echo "$*"; }

TOTAL=9
PASSED=0

# --- Local data collection ---

# Get local origin/main HEAD
LOCAL_HEAD=$(git rev-parse origin/main 2>/dev/null || echo "unknown")

# Compute local rules MD5s (sorted by filename for deterministic order)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
LOCAL_RULES_DIR="$REPO_ROOT/config/claude/rules"
LOCAL_RULES_MD5=""
if [[ -d "$LOCAL_RULES_DIR" ]]; then
    LOCAL_RULES_MD5=$(find "$LOCAL_RULES_DIR" -name '*.md' -exec basename {} \; | sort | while read -r f; do
        md5 -q "$LOCAL_RULES_DIR/$f" 2>/dev/null || md5sum "$LOCAL_RULES_DIR/$f" 2>/dev/null | cut -d' ' -f1
    done | paste -s -d',' -)
fi
LOCAL_RULES_COUNT=$(find "$LOCAL_RULES_DIR" -name '*.md' 2>/dev/null | wc -l | tr -d ' ')

# Get local settings for parity comparison
LOCAL_SETTINGS="$REPO_ROOT/config/claude/settings-imac.json"
LOCAL_PLUGINS=""
LOCAL_HOOK_EVENTS=""
if [[ -f "$LOCAL_SETTINGS" ]]; then
    LOCAL_PLUGINS=$(jq -cS '.enabledPlugins // {}' "$LOCAL_SETTINGS" 2>/dev/null || echo "{}")
    LOCAL_HOOK_EVENTS=$(jq -cS '.hooks | keys' "$LOCAL_SETTINGS" 2>/dev/null || echo "[]")
fi

# --- Build remote validation command ---
repo_quoted=$(printf '%q' "$REPO_DIR")
local_head_quoted=$(printf '%q' "$LOCAL_HEAD")
local_rules_md5_quoted=$(printf '%q' "$LOCAL_RULES_MD5")
local_rules_count_quoted=$(printf '%q' "$LOCAL_RULES_COUNT")
local_plugins_quoted=$(printf '%q' "$LOCAL_PLUGINS")
local_hook_events_quoted=$(printf '%q' "$LOCAL_HOOK_EVENTS")

remote_cmd=$(cat <<EOF
set -euo pipefail
REPO_DIR=$repo_quoted
LOCAL_HEAD=$local_head_quoted
LOCAL_RULES_MD5=$local_rules_md5_quoted
LOCAL_RULES_COUNT=$local_rules_count_quoted
LOCAL_PLUGINS=$local_plugins_quoted
LOCAL_HOOK_EVENTS=$local_hook_events_quoted
PASSED=0
TOTAL=9

# Check 1: Repo HEAD matches origin/main
if [[ -d "\$REPO_DIR/.git" ]]; then
    git -C "\$REPO_DIR" fetch origin main >/dev/null 2>&1 || true
    IMAC_HEAD=\$(git -C "\$REPO_DIR" rev-parse HEAD 2>/dev/null || echo "unknown")
    IMAC_ORIGIN=\$(git -C "\$REPO_DIR" rev-parse origin/main 2>/dev/null || echo "unknown")
    SHORT_HEAD=\${IMAC_HEAD:0:10}
    if [[ "\$IMAC_HEAD" == "\$IMAC_ORIGIN" ]]; then
        echo "[PASS] Repo HEAD: \$SHORT_HEAD (matches origin/main)"
        PASSED=\$((PASSED + 1))
    else
        echo "[FAIL] Repo HEAD: \$SHORT_HEAD (origin/main: \${IMAC_ORIGIN:0:10})"
    fi
else
    echo "[FAIL] Repo HEAD: \$REPO_DIR is not a git repository"
fi

# Check 2: Rules file parity (MD5 comparison)
RULES_DIR="\$REPO_DIR/config/claude/rules"
if [[ -d "\$RULES_DIR" ]]; then
    IMAC_RULES_MD5=\$(find "\$RULES_DIR" -name '*.md' -exec basename {} \; | sort | while read -r f; do
        md5 -q "\$RULES_DIR/\$f" 2>/dev/null || md5sum "\$RULES_DIR/\$f" 2>/dev/null | cut -d' ' -f1
    done | paste -s -d',' -)
    IMAC_RULES_COUNT=\$(find "\$RULES_DIR" -name '*.md' 2>/dev/null | wc -l | tr -d ' ')
    if [[ "\$IMAC_RULES_MD5" == "\$LOCAL_RULES_MD5" ]] && [[ "\$IMAC_RULES_COUNT" == "\$LOCAL_RULES_COUNT" ]]; then
        echo "[PASS] Rules parity: \$IMAC_RULES_COUNT/\$LOCAL_RULES_COUNT files match"
        PASSED=\$((PASSED + 1))
    else
        echo "[FAIL] Rules parity: MD5 mismatch (iMac: \$IMAC_RULES_COUNT files, MBP: \$LOCAL_RULES_COUNT files)"
    fi
else
    echo "[FAIL] Rules parity: \$RULES_DIR not found"
fi

# Check 3: Symlink integrity (~/.claude/rules/*.md resolve to readable files)
SYMLINK_DIR="\$HOME/.claude/rules"
if [[ -d "\$SYMLINK_DIR" ]]; then
    SYMLINK_TOTAL=0
    SYMLINK_OK=0
    for link in "\$SYMLINK_DIR"/*.md; do
        [[ -e "\$link" ]] || continue
        SYMLINK_TOTAL=\$((SYMLINK_TOTAL + 1))
        if [[ -r "\$link" ]] && [[ -f "\$(readlink -f "\$link" 2>/dev/null || echo "\$link")" ]]; then
            SYMLINK_OK=\$((SYMLINK_OK + 1))
        fi
    done
    if [[ "\$SYMLINK_TOTAL" -gt 0 ]] && [[ "\$SYMLINK_OK" -eq "\$SYMLINK_TOTAL" ]]; then
        echo "[PASS] Symlinks: \$SYMLINK_OK/\$SYMLINK_TOTAL resolve correctly"
        PASSED=\$((PASSED + 1))
    elif [[ "\$SYMLINK_TOTAL" -eq 0 ]]; then
        echo "[FAIL] Symlinks: no .md files found in \$SYMLINK_DIR"
    else
        echo "[FAIL] Symlinks: \$SYMLINK_OK/\$SYMLINK_TOTAL resolve correctly"
    fi
else
    echo "[FAIL] Symlinks: \$SYMLINK_DIR not found"
fi

# Check 4: Settings sanity (no sandbox key, valid JSON, Linear disabled)
SETTINGS_FILE="\$HOME/.claude/settings.json"
if [[ -f "\$SETTINGS_FILE" ]]; then
    SANITY_OK=true
    SANITY_ISSUES=""

    if ! jq empty "\$SETTINGS_FILE" 2>/dev/null; then
        SANITY_OK=false
        SANITY_ISSUES="invalid JSON"
    else
        HAS_SANDBOX=\$(jq 'has("sandbox")' "\$SETTINGS_FILE" 2>/dev/null || echo "true")
        if [[ "\$HAS_SANDBOX" == "true" ]]; then
            SANITY_OK=false
            SANITY_ISSUES="\${SANITY_ISSUES:+\$SANITY_ISSUES, }sandbox key present"
        fi

        LINEAR_STATE=\$(jq -r '.enabledPlugins["linear@claude-plugins-official"] // "missing"' "\$SETTINGS_FILE" 2>/dev/null)
        if [[ "\$LINEAR_STATE" != "false" ]] && [[ "\$LINEAR_STATE" != "missing" ]]; then
            SANITY_OK=false
            SANITY_ISSUES="\${SANITY_ISSUES:+\$SANITY_ISSUES, }Linear plugin not disabled (state: \$LINEAR_STATE)"
        fi
    fi

    if [[ "\$SANITY_OK" == "true" ]]; then
        echo "[PASS] Settings: no known-bad values"
        PASSED=\$((PASSED + 1))
    else
        echo "[FAIL] Settings: \$SANITY_ISSUES"
    fi
else
    echo "[FAIL] Settings: \$SETTINGS_FILE not found"
fi

# Check 5: Settings parity (plugin states, hook event structure)
if [[ -f "\$SETTINGS_FILE" ]]; then
    PARITY_OK=true
    PARITY_ISSUES=""

    IMAC_PLUGINS=\$(jq -cS '.enabledPlugins // {}' "\$SETTINGS_FILE" 2>/dev/null || echo "{}")
    if [[ "\$IMAC_PLUGINS" != "\$LOCAL_PLUGINS" ]]; then
        PARITY_OK=false
        PARITY_ISSUES="plugins differ"
    fi

    IMAC_HOOK_EVENTS=\$(jq -cS '.hooks | keys' "\$SETTINGS_FILE" 2>/dev/null || echo "[]")
    if [[ "\$IMAC_HOOK_EVENTS" != "\$LOCAL_HOOK_EVENTS" ]]; then
        PARITY_OK=false
        PARITY_ISSUES="\${PARITY_ISSUES:+\$PARITY_ISSUES, }hook events differ"
    fi

    if [[ "\$PARITY_OK" == "true" ]]; then
        echo "[PASS] Settings parity: plugins match, hooks match"
        PASSED=\$((PASSED + 1))
    else
        echo "[FAIL] Settings parity: \$PARITY_ISSUES"
    fi
else
    echo "[FAIL] Settings parity: settings.json not found"
fi

# Check 6: No dirty tracked files
dirty=\$(git -C "\$REPO_DIR" status --short --untracked-files=no 2>/dev/null || true)
if [[ -z "\$dirty" ]]; then
    echo "[PASS] Clean state: no dirty tracked files"
    PASSED=\$((PASSED + 1))
else
    dirty_count=\$(echo "\$dirty" | wc -l | tr -d ' ')
    echo "[FAIL] Clean state: \$dirty_count dirty tracked files"
fi

# Check 7: Deploy clone absent
if [[ ! -d "/Users/Shared/openclaw-deploy" ]]; then
    echo "[PASS] No deploy clone"
    PASSED=\$((PASSED + 1))
else
    echo "[FAIL] No deploy clone: /Users/Shared/openclaw-deploy still exists"
fi

# Check 8: Live symlink correct
LIVE_LINK="/Users/Shared/openclaw-live"
if [[ -L "\$LIVE_LINK" ]]; then
    LIVE_TARGET=\$(readlink "\$LIVE_LINK" 2>/dev/null || echo "")
    if [[ "\$LIVE_TARGET" == "/Users/Shared/openclaw" ]]; then
        echo "[PASS] Live symlink correct"
        PASSED=\$((PASSED + 1))
    else
        echo "[FAIL] Live symlink correct: points to \$LIVE_TARGET (expected /Users/Shared/openclaw)"
    fi
elif [[ -e "\$LIVE_LINK" ]]; then
    echo "[FAIL] Live symlink correct: \$LIVE_LINK exists but is not a symlink"
else
    echo "[FAIL] Live symlink correct: \$LIVE_LINK does not exist"
fi

# Check 9: No auto-update service conflict (FU-20260310-004)
AUTO_UPDATE_LABEL="com.openclaw.imac-auto-update"
if launchctl list "\$AUTO_UPDATE_LABEL" >/dev/null 2>&1; then
    echo "[FAIL] Auto-update conflict: \$AUTO_UPDATE_LABEL is loaded (conflicts with deploy-sync)"
else
    echo "[PASS] No auto-update conflict"
    PASSED=\$((PASSED + 1))
fi

echo "RESULT: \$PASSED/\$TOTAL checks passed"
if [[ "\$PASSED" -eq "\$TOTAL" ]]; then
    exit 0
else
    exit 1
fi
EOF
)

remote_cmd_b64=$(printf '%s' "$remote_cmd" | base64 | tr -d '\n')

if output=$(sshpass -p "$IMAC_PASS" ssh \
    -o StrictHostKeyChecking=no \
    -o ConnectTimeout=10 \
    "$IMAC_HOST" "printf '%s' '$remote_cmd_b64' | base64 -d | bash" 2>&1); then
    say "$output"
    if echo "$output" | grep -q "^RESULT:.*$TOTAL/$TOTAL"; then
        exit 0
    else
        exit 1
    fi
else
    rc=$?
    say "WARN: iMac validation failed ($IMAC_HOST)"
    [[ -n "$output" ]] && say "$output"
    exit "$rc"
fi
