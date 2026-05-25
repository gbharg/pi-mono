#!/usr/bin/env bash
# fetch-messages.sh -- Fetch today's Sendblue messages and save to archive
#
# Usage: bash fetch-messages.sh [YYYY-MM-DD]
# Defaults to today's date if no argument provided.
#
# Required env (load from ~/.config/openclaw/sendblue.env or shell):
#   SENDBLUE_API_KEY_ID
#   SENDBLUE_API_SECRET_KEY

set -euo pipefail

: "${SENDBLUE_API_KEY_ID:?SENDBLUE_API_KEY_ID not set — source your sendblue.env first}"
: "${SENDBLUE_API_SECRET_KEY:?SENDBLUE_API_SECRET_KEY not set — source your sendblue.env first}"

BASE_URL="https://api.sendblue.co/api"
# Canonical pi-mono archive path; override with ARCHIVE_DIR env if needed.
ARCHIVE_DIR="${ARCHIVE_DIR:-$HOME/pi-mono/.pi/messages/archive}"

DATE="${1:-$(date +%Y-%m-%d)}"
OUTPUT_FILE="$ARCHIVE_DIR/$DATE.json"

mkdir -p "$ARCHIVE_DIR"

echo "Fetching messages for $DATE..."

# Fetch messages for the date range (single day)
NEXT_DATE=$(date -j -f "%Y-%m-%d" -v+1d "$DATE" "+%Y-%m-%d" 2>/dev/null || date -d "$DATE + 1 day" "+%Y-%m-%d")

RESPONSE=$(curl -s "${BASE_URL}/messages?from_date=${DATE}&to_date=${NEXT_DATE}&limit=500" \
  -H "sb-api-key-id: ${SENDBLUE_API_KEY_ID}" \
  -H "sb-api-secret-key: ${SENDBLUE_API_SECRET_KEY}")

echo "$RESPONSE" > "$OUTPUT_FILE"

# Count messages
COUNT=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('messages',[])))" 2>/dev/null || echo "unknown")

echo "Saved $COUNT messages to $OUTPUT_FILE"
