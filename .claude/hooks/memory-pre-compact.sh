#!/bin/bash
# memory-pre-compact.sh — PreCompact hook for pi-mono session memory.
#
# Fires before Claude Code compacts the conversation. Persists a minimal
# session extract so post-compact sessions can recall what happened.
#
# Writes:
#   memory/sessions/<session_id>.md    (one-shot; created if missing)
#   memory/daily/YYYY-MM-DD.md         (appended marker line)
#   /tmp/pi-mono-session-snapshot.md   (overwritten each compact;
#                                       memory-bootstrap.sh injects it on
#                                       the next prompt so the compacted
#                                       session resumes with git + context
#                                       continuity)
#
# Best-effort; never blocks compaction.
#
# Input: JSON on stdin (Claude Code PreCompact event payload).

set -uo pipefail

REPO="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
MEMORY_DIR="$REPO/memory"
[ -d "$MEMORY_DIR" ] || exit 0

INPUT=""
[ ! -t 0 ] && INPUT=$(cat 2>/dev/null || true)

# Single python invocation for both fields; tab-separated so we can read them.
PARSED=$(printf '%s' "$INPUT" | python3 -c '
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get("session_id", "") + "\t" + d.get("trigger", "auto"))
except Exception:
    print("\tauto")
' 2>/dev/null || printf '\tauto')
SESSION_ID="${PARSED%%$'\t'*}"
TRIGGER="${PARSED#*$'\t'}"
[ -z "$TRIGGER" ] && TRIGGER="auto"

# Reject session IDs that contain anything outside the UUID/hex/dash alphabet
# so the value can be safely embedded in file paths.
if [ -n "$SESSION_ID" ]; then
    case "$SESSION_ID" in
        *[!a-zA-Z0-9_-]*) SESSION_ID="" ;;
    esac
fi

SHORT_ID="${SESSION_ID:0:8}"
[ -z "$SHORT_ID" ] && SHORT_ID="unknown"

DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)
TODAY=$(date +%Y-%m-%d)
DAILY_FILE="$MEMORY_DIR/daily/$TODAY.md"

mkdir -p "$MEMORY_DIR/daily" "$MEMORY_DIR/sessions" 2>/dev/null || exit 0

# Build the daily entry as a single string (preserving trailing newlines via
# bash ANSI-C $'...' quoting; command substitution would strip them) and
# append it in one write so a concurrent compaction can't interleave lines.
EXTRACT_REF="memory/sessions/${SESSION_ID:-$SHORT_ID}.md"
NOW_HM=$(date +%H:%M)
ENTRY=""
[ ! -s "$DAILY_FILE" ] && ENTRY="# ${TODAY}"$'\n\n'
ENTRY+="## ${NOW_HM} — compact (${TRIGGER}) — session ${SHORT_ID}"$'\n\n'
ENTRY+="Session compacted. Extract: \`${EXTRACT_REF}\`."$'\n\n'
ENTRY+=$'---\n\n'
printf '%s' "$ENTRY" >> "$DAILY_FILE" 2>/dev/null || true

# Write a session-extract stub if we haven't already.
if [ -n "$SESSION_ID" ]; then
    SESSION_FILE="$MEMORY_DIR/sessions/$SESSION_ID.md"
    if [ ! -f "$SESSION_FILE" ]; then
        STUB=$'---\n'
        STUB+="session_id: ${SESSION_ID}"$'\n'
        STUB+="trigger: ${TRIGGER}"$'\n'
        STUB+="compacted_at: ${DATE}"$'\n'
        STUB+=$'---\n\n'
        STUB+="# Session ${SHORT_ID}"$'\n\n'
        STUB+=$'Auto-extract on PreCompact. Add a short summary of what this session worked on and any durable decisions.\n'
        printf '%s' "$STUB" > "$SESSION_FILE" 2>/dev/null || true
    fi
fi

# Build the post-compact snapshot in the per-user cache dir (same path
# memory-bootstrap.sh uses for its session markers). World-writable /tmp
# would let any local user inject content into this file and the next
# bootstrap would inject it as trusted context. The user-private dir on
# macOS lives under /var/folders/.../T/ (mode 700, owner-only) and on
# Linux falls through XDG_RUNTIME_DIR → TMPDIR → /tmp; we still own the
# subdirectory by uid so cross-user writes can't reach it.
SNAPSHOT_DIR="${XDG_RUNTIME_DIR:-${TMPDIR:-/tmp}}/pi-mono-memory-$(id -u)"
mkdir -p "$SNAPSHOT_DIR" 2>/dev/null && chmod 700 "$SNAPSHOT_DIR" 2>/dev/null || true
SNAPSHOT_FILE="$SNAPSHOT_DIR/snapshot.md"
build_snapshot() {
    cd "$REPO" 2>/dev/null || return 1
    local branch ahead_behind commits diff_files status_changes context_head
    branch=$(git branch --show-current 2>/dev/null || echo "(detached)")
    # `git rev-list --left-right --count A...B` prints `<left> <right>`
    # where left = commits in A only (HEAD is behind by this) and right =
    # commits in B only (HEAD is ahead by this). Labels below match.
    ahead_behind=$(git rev-list --left-right --count "origin/main...HEAD" 2>/dev/null \
        | awk '{ printf "behind=%d ahead=%d", $1, $2 }')
    commits=$(git log --oneline -n 10 "origin/main..HEAD" 2>/dev/null \
        | head -c 1500)
    diff_files=$(git diff --name-status "origin/main...HEAD" 2>/dev/null \
        | head -n 40 | head -c 2000)
    status_changes=$(git status -s 2>/dev/null | head -n 40 | head -c 1500)
    if [ -f "$MEMORY_DIR/context.md" ]; then
        context_head=$(head -c 1500 "$MEMORY_DIR/context.md")
    else
        context_head=""
    fi

    printf -- '---\n'
    printf 'session_id: %s\n' "$SESSION_ID"
    printf 'trigger: %s\n' "$TRIGGER"
    printf 'compacted_at: %s\n' "$DATE"
    printf 'branch: %s\n' "$branch"
    printf -- '---\n\n'
    printf '# Session snapshot (pre-compact)\n\n'
    printf 'Branch `%s` (%s)\n\n' "$branch" "${ahead_behind:-no-upstream}"
    if [ -n "$commits" ]; then
        printf '## Commits on this branch (vs origin/main)\n\n```\n%s\n```\n\n' "$commits"
    fi
    if [ -n "$diff_files" ]; then
        printf '## Files changed (vs origin/main)\n\n```\n%s\n```\n\n' "$diff_files"
    fi
    if [ -n "$status_changes" ]; then
        printf '## Uncommitted changes\n\n```\n%s\n```\n\n' "$status_changes"
    fi
    if [ -n "$context_head" ]; then
        printf '## memory/context.md (head)\n\n%s\n' "$context_head"
    fi
}
build_snapshot > "$SNAPSHOT_FILE" 2>/dev/null || true

exit 0
