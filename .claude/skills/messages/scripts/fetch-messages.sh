Bhargava022455
#!/usr/bin/env bash
# fetch-messages.sh -- Fetch today's Sendblue messages and save to archive
#
# Usage: bash fetch-messages.sh [YYYY-MM-DD]
# Defaults to today's date if no argument provided.

set -euo pipefail

API_KEY="761b6555972c38b26212d28b44e76ace"
API_SECRET="bde5ed1e0432426d5e9849a4385fb6e3"
BASE_URL="https://api.sendblue.co/api"
ARCHIVE_DIR="$HOME/claude-workspace/data/message_archive"

DATE="${1:-$(date +%Y-%m-%d)}"
OUTPUT_FILE="$ARCHIVE_DIR/$DATE.json"

mkdir -p "$ARCHIVE_DIR"

echo "Fetching messages for $DATE..."

# Fetch messages for the date range (single day)
NEXT_DATE=$(date -j -f "%Y-%m-%d" -v+1d "$DATE" "+%Y-%m-%d" 2>/dev/null || date -d "$DATE + 1 day" "+%Y-%m-%d")

RESPONSE=$(curl -s "${BASE_URL}/messages?from_date=${DATE}&to_date=${NEXT_DATE}&limit=500" \
  -H "sb-api-key-id: ${API_KEY}" \
  -H "sb-api-secret-key: ${API_SECRET}")

echo "$RESPONSE" > "$OUTPUT_FILE"

# Count messages
COUNT=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('messages',[])))" 2>/dev/null || echo "unknown")

echo "Saved $COUNT messages to $OUTPUT_FILE"
