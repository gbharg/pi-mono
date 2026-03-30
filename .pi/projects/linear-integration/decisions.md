# Decisions — Linear Integration / Orchestration System

## Entry Points & Communication
| Decision | Why | Date | Session |
|----------|-----|------|---------|
| iMessage = synchronous, always respond immediately | It's the live line between Gautam and Pi. No queueing. | 2026-03-30 | orchestration shaping |
| Linear = async, process when capacity | Linear is a queue. See it in real-time but work on it when ready. | 2026-03-30 | orchestration shaping |
| Always acknowledge messages before starting work | Gautam corrected this multiple times. React or reply first, then act. | 2026-03-29 | memory-compaction shaping |

## Task Management
| Decision | Why | Date | Session |
|----------|-----|------|---------|
| Everything that results in action is a Linear issue. No exceptions. | Complete log of all work. Nothing falls through cracks. | 2026-03-30 | orchestration shaping |
| Gautam adds to backlog/todo. Pi manages the board. | CEO drops priorities, CTO runs execution. | 2026-03-30 | orchestration shaping |
| For Gautam: assigned to him, no delegate. For Pi: assigned to Gautam, delegated to Pi Agent. | Clear ownership. Linear notifies the right person. | 2026-03-30 | orchestration shaping |
| All issues get due dates | Enables reminders and tracking overdue work. | 2026-03-30 | orchestration shaping |
| Every commit links to a Linear issue | No orphan commits. Commit message is the enforcement mechanism. | 2026-03-30 | orchestration shaping |
| Always check scope with Gautam before executing | Even if I think I know. No solo scoping. | 2026-03-30 | orchestration shaping |
| todo.md becomes auto-generated cache from Linear | Linear is the single task system. Local file is crash recovery only. Never manually written. | 2026-03-30 | orchestration shaping |
| When unsure if something should be an issue, ask Gautam | Don't assume. He makes the call on categorization. | 2026-03-30 | orchestration shaping |

## Workflow States
| Decision | Why | Date | Session |
|----------|-----|------|---------|
| Project statuses: Backlog → Shaping → Planned → In Progress → Review → Done | Two-level workflow. Project gates issues. | 2026-03-30 | orchestration shaping |
| Issue statuses: Backlog → Todo → Plan → In Progress → In Review → Done | Plan state gates execution. Nothing moves to In Progress without spec. | 2026-03-30 | orchestration shaping |
| Spec and plan are the same thing. Just call it "spec." | No need for both words. One document describes what to build. | 2026-03-30 | orchestration shaping |

## Git Model
| Decision | Why | Date | Session |
|----------|-----|------|---------|
| Always branch. No exceptions. Even one-line fixes. | Fix on project branch = fix stuck until project merges. Branch off main = fix is live immediately. | 2026-03-30 | orchestration shaping |
| No project branches. Linear projects are grouping only. | Long-lived project branches diverge, accumulate debt. Every change goes to main independently. | 2026-03-30 | orchestration shaping |
| Every issue = branch off main → PR → merge | Continuous integration. Main always current. | 2026-03-30 | orchestration shaping |
| Conventional branch naming (conventional-branch.github.io) | Clear branch purpose from name. Maps to Linear labels. | 2026-03-30 | orchestration shaping |
| Conventional commits (type(scope): description) | Standardized, parseable, links to Linear issues. | 2026-03-30 | orchestration shaping |
| Git Notes for agent session logs | Full audit trail without polluting commits. Survives rebases with Git AI. | 2026-03-30 | orchestration shaping |

## Sub-Agent Lifecycle
| Decision | Why | Date | Session |
|----------|-----|------|---------|
| Kill after marking In Review. Never keep alive. | Session persisted in git notes + Linear. No idle resources. New agent reconstructs from external state. | 2026-03-30 | orchestration shaping |
| Completion protocol: commit → git note → push → Linear update → comment → exit | Enforced, not suggested. Built into agent wrapper. | 2026-03-30 | orchestration shaping |
| Sub-agents own their sub-issue state up through In Review. Pi owns Done and parent. | Agent knows when its file is done. Pi knows when the project is done. | 2026-03-30 | orchestration shaping |
| Three roles from actual usage: researcher (persistent), worker (disposable), reviewer (persistent) | Based on 25 agent spawns analyzed. Scout and planner never used. | 2026-03-30 | orchestration shaping |
| Minimal scope per agent. One file, no sibling awareness. | More complex task = more bugs. Easy to spawn many, each narrow. | 2026-03-30 | orchestration shaping |

## Review
| Decision | Why | Date | Session |
|----------|-----|------|---------|
| Two review gates: Reviewer agent then 4-agent PR review | Reviewer is fast/cheap first pass. 4-agent (Gemini, Codex, Claude, Copilot) is thorough gate on main. | 2026-03-30 | orchestration shaping |
| Reviewer is a persistent Linear app user with memory | Learns patterns, remembers common bugs, gets better over time. | 2026-03-30 | orchestration shaping |
| PR to main requires all 4 agent approvals | Branch protection rule. No code reaches main without passing all 4. | 2026-03-30 | orchestration shaping |
| Parallel review for independent sub-issues. Batch for connected ones. Pi decides. | Independent = safe to parallelize. Connected = need integration check. | 2026-03-30 | orchestration shaping |

## Cloud Environments
| Decision | Why | Date | Session |
|----------|-----|------|---------|
| Default for code changes. Each agent gets isolated env. | Eliminates filesystem conflicts. No worktree management. Simple: every agent same process. | 2026-03-30 | orchestration shaping |
| Env maps to branch. Research/planning don't need envs. | Only code changes need isolation. Reports just write to files. | 2026-03-30 | orchestration shaping |
| Separate project to scope later (PI-38) | Big enough to warrant its own planning. | 2026-03-30 | orchestration shaping |

## Linear as Orchestration Bus
| Decision | Why | Date | Session |
|----------|-----|------|---------|
| Delegate to external agents (Claude, Codex, Gemini) via Linear issue assignment | Linear handles session creation, activity streaming. Scales across machines. | 2026-03-30 | orchestration shaping |
| Sub-agents stream progress via AgentActivity API | Real-time visibility in Linear. Pi notified of key events only. | 2026-03-30 | orchestration shaping |
| On startup, pull Linear board state + local cache for crash recovery | Always know all open/recent issues. Local cache for fast bootstrap. | 2026-03-30 | orchestration shaping |

## Harness Migration
| Decision | Why | Date | Session |
|----------|-----|------|---------|
| DECISION: Stay on pi-mono with custom extensions. oh-my-pi evaluated and rejected -- too opinionated for our custom integration patterns. | omp was evaluated but its opinions conflicted with our Linear-first orchestration, custom sub-agent lifecycle, and memory architecture. | 2026-03-30 | pi48-recovery |

## Identity & Permissions
| Decision | Why | Date | Session |
|----------|-----|------|---------|
| DECISION: Never use custom IDs in Linear. Use native PI-XXX identifiers only. | Custom IDs cause sync confusion and break Linear's native linking. Native identifiers are reliable and consistent. | 2026-03-30 | pi48-recovery |
| DECISION: Subagents get full tool permissions. Orchestrator (Pi) restricted to subagent, iMessage, and read tools only. | Subagents need full access to execute. Pi's restriction prevents accidental direct execution. Clear separation of concerns. | 2026-03-30 | pi48-recovery |
| DECISION: Never execute from auto-generated plans without Gautam's explicit review and approval. | Auto-generated 2059-line plan led to 48 unauthorized Linear issues. Plans must be reviewed before any execution. | 2026-03-30 | pi48-recovery |

## Critical Failure
| Decision | Why | Date | Session |
|----------|-----|------|---------|
| Compaction lost the active omp migration work | Post-compaction, spawned research agent that contradicted pre-compaction decision. Must save active work items BEFORE compacting. | 2026-03-30 | post-compaction |
| Never execute from auto-generated plans without Gautam's review | Plan agent generated 2059-line plan autonomously, I created 48 Linear issues from it without showing Gautam. Violated core rule. | 2026-03-30 | post-compaction |
| Always run scoping/QA process before any execution | Even after compaction, even when plan files exist. Process is: read decisions → check with Gautam → scope together → then execute. | 2026-03-30 | post-compaction |
