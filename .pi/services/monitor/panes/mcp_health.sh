#!/usr/bin/env bash
# mcp_health.sh — pane: MCP server health grid + status.json writer
#
# Preference order for data source:
#   1. /tmp/mcp_monitor_state.json  (if fresher than 60s — produced by the
#      background mcp_monitor.sh)
#   2. Direct call to `claude mcp list`  (fallback)
#
# Also writes MONITOR_STATUS_FILE (status.json) on every refresh so external
# tools can read the latest snapshot without parsing ANSI.

set -uo pipefail

INTERVAL="${MONITOR_MCP_INTERVAL:-10}"
BG_STATE="/tmp/mcp_monitor_state.json"
STATUS_FILE="${MONITOR_STATUS_FILE:-$HOME/pi-mono/.pi/services/monitor/status.json}"

trap 'echo; echo "mcp_health pane exiting"; exit 0' INT TERM

# ------------------------------------------------------------------
# Fetch a normalized list of "name|state" lines.
# ------------------------------------------------------------------
fetch_mcp() {
    local src="unknown"
    local raw=""

    # Try the background monitor state first
    if [ -f "$BG_STATE" ]; then
        local age
        age=$(python3 -c "
import json, os, time
try:
    st = json.load(open('$BG_STATE'))
    polled = st.get('polled_at','')
    # parse ISO8601 Zulu
    import datetime
    t = datetime.datetime.strptime(polled, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=datetime.timezone.utc)
    age = int(time.time() - t.timestamp())
    print(age)
except Exception:
    print(99999)
" 2>/dev/null)
        if [ -n "$age" ] && [ "$age" -lt 60 ] 2>/dev/null; then
            raw=$(python3 -c "
import json
try:
    st = json.load(open('$BG_STATE'))
    for s in st.get('servers', []):
        print(f\"{s.get('name','?')}|{s.get('state','?')}\")
except Exception as e:
    pass
" 2>/dev/null)
            src="bg-monitor(${age}s)"
        fi
    fi

    # Fallback: call claude mcp list directly
    if [ -z "$raw" ]; then
        raw=$(claude mcp list 2>/dev/null | python3 -c "
import sys, re
for line in sys.stdin:
    line = line.rstrip()
    m = re.match(r'^([^:]+):.*- (✓|✗|!) (.+)$', line)
    if m:
        name, sym, state = m.groups()
        print(f'{name.strip()}|{sym} {state.strip()}')
" 2>/dev/null)
        src="direct"
    fi

    printf '%s\n' "$src"
    printf '%s\n' "$raw"
}

write_status_json() {
    local source="$1"
    local servers="$2"
    python3 - "$STATUS_FILE" "$source" <<PY
import json, sys, time, os

path = sys.argv[1]
source = sys.argv[2]
rows = """$servers""".strip().splitlines()
servers = []
counts = {'connected': 0, 'failed': 0, 'needs_auth': 0, 'other': 0}
for r in rows:
    if '|' not in r:
        continue
    name, state = r.split('|', 1)
    name = name.strip()
    state = state.strip()
    servers.append({'name': name, 'state': state})
    if '✓' in state or 'Connected' in state:
        counts['connected'] += 1
    elif '✗' in state or 'Failed' in state:
        counts['failed'] += 1
    elif '!' in state or 'auth' in state.lower():
        counts['needs_auth'] += 1
    else:
        counts['other'] += 1

out = {
    'written_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'source': source,
    'counts': counts,
    'servers': servers,
}
os.makedirs(os.path.dirname(path), exist_ok=True)
tmp = path + '.tmp'
with open(tmp, 'w') as f:
    json.dump(out, f, indent=2)
os.replace(tmp, path)
PY
}

render() {
    clear
    printf '\033[1;34m=== mcp health === \033[0;37m(refresh %ss, %s)\033[0m\n' \
        "$INTERVAL" "$(date '+%H:%M:%S')"

    local combined
    combined=$(fetch_mcp)
    local src
    src=$(printf '%s\n' "$combined" | head -1)
    local rows
    rows=$(printf '%s\n' "$combined" | tail -n +2)

    printf '\033[0;37msource:\033[0m %s\n\n' "$src"

    if [ -z "$rows" ]; then
        printf '\033[1;31mERR:\033[0m no MCP data available\n'
        printf '\033[0;37mtry: claude mcp list\033[0m\n'
        write_status_json "$src (empty)" ""
        return
    fi

    # Colorize and summarize — pass rows via stdin (heredoc for script body would
    # clash; use -c with an env var to carry the data).
    MCP_ROWS="$rows" python3 -c '
import os
GREEN = "\033[1;32m"
RED = "\033[1;31m"
YELLOW = "\033[1;33m"
DIM = "\033[2m"
RESET = "\033[0m"
raw = os.environ.get("MCP_ROWS","")
rows = [l for l in raw.splitlines() if "|" in l]
ok = fail = warn = 0
for r in rows:
    name, state = r.split("|", 1)
    name = name.strip()
    state = state.strip()
    if "\u2713" in state or "Connected" in state:
        ok += 1
        color = GREEN
        sym = "OK  "
    elif "\u2717" in state or "Failed" in state:
        fail += 1
        color = RED
        sym = "FAIL"
    elif "!" in state or "auth" in state.lower():
        warn += 1
        color = YELLOW
        sym = "AUTH"
    else:
        color = DIM
        sym = "????"
    print(f"{color}{sym}{RESET}  {name[:40]:<40} {DIM}{state}{RESET}")
print()
print(f"{DIM}totals: {GREEN}{ok} ok{DIM}  {RED}{fail} fail{DIM}  {YELLOW}{warn} auth{RESET}")
'

    write_status_json "$src" "$rows"
}

while :; do
    render
    sleep "$INTERVAL"
done
