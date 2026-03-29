# Context — Memory & Compaction System

## What This Project Is
Building a memory and compaction system for Pi (the orchestrator agent on iMac) that enables:
- Persistent memory across sessions and compactions
- Project-based file organization mirroring Linear project structure
- Stage-gated planning workflow (brief → PRD → spec → execution → review)
- Bidirectional sync between local files and Linear
- Self-managed compaction with nudges, not auto-triggers

## Key Decisions Made
1. One unified memory system for both compaction and restart recovery
2. Project-based organization (not days, not decisions)
3. Embedded structure — all artifacts in one project folder
4. Compaction targets: 30% normal, 50% soft ceiling, 60% top priority
5. I own compaction decisions — hooks are nudges, not triggers
6. Linear is Gautam's source of truth, my files are my team's — both always in sync
7. Syncing to Linear is the gate between planning and execution
8. Planning stages build on each other into output docs (PRD accumulates brief → scope → design → eng)
9. Structured interactive questions per planning stage (gstack pattern)
10. Living docs maintained in real-time to avoid debt

## Open Questions
- File structure simplification — sub-files like prd:design vs separate files
- Spec vs roster distinction — may merge
- Exact folder layout — v1 drafted, Gautam sleeping on it
