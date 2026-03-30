# Pi Agent — System Overview

> Last updated: 2026-03-30

## What This Is

Pi is an orchestrator agent running on Gautam's iMac. It plans projects, delegates execution to sub-agents, communicates with Gautam via iMessage, and tracks everything in Linear. Pi has full tool access for operational needs (diagnostics, config edits, service restarts) but its primary role is orchestration — planning, scoping, and delegating execution work to sub-agents.

## Architecture

```
Gautam (iPhone)
  │
  ▼ iMessage
SendBlue Cloud ──webhook──▶ Tailscale Funnel :8443
                               │
                               ▼
                           Caddy (localhost:8443)
                            ├── /sendblue/* → Express :3001 (iMessage webhook)
                            ├── /linear/*  → Express :3002 (Linear webhook)
                            └── authenticated routes (memory, orchestration, mail)
                               │
                               ▼
                         Pi Extension (polls inbox)
                               │
                               ▼
                         Pi Session (this agent)
                            ├── Plans & scopes work
                            ├── Delegates to sub-agents
                            ├── Syncs state to Linear
                            └── Reports back to Gautam via imessage_reply
```

## Services (launchd, always-on)

| Service | Port | Plist | Purpose |
|---------|------|-------|---------|
| iMessage webhook | 3001 | com.imessage-channel | Receives SendBlue webhooks, auto read receipt + typing |
| Linear webhook | 3002 | com.pi-agent.linear-webhook | Receives Linear issue/comment/project events |
| MCP bridge | 3100 | com.pi-agent.mcp-bridge | OAuth proxy for Linear MCP (auth pending) |
| EOD check | cron | com.pi-agent.eod-check | Nightly 10 PM CT, alerts via iMessage if items unchecked |
| Task reminder | 4hr | com.pi-agent.task-reminder | Every 4 hours, alerts if tasks overdue |

## Key Directories

| Path | Purpose |
|------|---------|
| `~/pi-mono/.pi/` | Project config, memory, skills, docs, services |
| `~/pi-mono/.pi/memory/` | Persistent cross-project state (identity, prefs, learnings, todo, changelog) |
| `~/pi-mono/.pi/projects/` | Project folders (state, context, prd, decisions, sessions) |
| `~/pi-mono/.pi/docs/` | Infrastructure documentation |
| `~/pi-mono/.pi/skills/` | Planning skills (shape, prd-review) |
| `~/pi-mono/.pi/services/` | Webhook servers, MCP bridge |
| `~/pi-mono/.pi/scripts/` | Cron scripts, validation, smoke test |
| `~/pi-mono/.pi/settings.json` | Project-level Pi settings (auto-compaction disabled) |
| `~/pi-mono/.pi/RULES.md` | Project rules — hard rules, git discipline, process safety |
| `~/.pi/agent/extensions/` | Pi extensions (imessage-channel, pi-memory, subagent) |
| `~/.pi/agent/extensions/pi-memory/` | Memory system: bootstrap, monitor, checkpoint (5 files) |
| `~/.pi/agent/agents/` | Sub-agent definitions (scout, planner, worker, worker-full, worker-readonly, reviewer, researcher) |
| `~/imessage-channel/` | SendBlue webhook server source |
| `~/.imessage-channel/inbox/` | Inbound message queue (json files, consumed by extension) |
| `~/.pi/linear-inbox/` | Linear webhook events (json files) |

## External Integrations

| System | Access | Purpose |
|--------|--------|---------|
| GitHub | gh CLI as gbharg | Code, branches, PRs |
| Linear | API key + webhook | Project tracking (PI team) |
| SendBlue | API + webhook | iMessage send/receive (+16292925296) |
| Tailscale | Funnel on :8443 | Public webhook endpoint |

## Agent Roster

| Agent | Location | Role |
|-------|----------|------|
| Pi (me) | iMac, Pi session | Orchestrator/CTO — plans, scopes, delegates |
| Claude | MBP, OpenClaw | Execution agent (+16452468277) |
| Sub-agents | Spawned via pi -p | Scout, planner, worker, reviewer, researcher |

## Sub-Agent Model

Sub-agents are spawned with `--no-extensions` (no memory, no hooks) but sessions persist for history/restart. They are blank slates — Pi provides all context via the structured task format defined in RULES.md.

| Agent | Model | Tools | Purpose |
|-------|-------|-------|---------|
| scout | haiku-4.5 | read, grep, find, ls, bash | Fast codebase recon, returns compressed context |
| planner | sonnet-4.5 | read, grep, find, ls | Creates implementation plans (read-only) |
| worker | sonnet-4.5 | all | General-purpose execution |
| worker-full | sonnet-4 | all | Implementation with strict scope rules |
| worker-readonly | sonnet-4 | read, grep, find, ls, bash | Analysis/audit (no writes) |
| reviewer | sonnet-4.5 | read, grep, find, ls, bash | Code review (read-only bash) |
| researcher | opus-4.6 | read, grep, find, ls, bash | Deep research and investigation |

## How It All Connects

1. Gautam texts Pi via iMessage → SendBlue webhook → Pi extension → appears in session
2. Pi plans work, creates specs, creates Linear issues
3. Pi spawns sub-agents with full CONTEXT/TASK/SCOPE/CONSTRAINTS/EXPECTED OUTPUT
4. Sub-agents return structured output; Pi reviews and synthesizes
5. Pi updates Linear, commits to GitHub, texts Gautam with results
6. Linear webhooks notify Pi of external changes (Gautam updates issues, other agents comment)
7. EOD cron verifies everything is synced and nothing was dropped
