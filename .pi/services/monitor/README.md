# monitorTool — Visual Pi/Claude/MCP Dashboard

Passive tmux-based observability dashboard for the Pi orchestrator agent, all
active Claude Code sub-agents, MCP server health, and recent iMessages from
Gautam.

This is NOT an agent. It runs no model, executes no tools, and never writes
anything destructive. It only reads state and displays it.

## What it shows

The `monitor` tmux session launches with 5 panes:

| Pane | What it shows | Refresh | Source |
|---|---|---|---|
| `agents` | Agent presence board (state, branch, task, host, age) | 5s | `~/openclaw/memory/scripts/presence.sh board` |
| `pi` | Pi session — live tail of the freshest Claude Code transcript in `~/.claude/projects/-Users-agent-pi-mono/` | 3s | JSONL transcripts |
| `mcp` | MCP server health grid (Connected / Failed / NeedsAuth) | 10s | `claude mcp list` parsed |
| `imsg` | Last 15 iMessages with +19723637754 (read-only) | 5s | `~/Library/Messages/chat.db` via sqlite3 |
| `log` | Scrolling header + mcp_monitor log tail | 2s | `/tmp/mcp_monitor.log` + header banner |

All panes write nothing except `/Users/agent/pi-mono/.pi/services/monitor/status.json`,
which is a rolling JSON snapshot of agent/MCP state updated by the `mcp` pane
every 10s. External tools can read it without touching the tmux session.

## "Pi" = the orchestrator agent

After investigation: "Pi" is not a Raspberry Pi host. It's the name of the
orchestrator agent identity defined in `~/pi-mono/.pi/AGENT.md` — the single
agent that talks to Gautam via iMessage and delegates to sub-agents. The "Pi
session" is the Claude Code tmux session where Pi is currently running.

The `pi` pane auto-detects the most recently modified session transcript for
the `-Users-agent-pi-mono` project and tails it (filtered to human-readable
text content). If Pi restarts into a new session, the pane will pick up the
new transcript on the next refresh cycle.

## Integration with /tmp/mcp_monitor.sh

The prior `/tmp/mcp_monitor.sh` (PID 92997 at time of writing) is **kept
running as-is**. This monitorTool reads its state file (`/tmp/mcp_monitor_state.json`)
and log (`/tmp/mcp_monitor.log`) rather than superseding it. The background
monitor continues to fire BlueBubbles alerts on MCP state flips while the
dashboard provides a visual overlay.

If you want to stop the background monitor: `kill 92997` (or whatever PID it
has after restart). The monitorTool dashboard will continue working — it has
its own fallback that polls `claude mcp list` directly if the state file is
stale (>60s).

## Launch

```bash
bash /Users/agent/pi-mono/.pi/services/monitor/monitor.sh
# or, if symlinked:
tmux-monitor
```

Then attach in any terminal:

```bash
tmux attach -t monitor
```

Detach: `Ctrl+B, d` (standard tmux). Session keeps running in background.

## Stop

```bash
tmux kill-session -t monitor
```

Or send SIGTERM to the launcher PID (written to `/tmp/monitorTool.pid`).

## Files

```
monitor/
├── README.md              (this file)
├── monitor.sh             (main launcher — creates tmux session, spawns panes)
├── status.json            (rolling snapshot, written by panes/mcp_health.sh)
└── panes/
    ├── agent_presence.sh  (agents pane)
    ├── pi_session.sh      (pi pane)
    ├── mcp_health.sh      (mcp pane — also writes status.json)
    ├── imessage_tail.sh   (imsg pane)
    └── header.sh          (log pane header + mcp_monitor.log tail)
```

## Constraints honored

- No npm/bun/pip installs. Uses only tmux, sqlite3, python3, jq, and standard
  POSIX utilities.
- No bash associative arrays. Data transforms go through `python3 -c`.
- Minimum 2s between any poll to avoid CPU burn.
- All panes catch errors and display a red "ERR: ..." line instead of crashing;
  the pane script re-enters its loop.
- Designed to run on the iMac (Darwin 25.4.0). Not container-safe — relies on
  ~/Library/Messages access.

## Security notes

- `chat.db` read requires Full Disk Access for the terminal (already granted
  on the iMac). If the `imsg` pane shows "permission denied", check System
  Settings > Privacy & Security > Full Disk Access.
- `status.json` is readable by anything on the machine. It contains MCP
  server names and presence agent IDs — no secrets, no message bodies.
- The iMessage pane truncates message text to 60 chars per line to reduce
  shoulder-surfing risk when the dashboard is on screen.
