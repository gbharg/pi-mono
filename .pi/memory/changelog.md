# Pi Changelog

All changes to Pi's configuration, extensions, memory system, and infrastructure.

## 2026-03-29

### iMessage Channel Setup
- Installed SendBlue webhook server at ~/imessage-channel/ (Express on port 3001)
- Configured Caddy reverse proxy: :8443/sendblue/* → localhost:3001
- Configured Tailscale Funnel: gautams-imac.tail053faf.ts.net:8443 → Caddy
- Created launchd plist: com.imessage-channel (KeepAlive, RunAtLoad)
- Built Pi extension at ~/.pi/agent/extensions/imessage-channel/ (polls inbox, injects messages, registers imessage_reply/react/history tools)
- SendBlue number: +16292925296, target: +19723637754

### Subagent Extension
- Symlinked subagent extension from pi-mono examples to ~/.pi/agent/extensions/subagent/
- Symlinked agent definitions (scout, planner, reviewer, worker) to ~/.pi/agent/agents/
- Symlinked workflow prompts (implement, scout-and-plan, implement-and-review) to ~/.pi/agent/prompts/
- Created custom researcher.md agent (Opus 4.6, for background research tasks)

### Memory System
- Created ~/.pi/memory/gautam.md — Gautam's personality profile
- Created ~/.pi/memory/pi.md — Pi's identity and personality
- Created ~/.pi/memory/preferences.md — Gautam's working style and expectations
- Created ~/.pi/memory/learnings.md — categorized learnings with session references
- Created ~/.pi/memory/todo.md — scheduled commitments ledger
- Created ~/.pi/memory/changelog.md — this file

### Project Infrastructure
- Created branch: project/memory-compaction-system on gbharg/pi-mono
- Created Linear project: Memory & Compaction System (PI team)
- Created Linear issue: PI-1 (Set up Pi as Linear app for webhooks)
- Created project folder at .pi/projects/memory-compaction-system/ with state, context, prd, decisions, session summary
- Created project index at .pi/projects/index.md
- Saved Linear API key to ~/imessage-channel/.env

### Overnight Work — Phase 3 (orchestration + audit)
- Evaluated 3 orchestration packages: pi-teams, pi-messenger-swarm, taskplane
- Added pi-teams to settings.json (pi-messenger-swarm install broken, taskplane for later)
- Ran 4 parallel Sonnet agents to audit gbharg/agents repo (agents/, infra/, harness/, apps+memory)
- Synthesized with Opus into FINAL-AUDIT.md (20KB, top 10 features ranked)
- Posted full report to Linear PI-10
- PI-9 and PI-10 completed with proof of work

### Overnight Work — Phase 2 (orchestration testing)
- Built /skill:shape — structured brief/shaping skill with 11 progressive questions
- Built /skill:prd-review — PRD generation skill with 14 questions across product/design/engineering
- Created task reminder cron (com.pi-agent.task-reminder, every 4 hours, alerts via iMessage)
- Research reports completed: orchestration patterns + skill generation
- All PI-1 through PI-8 completed in Linear

### Overnight Work (while Gautam sleeps) — continued
- Built Linear webhook server at .pi/services/linear-webhook/ (Express on port 3002)
- Added /linear/* route to Caddy (same pattern as SendBlue)
- Created launchd plist: com.pi-agent.linear-webhook (KeepAlive, RunAtLoad)
- Registered Linear webhook: Issue, Comment, Project events → https://gautams-imac.tail053faf.ts.net:8443/linear/webhook
- Webhook ID: 3032e329-a88c-488a-b81d-e6ad95229db3
- Events write to ~/.pi/linear-inbox/ for Pi to process
- Tested end-to-end: Linear state change → webhook fires → inbox file created
- PI-1 completed

### Overnight Work (while Gautam sleeps)
- Built pi-memory extension at ~/.pi/agent/extensions/pi-memory/ (loads todo, project state, identity on session_start; compaction nudges on turn_end; EOD reminder on shutdown)
- Created nightly EOD check cron (com.pi-agent.eod-check, runs 10 PM CT, alerts via iMessage if items unchecked)
- Created .pi/scripts/validate-structure.sh (validates directory structure, catches credentials in tracked files)
- Created .pi/scripts/eod-check.sh (nightly automated checklist)
- Removed credentials from tracked documentation files

### Credentials
- Created .pi/.env (gitignored) as central credential store
- Contains: Linear, SendBlue, and GitHub credentials (see .pi/.env for details)
- GitHub token managed by gh CLI at ~/.config/gh/hosts.yml

### Caddy Configuration
- Added /sendblue/* route to Caddyfile at ~/openclaw/tools/poke-mcp/Caddyfile (no auth, bypasses Bearer token requirement)
- Added bind 127.0.0.1 to avoid conflict with Tailscale Funnel port binding
