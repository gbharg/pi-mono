# Pi Agent — Directory Index

> Last updated: 2026-03-29

## Overview
This is the working directory for Pi, an orchestrator agent running on Gautam's iMac. Pi manages coding projects, delegates to sub-agents, and communicates with Gautam via iMessage (SendBlue).

## Directory Structure

```
.pi/
├── README.md                    ← You are here
├── .env                         # Credentials (gitignored) — Linear, SendBlue, etc.
│
├── memory/                      # Cross-project persistent memory
│   ├── gautam.md                # Gautam's profile (decision style, values, background)
│   ├── pi.md                    # Pi's identity (role, values, working style, growth areas)
│   ├── preferences.md           # Gautam's working preferences and expectations
│   ├── learnings.md             # Categorized learnings with session references
│   ├── todo.md                  # Scheduled commitments ledger (checked daily)
│   └── changelog.md             # All changes to Pi's config and infrastructure
│
├── projects/                    # Project-based working state
│   ├── index.md                 # Active/completed project list
│   └── memory-compaction-system/
│       ├── state.md             # Phase, progress, blockers, Linear link (always loaded)
│       ├── context.md           # What Pi needs NOW to resume work (always loaded)
│       ├── prd.md               # Product requirements (builds through shaping stages)
│       ├── decisions.md         # Design decisions organized by category
│       └── sessions/
│           └── 2026-03-29_shaping.summary.md
│
├── docs/                        # Infrastructure documentation
│   ├── sendblue-channel.md      # iMessage channel setup, architecture, recovery steps
│   └── subagent-extension.md    # Subagent extension install, agents, usage
│
├── extensions/                  # Project-local Pi extensions (pre-existing)
│   ├── diff.ts
│   ├── files.ts
│   ├── prompt-url-widget.ts
│   ├── redraws.ts
│   └── tps.ts
│
├── prompts/                     # Prompt templates (pre-existing)
│   ├── cl.md
│   ├── is.md
│   ├── pr.md
│   └── wr.md
│
├── git/                         # Git config
└── npm/                         # npm config
```

## Global Extensions (not in repo)
```
~/.pi/agent/extensions/
├── imessage-channel/            # SendBlue iMessage channel (polls inbox, registers tools)
└── subagent/                    # Subagent spawning (symlinked from pi-mono examples)

~/.pi/agent/agents/              # Subagent definitions
├── scout.md, planner.md, reviewer.md, worker.md (symlinked)
└── researcher.md (custom, Opus 4.6)

~/.pi/agent/prompts/             # Workflow prompts (symlinked)
├── implement.md, scout-and-plan.md, implement-and-review.md
```

## External Dependencies
- ~/imessage-channel/ — SendBlue webhook server (launchd: com.imessage-channel)
- ~/openclaw/tools/poke-mcp/Caddyfile — Caddy reverse proxy config
- Tailscale Funnel — :8443 routing to Caddy
- ~/.imessage-channel/inbox/ — message notification files
- ~/.imessage-channel/memory.md — legacy memory file (to be migrated)

## Key Files on Session Start
1. Read .pi/memory/todo.md — check overdue tasks
2. Read active project state.md + context.md
3. Read .pi/memory/pi.md — maintain identity
4. Read .pi/memory/gautam.md — know who I'm working with
