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
# Use bash parameter expansion (not a pipeline) so large prompts don't trigger
# SIGPIPE on `head -1` and bypass the filter under `set -o pipefail`.
FIRST_LINE="${PROMPT%%$'\n'*}"
shopt -s nocasematch
case "$FIRST_LINE" in
    "This session is being continued"*|"<system"*|"<command"*|"<task-notification"*|"Stop hook"*)
        shopt -u nocasematch
        exit 0
        ;;
esac
shopt -u nocasematch

# Only run if at least one of our target collections exists. `\s|$` tolerates
# tab/space column separators or end-of-line in `qmd collection list` output.
# We query pi-mono-memory (this repo's local memory) AND agent-memory-shared
# (cross-repo blocks at ~/.agent-memory/shared/) when available — see
# https://github.com/gbharg/agent-memory-shared (design at
# ~/.agent-memory/shared/README.md).
COLLECTIONS_LIST=$(qmd collection list 2>/dev/null || true)
HAS_LOCAL=0; HAS_SHARED=0
printf '%s\n' "$COLLECTIONS_LIST" | grep -qE '^pi-mono-memory(\s|$)' && HAS_LOCAL=1
printf '%s\n' "$COLLECTIONS_LIST" | grep -qE '^agent-memory-shared(\s|$)' && HAS_SHARED=1
[ "$HAS_LOCAL" -eq 0 ] && [ "$HAS_SHARED" -eq 0 ] && exit 0

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

# BM25 search per enabled collection with per-collection caps. Querying each
# collection separately (instead of one global -n cap) guarantees deterministic
# budget: 3 local + 1 shared. Without this, high-scoring shared blocks (short,
# keyword-dense identity/context blocks) can displace local hits entirely.
# --files output: "#hash,score,qmd://<collection>/relative/path.md"
LOCAL_RESULTS=""
SHARED_RESULTS=""
if [ "$HAS_LOCAL" -eq 1 ]; then
    LOCAL_RESULTS=$(qmd search "$QUERY" -c pi-mono-memory -n 3 --files 2>/dev/null || true)
fi
if [ "$HAS_SHARED" -eq 1 ]; then
    SHARED_RESULTS=$(qmd search "$QUERY" -c agent-memory-shared -n 1 --files 2>/dev/null || true)
fi
RESULTS=$(printf '%s\n%s' "$LOCAL_RESULTS" "$SHARED_RESULTS" | grep -v '^$' | awk '!seen[$0]++')
[ -z "$RESULTS" ] && exit 0

# Pull the qmd:// URI off each line. Keep the full URI so the consumer can tell
# which collection (pi-mono-memory vs agent-memory-shared) the hit came from.
# Line-match is scoped to the two known collections as defense-in-depth in case
# `qmd search` ever leaks unrelated URIs.
LINES=$(printf '%s\n' "$RESULTS" \
    | awk -F, '/qmd:\/\/(pi-mono-memory|agent-memory-shared)\// { for (i=1;i<=NF;i++) if ($i ~ /^qmd:\/\//) print $i }' \
    | head -4)
[ -z "$LINES" ] && exit 0

printf '<memory-recall>\n'
printf 'Relevant memory (pi-mono-memory = this repo; agent-memory-shared = cross-repo blocks):\n'
printf '%s\n' "$LINES"
printf '</memory-recall>\n'

exit 0
