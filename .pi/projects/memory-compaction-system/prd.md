# PRD: Memory & Compaction System

## Brief

Pi is an orchestrator agent running on Gautam's iMac, communicating via iMessage (SendBlue), managing coding agents across two machines (iMac + MBP). Pi needs a memory system that persists across sessions and compactions, organized around projects, and synced with Linear for Gautam's visibility.

### Problem
- Pi loses all context on session restart
- Compaction drops important decisions and commitments
- No structured way to organize work across projects
- Gautam can't see Pi's file-based state (needs Linear as his window)
- No stage-gated planning workflow — work starts without thorough scoping

### Goal
Build a memory and project management system that makes Pi a reliable CTO — never drops a task, never forgets a decision, always knows where every project stands, and communicates proactively.

---

## Scope (in progress — shaping phase)

### Requirements
1. **Project folders** with embedded artifacts (PRD, spec, tasks, changelog, review, docs)
2. **Always-loaded state** — state.md + context.md read on every session start (<200 tokens)
3. **Stage-gated planning** — structured questions per stage, each stage gates the next
4. **Compaction I own** — target 30%, soft 50%, priority 60%. Hooks nudge, I decide.
5. **Linear sync** — bidirectional mapping, sync is the gate between planning and execution
6. **Living documentation** — stack, architecture, testing/deployment maintained in real-time
7. **Review/retro** — every project ends with validation, learnings flow to cross-project memory
8. **Git as memory leg** — branches, commits, PRs map 1:1 to projects and tasks

### Non-requirements (for now)
- Slack integration (future)
- Multi-user support (just Gautam)
- RAG/embedding-based retrieval (file-based is sufficient at our scale)

---

## Design (pending)

_To be filled during design stage_

---

## Engineering (pending)

_To be filled during engineering planning stage_
