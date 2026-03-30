# Current State

Last updated: 2026-03-30
Session: post-defrag (by Claude on MBP)

## Active Focus
Sub-agent architecture and orchestration for pi-mono.
- Five agent roles active: researcher, worker, worker-full, worker-readonly, reviewer (scout and planner templates exist as symlinks but were never spawned in practice)
- Delegation guard enforced: Pi orchestrator blocked from edit/write via guard.ts hook — must spawn sub-agents
- Minimize scope per agent: one file per agent, no sibling awareness
- Linear as orchestration bus (delegateId + AgentSessionEvent webhook)
- Completion protocol: commit, git note, push, Linear update, comment, exit

## Key Decisions (active)
See `.pi/projects/linear-integration/decisions.md` for full decision log with rationale.
- Stay on pi-mono with custom extensions (oh-my-pi rejected)
- Everything goes in Linear immediately
- Always branch off main, no project branches
- Conventional branch naming + conventional commits
- iMessage = synchronous, Linear = async
- Never execute from auto-generated plans without Gautam's review
- Native PI-XXX identifiers only in Linear
- Pi orchestrator restricted to subagent + imessage + read tools (enforced by guard.ts)

## Pending Items
See Linear for authoritative task list. Key items:
- PI-34: Scheduled reminder system (HIGH PRIORITY)
- PI-56: Sub-agent completion protocol
- PI-65: Multi-agent PR review gate
- Clean up 48 unauthorized Linear issues (PI-72 through PI-126)
- PI-41: Naming conventions
