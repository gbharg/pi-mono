#!/bin/bash
# Task reminder — runs every 4 hours, checks for overdue tasks
# Sends iMessage alert if there are tasks scheduled for today that aren't done

set -a
source /Users/agent/pi-mono/.pi/.env 2>/dev/null
source /Users/agent/imessage-channel/.env 2>/dev/null
set +a

TODO="/Users/agent/pi-mono/.pi/memory/todo.md"
TODAY=$(date +%Y-%m-%d)
DAY_NAME=$(date +%A)

# Count unchecked tasks for today
UNCHECKED=$(grep -c '^\- \[ \]' "$TODO" 2>/dev/null || echo 0)

if [ "$UNCHECKED" -gt 0 ]; then
  # Extract the unchecked items
  ITEMS=$(grep '^\- \[ \]' "$TODO" | head -5 | sed 's/^- \[ \] /  • /')
  
  MSG="Task reminder ($DAY_NAME $(date '+%I:%M %p')): $UNCHECKED open tasks

$ITEMS"

  if [ "$UNCHECKED" -gt 5 ]; then
    MSG="$MSG
  ...and $((UNCHECKED - 5)) more"
  fi

  curl -s -X POST "https://api.sendblue.co/api/send-message" \
    -H "Content-Type: application/json" \
    -H "sb-api-key-id: $SENDBLUE_API_KEY_ID" \
    -H "sb-api-secret-key: $SENDBLUE_API_SECRET_KEY" \
    -d "{
      \"number\": \"+19723637754\",
      \"content\": $(python3 -c "import json; print(json.dumps('$MSG'))"),
      \"from_number\": \"$SENDBLUE_OWN_NUMBER\"
    }" > /dev/null 2>&1
fi
