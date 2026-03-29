#!/bin/bash
# Nightly EOD checklist cron
# Checks key items and sends iMessage alert if anything is unchecked

set -a
source /Users/agent/pi-mono/.pi/.env 2>/dev/null
source /Users/agent/imessage-channel/.env 2>/dev/null
set +a

ISSUES=()
TODO="/Users/agent/pi-mono/.pi/memory/todo.md"
CHANGELOG="/Users/agent/pi-mono/.pi/memory/changelog.md"
PROJECTS_DIR="/Users/agent/pi-mono/.pi/projects"

# Check for unchecked todo items that were scheduled for today
TODAY=$(date +%Y-%m-%d)
DAY_OF_WEEK=$(date +%A)

UNCHECKED=$(grep -c '^\- \[ \]' "$TODO" 2>/dev/null || echo 0)
if [ "$UNCHECKED" -gt 0 ]; then
  ISSUES+=("$UNCHECKED unchecked tasks in todo.md")
fi

# Check /Users/agent/pi-mono/.pi/scripts/git-lock.sh status — uncommitted changes
cd /Users/agent/pi-mono
DIRTY=$(/Users/agent/pi-mono/.pi/scripts/git-lock.sh status --porcelain .pi/ 2>/dev/null | wc -l | tr -d ' ')
if [ "$DIRTY" -gt 0 ]; then
  ISSUES+=("$DIRTY uncommitted changes in .pi/")
fi

# Check if changelog was updated today
if ! grep -q "$TODAY" "$CHANGELOG" 2>/dev/null; then
  # Only flag if there were commits today
  COMMITS_TODAY=$(/Users/agent/pi-mono/.pi/scripts/git-lock.sh log --since="$TODAY" --oneline .pi/ 2>/dev/null | wc -l | tr -d ' ')
  if [ "$COMMITS_TODAY" -gt 0 ]; then
    ISSUES+=("changelog.md not updated today despite $COMMITS_TODAY commits")
  fi
fi

# Check Linear sync — are there local tasks without Linear IDs?
if grep -q '^\- \[ \]' "$TODO" 2>/dev/null; then
  NO_LINEAR=$(grep '^\- \[ \]' "$TODO" | grep -cv 'PI-' || echo 0)
  if [ "$NO_LINEAR" -gt 0 ]; then
    ISSUES+=("$NO_LINEAR tasks without Linear issue IDs")
  fi
fi

# Send alert if there are issues
if [ ${#ISSUES[@]} -gt 0 ]; then
  MSG="EOD Check ($(date '+%I:%M %p')):"
  for issue in "${ISSUES[@]}"; do
    MSG="$MSG
- $issue"
  done
  
  # Send via SendBlue
  curl -s -X POST "https://api.sendblue.co/api/send-message" \
    -H "Content-Type: application/json" \
    -H "sb-api-key-id: $SENDBLUE_API_KEY_ID" \
    -H "sb-api-secret-key: $SENDBLUE_API_SECRET_KEY" \
    -d "{
      \"number\": \"+19723637754\",
      \"content\": \"$MSG\",
      \"from_number\": \"$SENDBLUE_OWN_NUMBER\"
    }" > /dev/null 2>&1
fi
