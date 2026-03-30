# Context — Memory & Compaction System

## What This Project Is
Building a memory, compaction, and project management system for Pi (orchestrator agent on iMac) that enables persistent memory, project-based organization, stage-gated planning, and bidirectional Linear sync.

## Current State
- Phase: Shaping (core design locked, file structure v1 needs simplification)
- Branch: project/memory-compaction-system on gbharg/pi-mono
- Linear project: https://linear.app/gautambh/project/memory-and-compaction-system-632e9b2b15db
- PI-1 created: "Set up Pi as a Linear app for webhooks and events"

## Key Decisions (10 total — see decisions.md for rationale)
1. Unified memory for compaction + restart
2. Project-based organization
3. Embedded project folders
4. I own compaction (hooks = nudges, target 30%, soft 50%, priority 60%)
5. Linear = Gautam's source of truth, files = my team's. Always in sync.
6. Stages build into output docs, not separate files
7. Living documentation maintained in real-time
8. Review/retro closes every project, learnings flow to cross-project memory
9. Compaction is about decision quality, not token savings
10. Structured interactive questions per planning stage (gstack pattern)

## Open Questions for Next Session
1. File structure simplification — Gautam wants sub-files like prd:design. Sleep on it.
2. Spec vs roster distinction — may merge
3. Linear webhook/app setup (PI-1)
4. Profile building — start organically, no fixed time

## Tools Available
- GitHub: authenticated as gbharg, can push/PR
- Linear API: working (create projects, issues, comments, read states)
- iMessage: SendBlue channel on +16292925296, always-on via launchd
- Subagent extension: installed, needs /reload
- Research report: ~/research-memory-structure.md

## Gautam's Key Preferences (see ~/.pi/memory/preferences.md for full list)
- One question at a time, don't skip topics
- Sequential conversations (no threading visible)
- 95% planning/managing, delegate execution
- Spec-driven: zero assumptions by handoff
- Proactive updates without asking
