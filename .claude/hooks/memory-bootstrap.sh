#!/bin/bash
# memory-bootstrap.sh — UserPromptSubmit hook (fires once per session via
# marker-file dedup). Claude Code has no first-class SessionStart event, so we
# attach to UserPromptSubmit and short-circuit after the first prompt.
#
# On the first prompt of a session, inject:
#   1. memory/context.md (active focus + in-flight branches)
#   2. today's daily/YYYY-MM-DD.md (if it exists)
#   3. /tmp/pi-mono-session-snapshot.md if present and fresh (mtime < 6h),
#      so a session resuming after PreCompact gets immediate git + context
#      continuity. Older snapshots are ignored — they're noise after a
#      genuine session boundary.
#
# Best-effort: never blocks. User-scoped cache prevents cross-user collisions.
#
# Input: JSON on stdin with { session_id, ... }
# Output: <memory-bootstrap> block on stdout, or nothing.

set -uo pipefail

REPO="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
MEMORY_DIR="$REPO/memory"
[ -d "$MEMORY_DIR" ] || exit 0

INPUT=""
[ ! -t 0 ] && INPUT=$(cat 2>/dev/null || true)

SESSION_ID=$(printf '%s' "$INPUT" | python3 -c '
import sys, json
try:
    print(json.load(sys.stdin).get("session_id", ""))
except Exception:
    pass
' 2>/dev/null || true)

# Without a session_id we have no way to dedupe; bail out.
[ -z "$SESSION_ID" ] && exit 0

# Reject session IDs that contain anything outside the UUID/hex/dash alphabet
# so the value can be safely embedded in file paths.
case "$SESSION_ID" in
    *[!a-zA-Z0-9_-]*) exit 0 ;;
esac

# User-scoped cache dir avoids /tmp symlink-squatting and cross-user collisions
# on shared machines. Falls through TMPDIR -> /tmp.
CACHE_DIR="${XDG_RUNTIME_DIR:-${TMPDIR:-/tmp}}/pi-mono-memory-$(id -u)"
mkdir -p "$CACHE_DIR" 2>/dev/null || exit 0
MARKER="$CACHE_DIR/bootstrap-$SESSION_ID"
[ -f "$MARKER" ] && exit 0
touch "$MARKER"

# Trim old markers (keep last 20). `find -delete` handles whitespace and
# missing files safely.
find "$CACHE_DIR" -maxdepth 1 -type f -name 'bootstrap-*' -mtime +7 -delete 2>/dev/null || true

CONTEXT_FILE="$MEMORY_DIR/context.md"
TODAY_FILE="$MEMORY_DIR/daily/$(date +%Y-%m-%d).md"
SNAPSHOT_FILE="${TMPDIR:-/tmp}/pi-mono-session-snapshot.md"

CONTEXT_BLOCK=""
[ -f "$CONTEXT_FILE" ] && CONTEXT_BLOCK=$(head -c 2000 "$CONTEXT_FILE")

DAILY_BLOCK=""
[ -f "$TODAY_FILE" ] && DAILY_BLOCK=$(head -c 2000 "$TODAY_FILE")

SNAPSHOT_BLOCK=""
if [ -f "$SNAPSHOT_FILE" ]; then
    # Only inject snapshots written in the last 6 hours; older ones are
    # leftovers from prior sessions and would mislead the resumed agent.
    SNAPSHOT_AGE=$(( $(date +%s) - $(stat -f %m "$SNAPSHOT_FILE" 2>/dev/null || stat -c %Y "$SNAPSHOT_FILE" 2>/dev/null || echo 0) ))
    if [ "$SNAPSHOT_AGE" -ge 0 ] && [ "$SNAPSHOT_AGE" -lt 21600 ]; then
        SNAPSHOT_BLOCK=$(head -c 4000 "$SNAPSHOT_FILE")
    fi
fi

[ -z "$CONTEXT_BLOCK" ] && [ -z "$DAILY_BLOCK" ] && [ -z "$SNAPSHOT_BLOCK" ] && exit 0

printf '<memory-bootstrap>\n'
if [ -n "$CONTEXT_BLOCK" ]; then
    printf '\n--- memory/context.md ---\n%s\n' "$CONTEXT_BLOCK"
fi
if [ -n "$DAILY_BLOCK" ]; then
    printf '\n--- memory/daily/%s.md ---\n%s\n' "$(date +%Y-%m-%d)" "$DAILY_BLOCK"
fi
if [ -n "$SNAPSHOT_BLOCK" ]; then
    printf '\n--- pre-compact snapshot (%s) ---\n%s\n' "$SNAPSHOT_FILE" "$SNAPSHOT_BLOCK"
fi
printf '</memory-bootstrap>\n'

exit 0
