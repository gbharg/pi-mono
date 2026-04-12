#!/usr/bin/env bash
# imessage_tail.sh — pane: recent iMessages with +19723637754 (read-only)
#
# Queries ~/Library/Messages/chat.db via sqlite3. Truncates message text to
# MAX_CHARS per line to reduce shoulder-surfing. Only reads — never writes.

set -uo pipefail

INTERVAL="${MONITOR_IMSG_INTERVAL:-5}"
LIMIT="${MONITOR_IMSG_LIMIT:-15}"
MAX_CHARS="${MONITOR_IMSG_MAX_CHARS:-60}"
CHAT_ID="${MONITOR_IMSG_CHAT:-%9723637754%}"
DB="$HOME/Library/Messages/chat.db"

trap 'echo; echo "imessage_tail pane exiting"; exit 0' INT TERM

render() {
    clear
    printf '\033[1;35m=== imsg (+19723637754) === \033[0;37m(refresh %ss, %s)\033[0m\n' \
        "$INTERVAL" "$(date '+%H:%M:%S')"
    echo

    if [ ! -r "$DB" ]; then
        printf '\033[1;31mERR:\033[0m cannot read %s\n' "$DB"
        printf '\033[0;37mgrant Full Disk Access to your terminal\033[0m\n'
        return
    fi

    # Query the last N messages matching the chat id pattern.
    local out
    out=$(sqlite3 -separator $'\t' "$DB" "
        SELECT datetime(m.date/1000000000 + strftime('%s','2001-01-01'),'unixepoch','localtime') AS dt,
               m.is_from_me,
               substr(coalesce(m.text,''), 1, $MAX_CHARS)
        FROM message m
        LEFT JOIN handle h ON m.handle_id = h.ROWID
        WHERE (h.id LIKE '$CHAT_ID' OR (m.is_from_me=1 AND m.handle_id IN (
            SELECT ROWID FROM handle WHERE id LIKE '$CHAT_ID'
        )))
        ORDER BY m.date DESC
        LIMIT $LIMIT;
    " 2>&1)

    if [ -z "$out" ]; then
        printf '\033[0;33mno recent messages\033[0m\n'
        return
    fi

    # Colorize: gold for Gautam, cyan for me. Carry data via env var.
    IMSG_ROWS="$out" python3 -c '
import os
GOLD = "\033[1;33m"
CYAN = "\033[1;36m"
DIM = "\033[2m"
RESET = "\033[0m"
text = os.environ.get("IMSG_ROWS","")
for raw in text.splitlines():
    parts = raw.split("\t")
    if len(parts) < 3:
        # ERR line
        print(f"{DIM}{raw}{RESET}")
        continue
    dt, ifm, msg = parts[0], parts[1], "\t".join(parts[2:])
    who = "me  " if ifm == "1" else "GB  "
    color = CYAN if ifm == "1" else GOLD
    short = dt.split(" ")[-1] if " " in dt else dt
    msg = msg.replace("\n", " ").replace("\r", " ")
    print(f"{DIM}{short}{RESET} {color}{who}{RESET} {msg}")
'
}

while :; do
    render
    sleep "$INTERVAL"
done
