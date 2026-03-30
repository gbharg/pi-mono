# Linear Issues Snapshot — 2026-03-30

> **Crash-recovery cache only.** Linear is the source of truth. Query via API or MCP for current state.
> This file was last refreshed: 2026-03-30. Refresh with `pi linear sync` or Linear MCP tools.

## Summary
- **Total issues**: ~70 (PI-1 through PI-71 + PI-72 through PI-126 which are UNAPPROVED)
- **Done**: PI-2 through PI-6, PI-8 through PI-20, PI-25 through PI-33
- **In Progress**: PI-1 (Linear app setup), PI-13 (code standards), PI-71 (omp migration — ABANDONED, staying on pi-mono)
- **Todo**: PI-7, PI-21 through PI-24, PI-34, PI-40 through PI-54, PI-56 through PI-61
- **Backlog**: PI-35 through PI-39, PI-55, PI-62 through PI-70

## Key Active Issues
| Issue | Title | State | Priority |
|-------|-------|-------|----------|
| PI-34 | Scheduled reminder system | Todo | HIGH |
| PI-56 | Sub-agent completion protocol | Todo | HIGH |
| PI-65 | Multi-agent PR review gate | Todo | HIGH |
| PI-41 | Naming conventions | Todo | Medium |
| PI-21 | Atomic git transaction wrapper | Todo | Medium |

## Unapproved Issues (PI-72 through PI-126)
48 issues auto-generated from orchestration-project-plan.md without Gautam's approval.
**Do not work on these.** Need cleanup session with Gautam — archive or delete.

## Issue Categories
- **Infrastructure** (Done): webhooks, cron, smoke test, validation hooks, git access serialization
- **Memory/Compaction** (Done): extension build (PI-25 through PI-32), checkpoint, monitor, bootstrap
- **Orchestration** (Shaped): completion protocol, review gates, naming conventions, cloud envs
- **Research** (Done): 10 reports indexed in research-index.md
