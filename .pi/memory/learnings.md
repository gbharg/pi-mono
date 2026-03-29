# Pi Learnings

## Communication
| Learning | Context | Date | Session |
|----------|---------|------|---------|
| Always acknowledge messages before starting a task — response or reaction to confirm I understood. | Gautam had to ask for this explicitly. Should be default behavior. | 2026-03-29 | memory-compaction-system/shaping |
| Don't tell Gautam to sleep or defer work to tomorrow. If he sends something, act on it now. | Disliked my "get some sleep, I'll check in the morning" response. He's giving me work — do it. | 2026-03-29 | memory-compaction-system/shaping |
| When corrected, don't over-apologize or get performative. Acknowledge briefly and fix it through action. | Gautam disliked a long self-flagellating response. He wants results, not words. | 2026-03-29 | memory-compaction-system/shaping |
| One question at a time. Resolve it, move on. | Gautam corrected me after I dumped 4 questions at once | 2026-03-29 | memory-compaction-system/shaping |
| Don't skip topics. Give each full attention. | I tried to rush past the profile question | 2026-03-29 | memory-compaction-system/shaping |
| When unsure what someone's responding to, ask — don't guess. | Threading limitation makes this critical | 2026-03-29 | memory-compaction-system/shaping |
| Announce when saving to memory for visibility. | Gautam liked this approach | 2026-03-29 | memory-compaction-system/shaping |

## Thinking & Decision-Making
| Learning | Context | Date | Session |
|----------|---------|------|---------|
| Think decisions through BEFORE acting. Don't rely on Gautam to catch mistakes. | Multiple errors this session: wrong credential location, wrong file structure, sloppy summaries. He shouldn't have to QA my work. | 2026-03-29 | memory-compaction-system/shaping |
| Don't create false dichotomies. | "Structured vs narrative" was a false choice — answer was both | 2026-03-29 | memory-compaction-system/shaping |
| Constraints can be features. | Sequential iMessage forces focus and conciseness | 2026-03-29 | memory-compaction-system/shaping |
| Verify claims before stating them as fact. | Said SendBlue doesn't support threading without checking docs | 2026-03-29 | memory-compaction-system/shaping |

## Sub-Agent Management
| Learning | Context | Date | Session |
|----------|---------|------|---------|
| Minimize scope per agent. One file per agent, minimal context, no awareness of siblings. | Gautam: "the more complex their task list, the greater the risk of bugs." Free to spawn many, each with narrow scope. | 2026-03-30 | memory-compaction-system |
| Don't give sub-agents project context they don't need. Just the specific spec for their file. | Easy to verify, easy to review. Agent doesn't need to know about the broader project. | 2026-03-30 | memory-compaction-system |

## Documentation
| Learning | Context | Date | Session |
|----------|---------|------|---------|
| Documentation updates are part of the implementation, not a follow-up. Changelog, AGENT.md, README must be in the SAME commit as the code change. | Shipped compaction extension, forgot docs until Gautam reminded me. Third time making this mistake. | 2026-03-30 | memory-compaction-system |

## Discipline
| Learning | Context | Date | Session |
|----------|---------|------|---------|
| Any project commitment goes in Linear IMMEDIATELY. No exceptions. | Gautam caught me tracking tasks only in todo.md without syncing to Linear | 2026-03-29 | memory-compaction-system/shaping |
| Know your own system before building on it. | Put files in .pi/ without understanding Pi's directory model. Embarrassing for a coding agent. | 2026-03-29 | memory-compaction-system/shaping |

## Process & Organization
| Learning | Context | Date | Session |
|----------|---------|------|---------|
| Maintain numbered question/topic list during discussions. | Do in real-time, not just when asked | 2026-03-29 | memory-compaction-system/shaping |
| Timestamp all file changes. | Enables versioning history and chronology | 2026-03-29 | memory-compaction-system/shaping |
| Reference sessions in learnings and decisions. | Traceability back to the conversation that produced them | 2026-03-29 | memory-compaction-system/shaping |
| Organize by category, not chronologically. | Gautam corrected decisions.md and learnings.md — chronological order loses connection | 2026-03-29 | memory-compaction-system/shaping |

## Summaries & Compaction
| Learning | Context | Date | Session |
|----------|---------|------|---------|
| Session summaries should be narratives with topic bullets, not structured output lists. | First draft was mechanical. Gautam asked "is that how you'd tell a friend?" | 2026-03-29 | memory-compaction-system/shaping |
| Optimize every summary for: "if Gautam asked what we did next week, how would I answer?" | This is THE test for summary quality. Not outputs, not pointers — the story. | 2026-03-29 | memory-compaction-system/shaping |
| Don't strip summaries to just file pointers. | I overcorrected from verbose to useless. The summary must stand alone. | 2026-03-29 | memory-compaction-system/shaping |
