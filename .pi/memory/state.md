# Current State

Last updated: 2026-03-30T11:00:00Z
Session: pi49 (post-recovery)

## Active Focus
Sub-agent architecture and configuration for pi-mono. Specifically:
- Three confirmed agent roles: researcher, worker, reviewer (scout and planner REMOVED)
- Minimize scope per agent: one file per agent, no sibling awareness
- Cloud environments default for code changes; research/planning = local
- Linear as orchestration bus (delegateId + AgentSessionEvent webhook)
- Sub-agents stream progress to Linear via API; Pi notified of key events only
- Completion protocol: commit, git note, push, Linear update, comment, exit

## Key Decisions (active)
- Stay on pi-mono with custom extensions. oh-my-pi abandoned -- too opinionated for our custom system.
- Everything goes in Linear immediately. No exceptions.
- Always branch. No project branches. Every change goes to main independently.
- Conventional branch naming + conventional commits.
- iMessage = synchronous (always respond instantly). Linear = async.
- Never execute from auto-generated plans without Gautam's review.
- Never use custom IDs in Linear -- use native PI-XXX identifiers only.
- Subagents get full tool permissions (bash, write, edit, grep). Pi orchestrator restricted to: subagent, imessage tools, read only.

## Pending Items
- Build reminder system (cron checking Linear due dates, sends iMessage reminders) -- HIGH PRIORITY
- Build update cadence system (check sub-agent status every 1 min, update Gautam every 3 min)
- Clean up unauthorized Linear issues (48 created from auto-generated plan without approval)
- Update gautam.md profile (stale since March 29)
- Implement daily end-of-session save review

## Context
Pi's memory extension was broken for 30+ hours (sessions pi32-pi48) due to regex bug in paths.ts. Fixed. All memory files have been audited and corrected by Claude Code on 2026-03-30.
