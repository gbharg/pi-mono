#!/bin/bash
# memory-recall.sh — UserPromptSubmit hook for pi-mono session memory.
#
# Injects the top matches from the `pi-mono-memory` qmd collection so the
# session sees relevant prior decisions, learnings, daily entries, and session
# extracts.
#
# Best-effort: silent no-op if qmd is missing, the collection is empty, or
# anything errors. Never blocks the prompt.
#
# Input: JSON on stdin: { "prompt": "...", "session_id": "..." }
# Output: a `<memory-recall>` block on stdout, or nothing.

set -uo pipefail

command -v qmd >/dev/null 2>&1 || exit 0

INPUT=""
[ ! -t 0 ] && INPUT=$(cat 2>/dev/null || true)
[ -z "$INPUT" ] && exit 0

PROMPT=$(printf '%s' "$INPUT" | python3 -c '
import sys, json
try:
    print(json.load(sys.stdin).get("prompt", ""))
except Exception:
    pass
' 2>/dev/null || true)

# Skip short messages, slash-commands, and known system continuations.
[ -z "$PROMPT" ] && exit 0
[ ${#PROMPT} -lt 20 ] && exit 0
case "$PROMPT" in
    /*) exit 0 ;;
esac
if printf '%s\n' "$PROMPT" | head -1 | grep -qiE '^(This session is being continued|<system|<command|<task-notification|Stop hook)'; then
    exit 0
fi

# Only run if the pi-mono-memory collection exists.
qmd collection list 2>/dev/null | grep -q '^pi-mono-memory ' || exit 0

# BM25 (`qmd search`) is intersection-style: every term must appear in the
# matched document. Reduce the prompt to its 4 most distinctive content words
# so natural-language prompts still match. Keeps the hook fast (no LLM
# expansion). Stopword list is conservative; longer queries are more likely
# to over-constrain than under-constrain.
QUERY=$(printf '%s' "$PROMPT" \
    | tr '[:upper:]' '[:lower:]' \
    | tr -c 'a-z0-9 \n' ' ' \
    | tr -s ' \n' '\n' \
    | grep -Ev '^(a|about|after|again|all|also|am|an|and|any|are|as|at|be|because|been|before|being|but|by|can|could|did|do|does|doing|done|each|either|few|for|from|further|get|got|had|has|have|having|he|her|here|hers|him|his|how|i|if|in|into|is|it|its|itself|just|like|made|make|may|me|might|more|most|much|must|my|never|new|nor|not|now|of|off|on|once|one|only|or|other|our|ours|out|over|own|same|see|seen|she|should|so|some|such|take|than|that|the|their|them|themselves|then|there|these|they|this|those|through|to|too|under|until|up|upon|us|use|used|using|very|via|was|we|were|what|when|where|which|while|who|whom|why|will|with|would|yes|yet|you|your|yours)$' \
    | awk 'length >= 3' \
    | head -4 \
    | tr '\n' ' ')

# If we stripped everything, fall back to the raw prompt.
[ -z "${QUERY// /}" ] && QUERY="$PROMPT"

# BM25 search — fast, no LLM expansion. Cap at 3 file matches.
# --files output format: "#hash,score,qmd://pi-mono-memory/relative/path.md"
RESULTS=$(qmd search "$QUERY" -c pi-mono-memory -n 3 --files 2>/dev/null || true)
[ -z "$RESULTS" ] && exit 0

# Pull the qmd:// URI off each line, then convert to a relative repo path.
LINES=$(printf '%s\n' "$RESULTS" \
    | awk -F, '/qmd:\/\/pi-mono-memory\// { for (i=1;i<=NF;i++) if ($i ~ /^qmd:\/\//) print $i }' \
    | sed 's|^qmd://pi-mono-memory/|memory/|' \
    | head -3)
[ -z "$LINES" ] && exit 0

printf '<memory-recall>\n'
printf 'Relevant pi-mono memory (read for full content):\n'
printf '%s\n' "$LINES"
printf '</memory-recall>\n'

exit 0
