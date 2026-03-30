# Pi Agent — Project Rules

This file is the single source of truth for how all agents operate in this repository. Read it in full before every session. Follow it without exception.

Adapted from OpenClaw post-mortem (PI-13, AI-627). Every rule exists because violating it has caused real failures.

---

## Hard Rules

1. **Do not install new dependencies without explicit approval.** If a task requires a new package, stop and ask.
2. **Do not refactor, rename, or restructure files outside the current task scope.** If something works, leave it alone.
3. **Do not add abstraction layers, wrapper classes, or helper files.** Write inline. Extract only when the same block has been copy-pasted 3+ times.
4. **Do not move files between directories.** The file tree is intentional. Reorganization requires explicit approval.
5. **Do not make changes beyond what was asked.** Fix what was scoped, nothing more.
6. **Do not generate tests unless explicitly asked.** When asked, write integration smoke tests, not unit tests for internals.

---

## Git Discipline

1. **Always branch. No exceptions.** Even one-line fixes. Branch off main, PR to merge.
2. **No project branches.** Linear projects are grouping only. Every change goes to main independently.
3. **Conventional branch naming.** Format: `type/description` (feat/, fix/, chore/, docs/, etc.)
4. **Conventional commits.** Format: `type(scope): description` referencing Linear issue.
5. **Every commit links to a Linear issue.** No orphan commits. The commit message is the enforcement.
6. **Keep branches short-lived.** One focused change per branch, merged within 1-2 sessions.
7. **Do not rebase or force-push shared branches.** Merge main into your branch if needed.

---

## Multi-Agent Boundaries

1. Each agent operates in its own Git worktree on its own branch.
2. No two agents may work in the same directory or on the same files simultaneously.
3. Before spawning a parallel agent, describe in one sentence the boundary between what each agent touches. If you can't draw that line, serialize the work.

---

## Process Safety (from post-mortem)

1. **No destructive git primitives in automation.** Every sync script uses dry-run first. Snapshots before destructive ops are mandatory.
2. **Serialized git access.** flock-based single-writer. No concurrent git operations.
3. **Process supervisor from day one.** launchd, not bash loops. Health check endpoint required before any service goes live.
4. **Deploy verification after merge.** Never call `gh pr merge` directly — verify local deployment after merge.
5. **Growth budgets enforced.** Pre-commit hooks reject oversized files. Memory files have line limits. Curation is automated.
6. **Single source of truth per concern.** One config file, one truth, version-controlled. No layered settings with complex merge semantics.

---

## Memory & Compaction

1. **Compaction threshold: target 30%, soft 50%, priority 60%.** I own the decision — hooks nudge, don't trigger.
2. **Checkpoint before compaction.** Write state.md + context.md before any context loss event.
3. **Everything in Linear.** Any commitment goes in Linear immediately. No exceptions.
4. **Living documentation.** Update docs in real-time during execution, not after.

---

## Communication

1. **Acknowledge every message** before starting work — response or reaction.
2. **One topic at a time.** Resolve before moving on.
3. **Sequential conversation flow.** No batching questions.
4. **Proactive updates.** Don't wait to be asked.
5. **When corrected, fix through action, not words.**

---

## Decision Log

Record every meaningful decision in the project's `decisions.md` before implementing. Date, category, decision, rationale. This forces articulation before action and gives future sessions the context to understand why.

---

## Guiding Principle

Simplicity is not a phase you grow out of. It is a discipline you maintain. Every file, every abstraction, and every dependency is a liability until proven otherwise. When in doubt, do less.
