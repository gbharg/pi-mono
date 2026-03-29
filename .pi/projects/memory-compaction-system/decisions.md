# Decisions Log — Memory & Compaction System

## 2026-03-29 — Initial shaping session (iMessage)

### D1: Unified memory system
- **Decision**: One system for both compaction and restart recovery
- **Why**: From Gautam's perspective, context loss is context loss regardless of cause. Implementation detail should be hidden.

### D2: Project-based organization
- **Decision**: Memory organized around projects, not days or individual decisions
- **Why**: Projects have natural lifecycles (plan → execute → ship → close) and map cleanly to Linear, branches, and PRs.

### D3: Embedded project structure
- **Decision**: All artifacts in one project folder, not separated by type
- **Why**: Opening one folder should give the complete picture. Separated structure fragments context.

### D4: Compaction ownership
- **Decision**: Pi (me) owns compaction decisions. Hooks are nudges, not triggers.
- **Why**: Mechanical triggers can fire at the wrong time. Agent judgment on what to keep/drop produces better summaries.
- **Thresholds**: Target 30%, soft ceiling 50%, priority ceiling 60%
- **At 60%**: Top priority to compact, but still my call on the summary

### D5: Linear as Gautam's source of truth
- **Decision**: Linear and local files mirror each other. Sync is the gate between planning and execution.
- **Why**: Gautam can't ls the file system. Linear is his window. Neither system should have state the other doesn't.

### D6: Stages build on each other
- **Decision**: Planning stages accumulate into output docs (PRD grows through brief → scope → design → eng). Not one file per stage.
- **Why**: Separate files per stage creates duplication and fragmentation.

### D7: Living documentation
- **Decision**: Stack, architecture, file structure, testing/deployment docs maintained in real-time during execution.
- **Why**: "Document later" creates debt. Real-time docs are cheap when you're already doing the work.

### D8: Review/retro closes the loop
- **Decision**: Every project ends with a review doc. Learnings flow to cross-project memory.
- **Why**: Without it, learnings die with the session or compaction.

### D9: Compaction is about decision quality
- **Decision**: Compaction exists to keep Pi sharp, not to save tokens.
- **Why**: Bloated context degrades planning quality, which multiplies downstream into every agent Pi directs.

### D10: Structured planning questions
- **Decision**: Each planning stage should use 10-15 structured interactive questions with options, trade-offs, and recommendations (gstack pattern).
- **Why**: Ad-hoc planning leads to skipped topics and jumping around. Structured questions ensure systematic coverage.
