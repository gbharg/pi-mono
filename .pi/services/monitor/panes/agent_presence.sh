#!/usr/bin/env bash
# agent_presence.sh — pane: live agent presence board
#
# Shows the output of `presence.sh board` refreshed every 5s. Highlights
# WORKING agents and stales (>5m since last seen).

set -uo pipefail

PRESENCE="$HOME/openclaw/memory/scripts/presence.sh"
INTERVAL="${MONITOR_PRESENCE_INTERVAL:-5}"

render() {
    clear
    printf '\033[1;36m=== agent presence === \033[0;37m (refresh %ss, %s)\033[0m\n' \
        "$INTERVAL" "$(date '+%H:%M:%S')"
    echo

    if [ ! -x "$PRESENCE" ]; then
        printf '\033[1;31mERR:\033[0m presence.sh not found at %s\n' "$PRESENCE"
        echo "install openclaw memory scripts to enable this pane"
        return
    fi

    # Capture board output
    local board
    board=$(bash "$PRESENCE" board 2>&1)
    if [ -z "$board" ]; then
        printf '\033[0;33mno agents registered\033[0m\n'
        return
    fi

    # Colorize WORKING vs IDLE via python (avoids bash regex pain).
    # Pass board text via env var so we can use python3 -c cleanly.
    PRESENCE_BOARD="$board" python3 -c '
import os

text = os.environ.get("PRESENCE_BOARD","")
lines = text.splitlines()
if not lines:
    raise SystemExit(0)

RESET = "\033[0m"
DIM = "\033[2m"
GREEN = "\033[1;32m"
YELLOW = "\033[1;33m"
CYAN = "\033[1;36m"
RED = "\033[1;31m"

# First line is header
print(f"{CYAN}{lines[0]}{RESET}")
for raw in lines[1:]:
    if not raw.strip():
        continue
    low = raw.lower()
    if " working " in f" {low} ":
        print(f"{GREEN}{raw}{RESET}")
    elif "min ago" in low and "idle" in low:
        # Stale idle — dim it
        print(f"{DIM}{raw}{RESET}")
    elif "error" in low or "fail" in low:
        print(f"{RED}{raw}{RESET}")
    else:
        print(raw)

# Summary counts
n_working = sum(1 for l in lines[1:] if "WORKING" in l)
n_idle = sum(1 for l in lines[1:] if "IDLE" in l)
n_total = n_working + n_idle
print()
print(f"{DIM}total: {n_total}  working: {n_working}  idle: {n_idle}{RESET}")
'
}

trap 'echo; echo "agent_presence pane exiting"; exit 0' INT TERM

while :; do
    render
    sleep "$INTERVAL"
done
