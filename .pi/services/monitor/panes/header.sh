#!/usr/bin/env bash
# header.sh — pane: banner + mcp_monitor.log tail
#
# Top half: banner with session info, counts, time since last MCP change.
# Bottom half: live tail of /tmp/mcp_monitor.log so operators see alerts
# as they fire.

set -uo pipefail

INTERVAL="${MONITOR_HEADER_INTERVAL:-2}"
LOG_FILE="/tmp/mcp_monitor.log"
STATUS_FILE="${MONITOR_STATUS_FILE:-$HOME/pi-mono/.pi/services/monitor/status.json}"

trap 'echo; echo "header pane exiting"; exit 0' INT TERM

banner() {
    printf '\033[1;37;44m monitorTool \033[0m \033[0;37m%s\033[0m\n' \
        "$(date '+%Y-%m-%d %H:%M:%S %Z')"
    printf '\033[0;37mhost: %s  user: %s\033[0m\n' "$(hostname -s)" "$USER"
    echo

    if [ -f "$STATUS_FILE" ]; then
        python3 - <<PY
import json, time, sys
try:
    st = json.load(open("$STATUS_FILE"))
    c = st.get('counts', {})
    src = st.get('source', '?')
    written = st.get('written_at', '?')
    GREEN = "\033[1;32m"
    RED = "\033[1;31m"
    YELLOW = "\033[1;33m"
    DIM = "\033[2m"
    RESET = "\033[0m"
    print(f"{DIM}mcp snapshot:{RESET} src={src} at={written}")
    print(f"  {GREEN}ok {c.get('connected',0)}{RESET}  "
          f"{RED}fail {c.get('failed',0)}{RESET}  "
          f"{YELLOW}auth {c.get('needs_auth',0)}{RESET}  "
          f"{DIM}other {c.get('other',0)}{RESET}")
except Exception as e:
    print(f"\033[0;33mstatus.json unavailable: {e}\033[0m")
PY
    else
        printf '\033[0;33mstatus.json not yet written\033[0m\n'
    fi

    # mcp_monitor background PID check
    local pids
    pids=$(pgrep -f mcp_monitor.sh 2>/dev/null | tr '\n' ' ')
    if [ -n "$pids" ]; then
        printf '\033[0;37mbg mcp_monitor:\033[0m \033[1;32mrunning\033[0m (pid %s)\n' "$pids"
    else
        printf '\033[0;37mbg mcp_monitor:\033[0m \033[0;33mnot running\033[0m (dashboard falls back to direct polling)\n'
    fi

    echo
    printf '\033[2m--- /tmp/mcp_monitor.log (tail) ---\033[0m\n'
}

render() {
    clear
    banner

    if [ -f "$LOG_FILE" ]; then
        tail -n 20 "$LOG_FILE" 2>/dev/null || true
    else
        printf '\033[0;33m(no log file at %s)\033[0m\n' "$LOG_FILE"
    fi
}

while :; do
    render
    sleep "$INTERVAL"
done
