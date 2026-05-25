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

exit 0
