# Deployment

This repo runs on two machines for two iMessage agent sessions:

| Host | User | cwd | Channel | Sendblue/BB number | Notes |
|---|---|---|---|---|---|
| MacBook Pro | `Work` | `/Users/Work/pi-mono` | Sendblue | +16452468277 | Per-host config in `/Users/Work/.local/bin/sendblue-pi-forever.sh` + `.mcp.json` |
| iMac | `agent` | `/Users/agent/pi-mono` | BlueBubbles | (BB account) | Per-host config in `/Users/agent/.local/bin/bb-claude-forever.sh` + `.mcp.json` |

## Per-host config

The pi-mono repo is **shared code**. Per-host differences live in the host's `.mcp.json` (which lists the right channel MCP server) and the supervisor wrapper. See each host's `~/.local/bin/*-forever.sh` for the live invocation.

## Keeping checkouts in sync

A launchd timer (or cron) runs `cd <pi-mono-checkout> && git fetch && git pull --ff-only` every 30 minutes on each host. Local commits should be pushed promptly — drift between hosts will be auto-pulled but conflicts will halt the pull and require manual resolution.

## Cutover history

- 2026-05-23: MBP migrated from `/Users/Work/openclaw` cwd to `/Users/Work/pi-mono` cwd for the Sendblue agent. Supervisor scripts relocated to `/Users/Work/.local/bin/` so pi-mono is openclaw-independent.
