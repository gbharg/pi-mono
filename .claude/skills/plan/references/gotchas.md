# Gotchas

Known failure points and how to handle them. Update this file when new edge cases are discovered.

## GOTCHA: EnterPlanMode is never called -- skill runs, plan mode never activates

**Symptom**: `/plan` starts the intake rounds and even produces a draft, but plan mode (the read-only guard) is never on. Edits can leak out mid-intake.
**Cause**: In Claude Code, `EnterPlanMode` and `ExitPlanMode` are **deferred tools** -- they're named in the per-session system-reminder but their JSON schemas are not loaded into context. Calling `EnterPlanMode` directly without loading first errors out with `InputValidationError`. Listing them in the skill's `allowed-tools` is necessary but not sufficient -- the schemas still have to be fetched at runtime. (Historical note: prior to ~2026-05, ToolSearch did not find these tools at all and they were treated as built-in conditional tools. That changed; ToolSearch now loads them.)
**Fix**: See SKILL.md Phase 0 ACTIVATE. Two calls, in order, before anything else: (1) `ToolSearch(query: "select:EnterPlanMode,ExitPlanMode", max_results: 2)` to load the schemas, then (2) `EnterPlanMode({})` to activate the guard. Do not narrate or call other tools between them.

---

## GOTCHA: Agent drafts the plan before asking clarification questions

**Symptom**: The plan is presented to the user with assumptions baked in, requiring multiple revision rounds that could have been avoided with upfront questions.
**Cause**: The agent skips the mandatory discovery phase (rounds of clarification questions) and jumps straight to drafting. The SKILL.md explicitly states "You MUST wait for user answers before drafting -- never skip ahead."
**Fix**: Always enter plan mode first (call `EnterPlanMode`), then ask clarification questions in successive rounds before drafting. Do not draft until you can do so with minimal assumptions on key decisions. The Quick Start section specifies at least 4 rounds of questions.

---

## GOTCHA: Plan file kept with random slug name instead of descriptive name

**Symptom**: The plan file is saved as `.claude/plans/kfhw9x2m.md` instead of `.claude/plans/claude:feature-name.md`, making it impossible to find later.
**Cause**: Plan files are initially created with random slugs by the system. The planning rules require immediate renaming, but agents sometimes forget.
**Fix**: Immediately rename the plan file to `.claude/plans/{agent}:{descriptive-slug}.md`. Create a symlink from the old random slug name for backward compatibility. The branch name must match: `feat/<plan-slug>`.

---

## GOTCHA: plan-progress.sh init not called after ExitPlanMode -- status line shows no plan

**Symptom**: Plan is approved and implementation begins, but the status line does not show plan progress or story completion status.
**Cause**: The status line integration requires three lifecycle calls. The `plan-progress.sh init <plan-file-path>` call after `ExitPlanMode` is missed, so the status line has no plan state to display.
**Fix**: After `ExitPlanMode`, run: `mkdir -p /tmp/claude/sessions/$PPID && echo "<agent>:<plan-slug>" > /tmp/claude/sessions/$PPID/active-plan && bash /Users/Work/openclaw/config/claude/hooks/plan-progress.sh init <plan-file-path>`. During implementation, update story status with `plan-progress.sh update US-001 in-progress` and `plan-progress.sh update US-001 done`.

---

## GOTCHA: "Task ID is required" error from TaskOutput

**Symptom**: `TaskOutput` returns `Error: Task ID is required` during orchestration.
**Cause**: Claude calls `TaskOutput` without the `task_id` parameter, or confuses it with `TaskGet`/`TaskUpdate`. This typically happens after context compaction when the agent ID from a background `Agent` call is lost.
**Fix**: Always pass `task_id` to `TaskOutput`. If the ID is lost after compaction, use `TaskList` to find active tasks. Never call `TaskOutput` speculatively — only when you have a known agent ID from a background `Agent` spawn. `TaskOutput` is for background agents, not for task-list tasks created with `TaskCreate`.

---

## GOTCHA: "No task found with ID" error from TaskOutput/TaskGet

**Symptom**: `TaskOutput` or `TaskGet` returns `Error: No task found with ID: <id>`.
**Cause**: The ID is stale (from before compaction or a previous session), or a `TaskCreate` ID was passed to `TaskOutput` (wrong tool — `TaskOutput` is for background agent IDs, not task-list IDs). Another cause: mixing up agent IDs and task IDs — they are separate systems.
**Fix**: Store agent IDs in task metadata immediately after spawning: `TaskUpdate(taskId: "t1", metadata: {"agentId": "a1"})`. Use `TaskList` to recover state after compaction. Never guess or reconstruct IDs.

---

## GOTCHA: ExitPlanMode called without explicit user approval

**Symptom**: The agent exits plan mode and begins implementation before the user has reviewed and approved the plan.
**Cause**: The agent interprets neutral responses ("ok", "I see", "continue") as approval, or auto-exits after presenting the plan. The SKILL.md states: "Never auto-approve. Only call ExitPlanMode when the user explicitly signals approval."
**Fix**: Wait for explicit approval signals: "looks good", "approved", "ship it", "let's go." Neutral acknowledgments are not approval. If unsure, ask: "Does this plan look good to proceed with, or would you like changes?"

---

## GOTCHA: Review child skill not read before running review

**Symptom**: The review phase produces generic feedback instead of following the structured review methodology (e.g., no 7-pass design rating, no test diagram).
**Cause**: The agent runs the review from memory of the parent SKILL.md summary instead of reading the child skill file. Each child skill has detailed methodology (passes, rating systems, question formats) that the parent only summarizes.
**Fix**: In Phase 3, always `Read` the child SKILL.md file before running that review. The parent gives trigger conditions and expected outputs; the child gives the actual methodology.

---

## GOTCHA: All reviews run on a simple 2-file change

**Symptom**: A simple bug fix triggers strategy review, design review, AND engineering review, taking 30 minutes for what should be a 5-minute plan.
**Cause**: The thoroughness auto-calibration was overridden or ignored. Strategy review should only trigger for deep thoroughness (9+ files, new services, 6+ stories, product direction changes).
**Fix**: Check the thoroughness signals table in Phase 1. For minimal thoroughness (1-2 files), only run an abbreviated engineering review. Do NOT run strategy or design reviews unless explicitly requested by the user.

---

## GOTCHA: Execution proposal missing for 3+ story plan

**Symptom**: Plan is approved with 5 stories but no execution strategy is proposed. The user has to manually decide how to run the work.
**Cause**: Phase 6 was skipped — often because the agent went straight from approval to implementation without the execution proposal step.
**Fix**: Phase 6 (Execute) must always run after Phase 5 (Approve) for plans with 2+ stories. Auto-propose from the decision tree. Solo is only acceptable for 1 story.

---

## GOTCHA: /plan resume finds completed plans

**Symptom**: `/plan resume` offers to resume a plan that was already shipped and merged.
**Cause**: The plan file exists but doesn't have a `## References` section (which is appended by `/done` on completion).
**Fix**: `/plan resume` filters by checking for `## References` section. If a plan was completed but `/done` wasn't run, manually add `## References` to mark it complete, or delete the plan file.
