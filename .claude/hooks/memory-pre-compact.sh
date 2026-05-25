#!/bin/bash
# memory-pre-compact.sh — PreCompact hook for pi-mono session memory.
#
# Fires before Claude Code compacts the conversation. Persists a minimal
# session extract so post-compact sessions can recall what happened.
#
# Writes:
#   memory/sessions/<session_id>.md    (one-shot; created if missing)
#   memory/daily/YYYY-MM-DD.md         (appended marker line)
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

SESSION_ID=$(printf '%s' "$INPUT" | python3 -c '
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get("session_id", ""))
except Exception:
    pass
' 2>/dev/null || true)

TRIGGER=$(printf '%s' "$INPUT" | python3 -c '
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get("trigger", "auto"))
except Exception:
    print("auto")
' 2>/dev/null || echo "auto")

SHORT_ID="${SESSION_ID:0:8}"
[ -z "$SHORT_ID" ] && SHORT_ID="unknown"

DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)
TODAY=$(date +%Y-%m-%d)
DAILY_FILE="$MEMORY_DIR/daily/$TODAY.md"

mkdir -p "$MEMORY_DIR/daily" "$MEMORY_DIR/sessions" 2>/dev/null || exit 0

# Append daily marker.
{
    [ ! -s "$DAILY_FILE" ] && printf '# %s\n\n' "$TODAY"
    printf '## %s — compact (%s) — session %s\n\n' "$(date +%H:%M)" "$TRIGGER" "$SHORT_ID"
    printf 'Session compacted. Extract: `memory/sessions/%s.md`.\n\n' "$SESSION_ID"
    printf -- '---\n\n'
} >> "$DAILY_FILE" 2>/dev/null || true

# Write a session-extract stub if we haven't already.
SESSION_FILE="$MEMORY_DIR/sessions/$SESSION_ID.md"
if [ -n "$SESSION_ID" ] && [ ! -f "$SESSION_FILE" ]; then
    {
        printf -- '---\n'
        printf 'session_id: %s\n' "$SESSION_ID"
        printf 'trigger: %s\n' "$TRIGGER"
        printf 'compacted_at: %s\n' "$DATE"
        printf -- '---\n\n'
        printf '# Session %s\n\n' "$SHORT_ID"
        printf 'Auto-extract on PreCompact. Add a short summary of what this session worked on and any durable decisions.\n'
    } > "$SESSION_FILE" 2>/dev/null || true
fi

exit 0
