# Decisions Log — Memory & Compaction System

## Memory Architecture
| Decision | Why | Date | Session |
|----------|-----|------|---------|
| One unified system for compaction + restart recovery | From Gautam's perspective, context loss is context loss regardless of cause. Hide the implementation detail. | 2026-03-29 | shaping |
| Project-based organization (not days, not decisions) | Projects have natural lifecycles and map to Linear, branches, PRs. | 2026-03-29 | shaping |
| Embedded project folders (all artifacts together) | One folder = complete picture. Separated structure fragments context. | 2026-03-29 | shaping |
| Save both structured (what) and narrative (why) | A decision without rationale is useless after compaction — won't know if it still applies. | 2026-03-29 | shaping |

## Compaction
| Decision | Why | Date | Session |
|----------|-----|------|---------|
| Pi owns compaction — hooks are nudges, not triggers | Mechanical triggers fire at wrong time. Agent judgment produces better summaries. | 2026-03-29 | shaping |
| Target 30%, soft ceiling 50%, priority ceiling 60% | Compaction is about decision quality, not token savings. Bloated context degrades planning. | 2026-03-29 | shaping |
| 60% is top priority, not forced | Even under pressure, a deliberate summary is better than an auto-generated one. | 2026-03-29 | shaping |

## Planning & Workflow
| Decision | Why | Date | Session |
|----------|-----|------|---------|
| Planning stages build into output docs, not separate files | Brief → scope → design → eng requirements all accumulate into PRD. Separate files = duplication. | 2026-03-29 | shaping |
| Structured interactive questions per stage (gstack pattern) | Ad-hoc planning leads to skipped topics. Structured questions ensure systematic coverage. | 2026-03-29 | shaping |
| Living documentation maintained in real-time | "Document later" creates debt. Real-time docs are cheap when doing the work. | 2026-03-29 | shaping |

## Orchestration & Sync
| Decision | Why | Date | Session |
|----------|-----|------|---------|
| Linear = Gautam's source of truth, files = agent team's | Gautam can't ls the file system. Linear is his window. Both must mirror. | 2026-03-29 | shaping |
| Syncing to Linear is the gate between planning and execution | Plan isn't done until it's in both places. | 2026-03-29 | shaping |
| Review/retro closes every project, learnings flow to cross-project memory | Without it, learnings die with the session or compaction. | 2026-03-29 | shaping |
