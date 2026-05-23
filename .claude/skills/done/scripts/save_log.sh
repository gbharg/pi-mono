#!/bin/bash
# save_log.sh — writes a session summary to the shared memory daily log
# Usage: save_log.sh "<markdown_content>"

set -euo pipefail

REPO_DIR="${MEMORY_REPO:-$HOME/openclaw}"
LOG_DIR="$REPO_DIR/memory/daily"
AGENT="${MEMORY_AGENT:-claude-code}"
mkdir -p "$LOG_DIR"

DATE=$(date +%Y-%m-%d)
TIME=$(date +%H:%M)
LOG_FILE="$LOG_DIR/$DATE.md"

# Git context
BRANCH=$(git branch --show-current 2>/dev/null || echo "")
PR=$(gh pr view --json number,title --jq '"#\(.number) \(.title)"' 2>/dev/null || echo "")

# Build header with agent attribution
HEADER="## $TIME -- $AGENT"
[ -n "$BRANCH" ] && HEADER="$HEADER | branch: \`$BRANCH\`"
[ -n "$PR" ]     && HEADER="$HEADER | PR: $PR"

# Append to daily log (create with date heading if new file)
if [ ! -f "$LOG_FILE" ]; then
  echo "# $DATE" > "$LOG_FILE"
  echo "" >> "$LOG_FILE"
fi

{
  echo "$HEADER"
  echo ""
  echo "$1"
  echo ""
  echo "---"
  echo ""
} >> "$LOG_FILE"

echo "Saved to $LOG_FILE"
