#!/bin/bash
# done.sh — pi-mono /done skill driver.
#
# Appends a daily-log entry, writes a session summary, refreshes
# memory/context.md from git state, and re-indexes qmd. Pure bash; no
# pnpm/bun deps. Best-effort throughout.
#
# Usage:
#   .claude/skills/done/done.sh ["<summary body>"]
#   echo "<summary body>" | .claude/skills/done/done.sh
#   .claude/skills/done/done.sh --commit ["<summary body>"]

set -uo pipefail

COMMIT=0
SUMMARY_ARG=""
for arg in "$@"; do
    case "$arg" in
        --commit) COMMIT=1 ;;
        -h|--help)
            sed -n '2,12p' "$0"
            exit 0
            ;;
        *)
            if [ -z "$SUMMARY_ARG" ]; then
                SUMMARY_ARG="$arg"
            else
                SUMMARY_ARG="$SUMMARY_ARG"$'\n'"$arg"
            fi
            ;;
    esac
done

# ---------- locate repo + memory ----------
REPO="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
MEMORY_DIR="$REPO/memory"
if [ ! -d "$MEMORY_DIR" ]; then
    echo "done: no memory/ dir at $REPO — nothing to do." >&2
    exit 0
fi

cd "$REPO" 2>/dev/null || { echo "done: cannot cd $REPO" >&2; exit 1; }

# ---------- read summary from arg or stdin ----------
SUMMARY_BODY="$SUMMARY_ARG"
if [ -z "$SUMMARY_BODY" ] && [ ! -t 0 ]; then
    SUMMARY_BODY=$(cat 2>/dev/null || true)
fi

# ---------- gather git state ----------
BRANCH=$(git branch --show-current 2>/dev/null || echo "")
[ -z "$BRANCH" ] && BRANCH="(detached)"
SHORT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "nosha")

# Slug: part after first /; sanitize to [a-z0-9-] only; cap at 40 chars.
SLUG=${BRANCH#*/}
SLUG=$(printf '%s' "$SLUG" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9-' '-' | tr -s '-' | sed 's/^-//;s/-$//')
SLUG="${SLUG:0:40}"
[ -z "$SLUG" ] && SLUG="untitled"

DATE=$(date +%Y-%m-%d)
TIME=$(date +%H:%M)
TS=$(date +%Y%m%d-%H%M%S)
ISO_NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# ---------- fallback body from git state + snapshot ----------
if [ -z "$SUMMARY_BODY" ]; then
    RECENT_COMMITS=$(git log --oneline -n 5 "origin/main..HEAD" 2>/dev/null | head -c 800)
    [ -z "$RECENT_COMMITS" ] && RECENT_COMMITS="(no commits ahead of origin/main)"
    DIFF_FILES=$(git diff --name-only "origin/main...HEAD" 2>/dev/null | head -n 20 | head -c 800)
    SNAPSHOT_FILE="${TMPDIR:-/tmp}/pi-mono-session-snapshot.md"
    SNAPSHOT_NOTE=""
    if [ -f "$SNAPSHOT_FILE" ]; then
        AGE=$(( $(date +%s) - $(stat -f %m "$SNAPSHOT_FILE" 2>/dev/null || stat -c %Y "$SNAPSHOT_FILE" 2>/dev/null || echo 0) ))
        if [ "$AGE" -ge 0 ] && [ "$AGE" -lt 21600 ]; then
            SNAPSHOT_NOTE=$'\nPre-compact snapshot is fresh ('"$SNAPSHOT_FILE"$'); resume agents can replay branch+context from it.'
        fi
    fi
    SUMMARY_BODY="No body provided — auto-generated from git state.

Recent commits:
\`\`\`
${RECENT_COMMITS}
\`\`\`

Files changed vs origin/main:
\`\`\`
${DIFF_FILES:-(none)}
\`\`\`
${SNAPSHOT_NOTE}"
fi

# ---------- write daily entry ----------
DAILY_DIR="$MEMORY_DIR/daily"
DAILY_FILE="$DAILY_DIR/$DATE.md"
mkdir -p "$DAILY_DIR" 2>/dev/null

# Build single buffer; ANSI-C quoting preserves trailing newlines.
DAILY_ENTRY=""
[ ! -s "$DAILY_FILE" ] && DAILY_ENTRY="# ${DATE}"$'\n\n'
DAILY_ENTRY+="## ${TIME} — ${BRANCH} (${SHORT_SHA})"$'\n\n'
DAILY_ENTRY+="${SUMMARY_BODY}"$'\n\n'
DAILY_ENTRY+="Session file: \`memory/sessions/auto/${TS}-${SLUG}.md\`"$'\n\n'
DAILY_ENTRY+=$'---\n\n'
printf '%s' "$DAILY_ENTRY" >> "$DAILY_FILE"

# ---------- write session summary ----------
AUTO_DIR="$MEMORY_DIR/sessions/auto"
SESSION_FILE="$AUTO_DIR/${TS}-${SLUG}.md"
mkdir -p "$AUTO_DIR" 2>/dev/null

SESSION_DOC=$'---\n'
SESSION_DOC+="branch: ${BRANCH}"$'\n'
SESSION_DOC+="sha: ${SHORT_SHA}"$'\n'
SESSION_DOC+="date: ${ISO_NOW}"$'\n'
SESSION_DOC+="slug: ${SLUG}"$'\n'
SESSION_DOC+=$'---\n\n'
SESSION_DOC+="# Session ${TS} — ${SLUG}"$'\n\n'
SESSION_DOC+="${SUMMARY_BODY}"$'\n'
printf '%s' "$SESSION_DOC" > "$SESSION_FILE"

# ---------- update memory/context.md ----------
CONTEXT_FILE="$MEMORY_DIR/context.md"
if [ -f "$CONTEXT_FILE" ]; then
    # Rewrite ## Active focus + ## In-flight branches sections in-place via
    # awk. Other sections are untouched. The two replacement sections are
    # written through awk env vars so embedded special chars are inert.
    NEW_FOCUS_BODY="- Latest session: \`memory/sessions/auto/${TS}-${SLUG}.md\` on branch \`${BRANCH}\`."
    NEW_BRANCHES_BODY="- \`${BRANCH}\` — last touched ${ISO_NOW} (sha ${SHORT_SHA})."
    awk \
        -v focus="$NEW_FOCUS_BODY" \
        -v branches="$NEW_BRANCHES_BODY" '
        BEGIN { mode = "passthrough" }
        /^## Active focus *$/ {
            print
            print ""
            print focus
            print ""
            mode = "skip"
            next
        }
        /^## In-flight branches *$/ {
            print
            print ""
            print branches
            print ""
            mode = "skip"
            next
        }
        /^## / {
            mode = "passthrough"
            print
            next
        }
        {
            if (mode != "skip") print
        }
    ' "$CONTEXT_FILE" > "$CONTEXT_FILE.tmp" && mv "$CONTEXT_FILE.tmp" "$CONTEXT_FILE"
fi

# ---------- qmd re-index ----------
QMD_OUTCOME="qmd: skipped (not on PATH or collection not registered)"
if command -v qmd >/dev/null 2>&1; then
    if qmd collection list 2>/dev/null | grep -qE '^pi-mono-memory(\s|$)'; then
        qmd update pi-mono-memory >/dev/null 2>&1 \
            && QMD_OUTCOME="qmd: re-indexed pi-mono-memory" \
            || QMD_OUTCOME="qmd: re-index failed (non-fatal)"
    fi
fi

# ---------- optional commit ----------
COMMIT_OUTCOME="commit: not requested"
if [ "$COMMIT" -eq 1 ]; then
    PATHS=("memory/daily/$DATE.md" "memory/sessions/auto/${TS}-${SLUG}.md" "memory/context.md")
    EXISTING=()
    for p in "${PATHS[@]}"; do
        [ -e "$p" ] && EXISTING+=("$p")
    done
    if [ ${#EXISTING[@]} -eq 0 ]; then
        COMMIT_OUTCOME="commit: nothing to stage"
    elif git add -- "${EXISTING[@]}" 2>/dev/null \
         && git commit -m "memory: session log ${DATE}" >/dev/null 2>&1; then
        COMMIT_OUTCOME="commit: ${EXISTING[*]} committed as 'memory: session log ${DATE}'"
    else
        COMMIT_OUTCOME="commit: skipped (no changes staged or commit failed)"
    fi
fi

# ---------- report ----------
echo "done: wrote ${DAILY_FILE#$REPO/}"
echo "done: wrote ${SESSION_FILE#$REPO/}"
[ -f "$CONTEXT_FILE" ] && echo "done: refreshed ${CONTEXT_FILE#$REPO/}"
echo "done: $QMD_OUTCOME"
echo "done: $COMMIT_OUTCOME"

exit 0
