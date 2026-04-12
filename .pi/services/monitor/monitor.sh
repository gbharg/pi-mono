#!/usr/bin/env bash
# monitor.sh — launch the Pi/Claude/MCP observability dashboard in tmux
#
# Creates (or re-attaches) a tmux session named "monitor" with 5 panes:
#   agents  — agent presence board
#   pi      — tail of the freshest Pi Claude Code transcript
#   mcp     — MCP server health + status.json writer
#   imsg    — recent iMessages with +19723637754
#   log     — header banner + mcp_monitor.log tail
#
# Usage:
#   bash monitor.sh           # launch (or attach if exists)
#   bash monitor.sh stop      # kill the session
#   bash monitor.sh status    # show session info
#   bash monitor.sh restart   # kill + relaunch
#
# Does not commit to git. Does not write anything except status.json
# (from the mcp pane) and the PID file at /tmp/monitorTool.pid.

set -uo pipefail

SESSION="monitor"
SELF_DIR="$(cd "$(dirname "$0")" && pwd)"
PANES_DIR="$SELF_DIR/panes"
PID_FILE="/tmp/monitorTool.pid"
STATUS_FILE="$SELF_DIR/status.json"

export MONITOR_SELF_DIR="$SELF_DIR"
export MONITOR_STATUS_FILE="$STATUS_FILE"
export MONITOR_PANES_DIR="$PANES_DIR"

# ------------------------------------------------------------------
# preflight
# ------------------------------------------------------------------
command -v tmux    >/dev/null 2>&1 || { echo "tmux not found"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "python3 not found"; exit 1; }

if [ ! -d "$PANES_DIR" ]; then
    echo "panes dir missing: $PANES_DIR"
    exit 1
fi

# Make pane scripts executable (idempotent)
chmod +x "$PANES_DIR"/*.sh 2>/dev/null || true

cmd="${1:-start}"

session_exists() {
    tmux has-session -t "$SESSION" 2>/dev/null
}

case "$cmd" in
    stop)
        if session_exists; then
            tmux kill-session -t "$SESSION"
            echo "stopped: $SESSION"
        else
            echo "not running"
        fi
        rm -f "$PID_FILE"
        exit 0
        ;;
    status)
        if session_exists; then
            echo "running: $SESSION"
            tmux list-windows -t "$SESSION" 2>/dev/null
            tmux list-panes -t "$SESSION" -F '#{pane_index} #{pane_title} #{pane_current_command}' 2>/dev/null
            if [ -f "$STATUS_FILE" ]; then
                echo "--- status.json ---"
                cat "$STATUS_FILE"
            fi
        else
            echo "not running"
        fi
        exit 0
        ;;
    restart)
        if session_exists; then
            tmux kill-session -t "$SESSION"
        fi
        # fall through to start
        ;;
    start|"")
        ;;
    *)
        echo "usage: $0 [start|stop|status|restart]"
        exit 2
        ;;
esac

# ------------------------------------------------------------------
# attach-if-exists shortcut
# ------------------------------------------------------------------
if session_exists; then
    echo "session '$SESSION' already running; attach with:"
    echo "  tmux attach -t $SESSION"
    exit 0
fi

# ------------------------------------------------------------------
# build the session
# ------------------------------------------------------------------
# Layout (pane ids captured as we go):
#   +----------------------+----------------+
#   | agents (AGENTS)      |                |
#   +----------------------+   pi (PI)      |
#   | mcp (MCP)            |                |
#   +----------+-----------+----------------+
#   | imsg     | log       |                |
#   +----------+-----------+----------------+

echo $$ > "$PID_FILE"

# Create the session detached with the agents pane. -P -F captures the new
# pane id; we then use those ids to target splits reliably regardless of
# pane-base-index.
AGENTS=$(tmux new-session -d -s "$SESSION" -n dash -P -F '#{pane_id}' \
    "bash '$PANES_DIR/agent_presence.sh'")

tmux set-option -t "$SESSION" status on            2>/dev/null || true
tmux set-option -t "$SESSION" mouse on             2>/dev/null || true
tmux set-option -t "$SESSION" status-left  "[monitor] " 2>/dev/null || true
tmux set-option -t "$SESSION" status-right "#H %H:%M:%S" 2>/dev/null || true

# Split the initial (agents) pane horizontally — right side becomes pi.
PI=$(tmux split-window -h -t "$AGENTS" -p 40 -P -F '#{pane_id}' \
    "bash '$PANES_DIR/pi_session.sh'")

# Split the agents pane vertically — below it becomes mcp.
MCP=$(tmux split-window -v -t "$AGENTS" -p 66 -P -F '#{pane_id}' \
    "bash '$PANES_DIR/mcp_health.sh'")

# Split the mcp pane vertically — below it becomes imsg.
IMSG=$(tmux split-window -v -t "$MCP" -p 50 -P -F '#{pane_id}' \
    "bash '$PANES_DIR/imessage_tail.sh'")

# Split imsg horizontally — right of imsg becomes log/header.
LOG=$(tmux split-window -h -t "$IMSG" -p 50 -P -F '#{pane_id}' \
    "bash '$PANES_DIR/header.sh'")

# Label panes by id
tmux select-pane -t "$AGENTS" -T "agents" 2>/dev/null || true
tmux select-pane -t "$MCP"    -T "mcp"    2>/dev/null || true
tmux select-pane -t "$IMSG"   -T "imsg"   2>/dev/null || true
tmux select-pane -t "$LOG"    -T "log"    2>/dev/null || true
tmux select-pane -t "$PI"     -T "pi"     2>/dev/null || true

tmux set-option -t "$SESSION" pane-border-status top 2>/dev/null || true
tmux set-option -t "$SESSION" pane-border-format " #{pane_title} " 2>/dev/null || true

# Focus the pi pane by default
tmux select-pane -t "$PI" 2>/dev/null || true

echo "launched tmux session: $SESSION"
echo "attach with:  tmux attach -t $SESSION"
echo "stop with:    bash $0 stop"
