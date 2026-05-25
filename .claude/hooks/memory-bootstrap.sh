#!/bin/bash
# memory-bootstrap.sh — SessionStart hook for pi-mono session memory.
#
# On the first prompt of a session, inject:
#   1. memory/context.md (active focus + in-flight branches)
#   2. today's daily/YYYY-MM-DD.md (if it exists)
#
# Best-effort: never blocks. Marker file at /tmp prevents double-firing.
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

CACHE_DIR="/tmp/pi-mono-memory"
mkdir -p "$CACHE_DIR" 2>/dev/null || exit 0
MARKER="$CACHE_DIR/bootstrap-$SESSION_ID"
[ -f "$MARKER" ] && exit 0
touch "$MARKER"

# Trim old markers (keep last 20).
ls -t "$CACHE_DIR"/bootstrap-* 2>/dev/null | tail -n +21 | xargs rm -f 2>/dev/null || true

CONTEXT_FILE="$MEMORY_DIR/context.md"
TODAY_FILE="$MEMORY_DIR/daily/$(date +%Y-%m-%d).md"

CONTEXT_BLOCK=""
[ -f "$CONTEXT_FILE" ] && CONTEXT_BLOCK=$(head -c 2000 "$CONTEXT_FILE")

DAILY_BLOCK=""
[ -f "$TODAY_FILE" ] && DAILY_BLOCK=$(head -c 2000 "$TODAY_FILE")

[ -z "$CONTEXT_BLOCK" ] && [ -z "$DAILY_BLOCK" ] && exit 0

printf '<memory-bootstrap>\n'
if [ -n "$CONTEXT_BLOCK" ]; then
    printf '\n--- memory/context.md ---\n%s\n' "$CONTEXT_BLOCK"
fi
if [ -n "$DAILY_BLOCK" ]; then
    printf '\n--- memory/daily/%s.md ---\n%s\n' "$(date +%Y-%m-%d)" "$DAILY_BLOCK"
fi
printf '</memory-bootstrap>\n'

exit 0
