#!/usr/bin/env bash
# pi_session.sh — pane: live tail of the freshest Pi Claude Code transcript
#
# Finds the most recently modified JSONL session file for the
# -Users-agent-pi-mono project and renders its human-readable content.
# Re-detects the newest file every REFRESH_INTERVAL seconds so a new session
# picks up automatically.

set -uo pipefail

PROJECT_DIR="$HOME/.claude/projects/-Users-agent-pi-mono"
INTERVAL="${MONITOR_PI_INTERVAL:-3}"
MAX_LINES="${MONITOR_PI_MAX_LINES:-40}"

trap 'echo; echo "pi_session pane exiting"; exit 0' INT TERM

find_latest() {
    if [ ! -d "$PROJECT_DIR" ]; then
        echo ""
        return
    fi
    # Largest mtime .jsonl in the project dir
    ls -t "$PROJECT_DIR"/*.jsonl 2>/dev/null | head -1
}

render() {
    clear
    local latest
    latest=$(find_latest)
    printf '\033[1;35m=== pi session === \033[0;37m(refresh %ss, %s)\033[0m\n' \
        "$INTERVAL" "$(date '+%H:%M:%S')"

    if [ -z "$latest" ]; then
        printf '\033[1;31mERR:\033[0m no transcripts found in %s\n' "$PROJECT_DIR"
        return
    fi

    local base
    base=$(basename "$latest" .jsonl)
    local age
    if stat -f '%m' "$latest" >/dev/null 2>&1; then
        mtime=$(stat -f '%m' "$latest")
        now=$(date +%s)
        age=$((now - mtime))
    else
        age="?"
    fi
    printf '\033[0;37msession:\033[0m %s\n' "$base"
    printf '\033[0;37mmodified:\033[0m %ss ago\n' "$age"
    echo

    # Parse the jsonl tail and extract readable content via python.
    # Shows last N user/assistant text blocks.
    python3 - "$latest" "$MAX_LINES" <<'PY'
import json, sys, re

path = sys.argv[1]
maxl = int(sys.argv[2])

def strip(s):
    s = re.sub(r'\s+', ' ', s or '').strip()
    return s[:200]

rows = []
try:
    with open(path, 'rb') as f:
        # Read last ~300KB to keep it fast for multi-MB transcripts
        f.seek(0, 2)
        size = f.tell()
        start = max(0, size - 300_000)
        f.seek(start)
        buf = f.read().decode('utf-8', errors='replace')
except Exception as e:
    print(f"\033[1;31mERR:\033[0m failed to read transcript: {e}")
    sys.exit(0)

for line in buf.splitlines()[-400:]:
    line = line.strip()
    if not line.startswith('{'):
        continue
    try:
        obj = json.loads(line)
    except Exception:
        continue
    typ = obj.get('type', '')
    msg = obj.get('message') or {}
    role = msg.get('role') or typ
    content = msg.get('content')
    text = ''
    if isinstance(content, str):
        text = content
    elif isinstance(content, list):
        chunks = []
        for c in content:
            if not isinstance(c, dict):
                continue
            ct = c.get('type')
            if ct == 'text':
                chunks.append(c.get('text', ''))
            elif ct == 'tool_use':
                name = c.get('name', 'tool')
                chunks.append(f"[tool: {name}]")
            elif ct == 'tool_result':
                tr = c.get('content')
                if isinstance(tr, list):
                    for t in tr:
                        if isinstance(t, dict) and t.get('type') == 'text':
                            chunks.append("[tool_result] " + (t.get('text') or '')[:120])
                elif isinstance(tr, str):
                    chunks.append("[tool_result] " + tr[:120])
        text = ' '.join(chunks)
    text = strip(text)
    if not text:
        continue
    rows.append((role, text))

# Only show last maxl rows
rows = rows[-maxl:]

color = {
    'user':      "\033[1;33m",  # yellow
    'assistant': "\033[1;32m",  # green
    'system':    "\033[0;35m",  # magenta
    'tool':      "\033[0;36m",  # cyan
}
reset = "\033[0m"

for role, text in rows:
    c = color.get(role, "\033[0;37m")
    label = role[:4].ljust(4)
    print(f"{c}{label}{reset} {text}")

if not rows:
    print("\033[0;33m(no renderable messages in tail)\033[0m")
PY
}

while :; do
    render
    sleep "$INTERVAL"
done
