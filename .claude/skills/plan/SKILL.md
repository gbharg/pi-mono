---
name: plan
description: "Enter plan mode to design, review, and execute implementation plans. Front-loads all strategic, design, engineering, and QA questions into intake for 100% alignment before drafting."
user-invocable: true
allowed-tools: ["EnterPlanMode", "ExitPlanMode", "AskUserQuestion", "Agent", "Read", "Grep", "Glob", "Bash", "TaskCreate", "TaskUpdate", "TaskList", "TaskGet"]
version: v3.2.0
---

# /plan — Unified Planning Skill

This skill IS the canonical plan mode behavior for Claude Code. It consolidates the built-in plan agent, `EnterPlanMode`/`ExitPlanMode` tools, and `AskUserQuestion` into a single workflow. When a Plan subagent is spawned or plan mode is entered for any reason, this skill's structure applies.

Design, review, and execute implementation plans in one flow.
Front-loads all CEO, design, engineering, and QA questions into intake — scope everything before writing a single line of plan.

## 7-Phase Workflow

```
ACTIVATE → INTAKE → DRAFT → REVIEW → ITERATE → APPROVE → EXECUTE → VALIDATE
```

---

## Phase 0: ACTIVATE — Enter Plan Mode FIRST

**This phase is non-negotiable and must run before any other text, question, or tool call in this skill.** The whole point of `/plan` is to design under the read-only guard. Skipping this means edits can leak out mid-intake.

### Claude Code (this harness)

`EnterPlanMode` and `ExitPlanMode` are **deferred tools** — they're listed in the per-session system-reminder by name but their JSON schemas are not loaded into context. Calling `EnterPlanMode` directly without loading first errors out with `InputValidationError`. Listing them in this skill's `allowed-tools` is necessary but not sufficient — the schemas still have to be fetched.

Do these two calls, in order, before anything else:

1. **Load the schemas** in one ToolSearch call:
   ```
   ToolSearch(query: "select:EnterPlanMode,ExitPlanMode", max_results: 2)
   ```
2. **Immediately call** `EnterPlanMode` with empty parameters: `EnterPlanMode({})`. This activates the read-only guard. Do not narrate, do not ask questions, do not call other tools between the ToolSearch and the EnterPlanMode call.

After `EnterPlanMode` returns, proceed to Phase 1 INTAKE. `AskUserQuestion` works inside or outside plan mode — plan mode is for the read-only guard, not for enabling questions.

If `ToolSearch` returns no match or `EnterPlanMode` errors after loading (e.g., harness has changed again, or you are running under a sub-agent type like `Plan` where the tool is excluded), fall back to announcing "Entering plan mode" in text and proceed — but do not silently skip the attempt.

### Codex / Gemini / Cursor

Announce "Entering plan mode" in text. There is no tool to call; the read-only guard is convention only. Then proceed to Phase 1.

---

## Prime Directives

These govern every plan. Non-negotiable.

1. **Zero silent failures.** Every failure mode must be visible — to the system, to the team, to the user. If a failure can happen silently, that is a critical defect in the plan.
2. **Every error has a name.** Don't say "handle errors." Name the specific exception class, what triggers it, what catches it, what the user sees, and whether it's tested. Catch-all error handling is a code smell.
3. **Data flows have shadow paths.** Every data flow has a happy path and three shadow paths: nil input, empty/zero-length input, and upstream error. Trace all four for every new flow.
4. **Interactions have edge cases.** Every user-visible interaction has edge cases: double-click, navigate-away-mid-action, slow connection, stale state, back button. Map them.
5. **Observability is scope, not afterthought.** Logging, metrics, alerts, and dashboards are first-class deliverables, not post-launch cleanup.
6. **Diagrams are mandatory.** No non-trivial flow goes undiagrammed. ASCII art for every new data flow, state machine, pipeline, dependency graph, and decision tree.
7. **Everything deferred must be written down.** Vague intentions are lies. TODOS.md or it doesn't exist.
8. **Optimize for the 6-month future, not just today.** If this plan solves today's problem but creates next quarter's nightmare, say so explicitly.
9. **Permission to say "scrap it and do this instead."** If there's a fundamentally better approach, table it. Better to hear it now.

## Cognitive Patterns — How to Think During Planning

These are not checklist items. They are thinking instincts that shape how you evaluate every aspect of the plan. Internalize them; don't enumerate them.

### Strategic Thinking (from great CEOs)
1. **Classification instinct** — Categorize every decision by reversibility x magnitude (Bezos one-way/two-way doors). Most things are two-way doors; move fast.
2. **Paranoid scanning** — Continuously scan for strategic inflection points, cultural drift, process-as-proxy disease (Grove).
3. **Inversion reflex** — For every "how do we win?" also ask "what would make us fail?" (Munger).
4. **Focus as subtraction** — Primary value-add is what to *not* do. Default: do fewer things, better (Jobs).
5. **Speed calibration** — Fast is default. Only slow down for irreversible + high-magnitude decisions. 70% information is enough to decide (Bezos).
6. **Proxy skepticism** — Are our metrics still serving users or have they become self-referential? (Bezos Day 1).
7. **Narrative coherence** — Hard decisions need clear framing. Make the "why" legible, not everyone happy.
8. **Temporal depth** — Think in 5-10 year arcs. Apply regret minimization for major bets.
9. **Willfulness as strategy** — Be intentionally willful. The world yields to people who push hard enough in one direction for long enough (Altman).
10. **Leverage obsession** — Find the inputs where small effort creates massive output. Technology is the ultimate leverage (Altman).

### Engineering Thinking (from great eng managers)
11. **Boring by default** — "Every company gets about three innovation tokens." Everything else should be proven technology (McKinley).
12. **Incremental over revolutionary** — Strangler fig, not big bang. Canary, not global rollout. Refactor, not rewrite (Fowler).
13. **Systems over heroes** — Design for tired humans at 3am, not your best engineer on their best day.
14. **Reversibility preference** — Feature flags, A/B tests, incremental rollouts. Make the cost of being wrong low.
15. **Essential vs accidental complexity** — Before adding anything: "Is this solving a real problem or one we created?" (Brooks).
16. **Make the change easy, then make the easy change** — Refactor first, implement second. Never structural + behavioral changes simultaneously (Beck).

### Design Thinking (from great designers)
17. **Seeing the system, not the screen** — Never evaluate in isolation; what comes before, after, and when things break.
18. **Empathy as simulation** — Run mental simulations: bad signal, one hand free, first time vs 1000th time.
19. **Hierarchy as service** — Every decision answers "what should the user see first, second, third?"
20. **Constraint worship** — Limitations force clarity. "If I can only show 3 things, which 3 matter most?"
21. **Edge case paranoia** — What if the name is 47 chars? Zero results? Network fails? Colorblind? RTL?
22. **Subtraction default** — "As little design as possible" (Rams). If a UI element doesn't earn its pixels, cut it.
23. **Design for trust** — Every interface decision either builds or erodes user trust. Pixel-level intentionality.
24. **Storyboard the journey** — Before touching pixels, storyboard the full emotional arc (Gebbia).

## Engineering Preferences (hardcoded)

Apply these to every plan. Do not ask about them — they are stable.

- **DRY is important** — flag repetition aggressively.
- **Well-tested code is non-negotiable** — rather have too many tests than too few.
- **"Engineered enough"** — not under-engineered (fragile, hacky) and not over-engineered (premature abstraction).
- **Thoughtfulness > speed** — err on the side of handling more edge cases, not fewer.
- **Explicit > clever** — bias toward readable, obvious code.
- **Minimal diff** — achieve the goal with the fewest new abstractions and files touched.
- **Observability is not optional** — new codepaths need logs, metrics, or traces.
- **Security is not optional** — new codepaths need threat modeling.
- **ASCII diagrams liberally** — in plans, code comments, and design docs.

---

## Phase 1: INTAKE — The Interrogation

**Precondition:** Phase 0 ACTIVATE has already entered plan mode. If it has not — stop and run Phase 0 now.

The goal of intake is **100% alignment on all assumptions, expectations, and requirements** before drafting. Every question that CEO review, design review, or eng review would ask gets asked NOW — not after the plan is written.

Ask questions **ONE AT A TIME** using `AskUserQuestion`. Never batch. Wait for each answer before proceeding. Once scope detection determines which rounds apply, run ALL of them — no skip option.

### Agent Detection

Detect the running agent and adapt interaction style:

- If `AskUserQuestion` tool is available → Claude Code mode (structured questions)
- Otherwise → plain text mode (numbered questions, "Please answer before I continue")

| Capability | Claude Code | Codex / Gemini / Cursor |
|------------|-------------|--------------------------|
| Plan mode | `EnterPlanMode` tool — load via ToolSearch first (see Phase 0). Mandatory, not optional. | Text: "Entering plan mode" |
| Questions | `AskUserQuestion` (via skill `allowed-tools`) | Numbered text questions |
| Plan approval | `ExitPlanMode` tool | "Approved? (yes/no)" |
| Linear | MCP `save_issue` tool | `gh` CLI or skip |
| Sub-agents | `Agent` tool | Save proposal only |
| Status line | `plan-progress.sh` | Skip (not available) |

### Round 1: Basics

Collect these before anything else — no exceptions:

1. **What are you building?** Goal + problem statement. If already described, confirm understanding.
2. **Linear issue?** Existing `AI-XXX` | create new | skip tracking
3. **Branch strategy?** Auto-create `feat/<slug>` | use existing branch | create worktree

### Scope Detection

After Round 1, auto-detect scope signals to determine which interrogation rounds to run:

| Signal | Rounds triggered |
|--------|-----------------|
| 1-2 files, simple change | Basics + abbreviated Engineering |
| 3-8 files, standard feature | Basics + Strategy + Engineering |
| UI components involved | + Design round |
| New service/API/data model | + full Strategy + full Engineering + Deployment |
| 9+ files or 3+ new abstractions | All rounds, deep |
| 6+ stories expected | All rounds, deep + council option |
| User says "grill me" or "deep" | All rounds, no shortcuts |

Announce which rounds you'll run: "Based on scope, I'll run Strategy, Architecture, Design, Testing, and Deployment rounds."

Once rounds are determined, run ALL of them. No skipping.

### Round 2: Strategy (from CEO review)

**Purpose:** Ensure we're solving the right problem the right way.

Ask these one at a time:

1. **Is this the right problem?** Could a different framing yield a simpler or more impactful solution? What happens if we do nothing — real pain or hypothetical? (Apply: inversion reflex, proxy skepticism)
2. **What already exists?** What existing code partially or fully solves sub-problems? Can we capture outputs from existing flows rather than building parallel ones? (Apply: focus as subtraction)
3. **Dream state:** Where should this system be in 12 months? Does this plan move toward or away from that state?
   ```
   CURRENT STATE → THIS PLAN → 12-MONTH IDEAL
   ```
4. **Implementation alternatives:** Present 2-3 distinct approaches. One must be "minimal viable" (smallest diff), one must be "ideal architecture" (best long-term). For each: effort (S/M/L), risk, pros/cons. Recommend one. (Apply: classification instinct — one-way vs two-way door)
5. **Scope mode:** Present four options:
   - **A) SCOPE EXPANSION** — dream big, propose the ambitious version, user opts into each expansion
   - **B) SELECTIVE EXPANSION** — hold scope as baseline, surface expansion opportunities for cherry-picking
   - **C) HOLD SCOPE** — make it bulletproof, no expansions
   - **D) SCOPE REDUCTION** — strip to bare minimum

   Context-dependent defaults: greenfield → A, enhancement → B, bug fix → C, refactor → C, >15 files → D.

6. **Temporal interrogation:** What decisions will need to be made during implementation? Surface ambiguities NOW:
   ```
   HOUR 1 (foundations): What does the implementer need to know?
   HOUR 2-3 (core logic): What ambiguities will they hit?
   HOUR 4-5 (integration): What will surprise them?
   HOUR 6+ (polish/tests): What will they wish they'd planned for?
   ```

### Round 3: Architecture & Engineering (from eng review)

**Purpose:** Lock in the technical approach and catch every landmine.

Ask these one at a time:

1. **Complexity check:** If touching >8 files or introducing >2 new abstractions, challenge: can the same goal be achieved with fewer moving parts? What's the minimum set of changes? (Apply: essential vs accidental complexity)
2. **Architecture:** Component boundaries, dependency graph, coupling concerns. Draw ASCII dependency diagram. For each new integration point: describe one realistic production failure and whether the plan accounts for it. (Apply: boring by default, systems over heroes)
3. **Data flow:** For every new data flow, trace all four paths (Prime Directive #3):
   - Happy path (data flows correctly)
   - Nil path (input is nil/missing)
   - Empty path (input present but empty/zero-length)
   - Error path (upstream call fails)
4. **Security & threat model:** New attack vectors? Input validation? Authorization scoping? Secrets handling? Injection vectors (SQL, command, template, LLM prompt)?
5. **Error handling:** For every new method/service that can fail — what can go wrong, what exception class, is it rescued, what does the user see? (Prime Directive #2: every error has a name)
   ```
   METHOD/CODEPATH      | WHAT CAN GO WRONG       | EXCEPTION CLASS  | RESCUED? | USER SEES
   ---------------------|-------------------------|------------------|----------|----------
   ```
6. **Edge cases:** For every new user-visible interaction (Prime Directive #4):
   - Double-click submit? Navigate away mid-action? Retry while in-flight?
   - Zero results? 10,000 results? Results change mid-page?
   - Stale state? Back button? Slow connection?
7. **Performance:** N+1 queries? Memory concerns? Caching opportunities? Slow codepaths? Connection pool pressure?
8. **Observability:** What metric tells you it's working? What tells you it's broken? Structured logging at entry/exit/branch? Trace IDs for cross-service flows? What alerts should exist day 1? (Prime Directive #5)

### Round 3.5: Expansion Ceremony (if EXPANSION or SELECTIVE EXPANSION mode)

Now that architecture is understood, run the expansion ceremony with technical cost context:

**For SCOPE EXPANSION:**
1. **10x check:** What's the version that's 10x more ambitious and delivers 10x more value for 2x the effort?
2. **Platonic ideal:** If the best engineer had unlimited time and perfect taste, what would this system look like?
3. **Delight opportunities:** What adjacent 30-minute improvements would make this feature sing? List at least 5.
4. Present each expansion as its own AskUserQuestion with effort estimate informed by Round 3 architecture. Recommend enthusiastically. Options: A) Add to scope, B) Defer to TODOS.md, C) Skip.

**For SELECTIVE EXPANSION:**
1. Surface expansion opportunities with neutral recommendation posture.
2. Present each as its own AskUserQuestion with effort and risk. Let user cherry-pick.

Accepted items become plan scope. Rejected items go to NOT-in-scope.

### Round 4: Design (from design review)

**Skip if no UI scope.** Announce: "No UI scope — skipping design round."

Uses the **0-10 rating method**: Rate the user's description on each dimension, explain what a 10 looks like, then ask what to add.

Ask these one at a time:

1. **Information architecture** (rate 0-10): What does the user see first, second, third on each screen? If everything competes for attention, nothing wins. (Apply: hierarchy as service, constraint worship)
2. **Interaction state coverage** (rate 0-10): For each UI feature, specify:
   ```
   FEATURE      | LOADING | EMPTY | ERROR | SUCCESS | PARTIAL
   -------------|---------|-------|-------|---------|--------
   ```
   Empty states are features — specify warmth, primary action, context. "No items found." is not a design.
3. **User journey & emotional arc** (rate 0-10): Storyboard the experience:
   ```
   STEP | USER DOES        | USER FEELS      | PLAN SPECIFIES?
   -----|------------------|-----------------|----------------
   ```
   Apply time-horizon design: 5-sec visceral, 5-min behavioral, 5-year reflective. (Apply: storyboard the journey)
4. **AI slop risk** (rate 0-10): Does the plan describe specific, intentional UI — or generic patterns? "Cards with icons" → what differentiates from every SaaS template? "Clean, modern UI" → meaningless. Replace with actual decisions. (Apply: subtraction default)
5. **Design system alignment** (rate 0-10): Does a DESIGN.md exist? If not, flag. Do planned components fit the existing vocabulary?
6. **Responsive & accessibility** (rate 0-10): Mobile/tablet specs? Keyboard nav? Screen readers? Touch targets (44px min)? Color contrast? Not "stacked on mobile" — intentional layout per viewport.
7. **Unresolved design decisions:** Surface ambiguities that will haunt implementation:
   ```
   DECISION NEEDED              | IF DEFERRED, WHAT HAPPENS
   -----------------------------|---------------------------
   What does empty state look like? | Engineer ships "No items found."
   Mobile nav pattern?          | Desktop nav hides behind hamburger
   ```

Present overall design completeness score at end of round.

### Round 5: Testing & QA (from eng review + QA skill)

**Purpose:** Define what "done" looks like and how we'll verify it.

Ask these one at a time:

1. **Test diagram:** Map every new thing the plan introduces:
   ```
   NEW UX FLOWS: [list each]
   NEW DATA FLOWS: [list each]
   NEW CODEPATHS: [list each new branch/condition]
   NEW BACKGROUND JOBS: [list each]
   NEW INTEGRATIONS: [list each external call]
   NEW ERROR/RESCUE PATHS: [list each]
   ```
   For each: what type of test covers it (unit/integration/E2E)? What's the happy path test? Failure path? Edge case?
2. **Test ambition:** For each new feature:
   - What test would make you confident shipping at 2am on a Friday?
   - What test would a hostile QA engineer write to break this?
   - What's the chaos test?
3. **QA strategy:** How will we verify this after implementation?
   - What pages/routes are affected?
   - What interactions need browser testing?
   - What's the health score baseline before this change?
   - Regression mode: is there a prior QA baseline to diff against?
4. **Failure modes registry:** For each new codepath:
   ```
   CODEPATH | FAILURE MODE | RESCUED? | TEST? | USER SEES? | LOGGED?
   ---------|-------------|----------|-------|------------|--------
   ```
   Any row with RESCUED=N, TEST=N, USER SEES=Silent → **CRITICAL GAP**. Resolve before drafting.

### Round 6: Deployment & Rollout (from CEO review)

**Skip for minimal thoroughness or memory-only plans.**

Ask these one at a time:

1. **Migration safety:** New DB migrations backward-compatible? Zero-downtime? Table locks?
2. **Feature flags:** Should any part be behind a feature flag? (Apply: reversibility preference)
3. **Rollout order:** Correct sequence? Old code and new code running simultaneously — what breaks?
4. **Rollback plan:** If this ships and immediately breaks — git revert? Feature flag? DB rollback? How long?
5. **Post-deploy verification:** First 5 minutes? First hour? Smoke tests?

### Intake Completion

After all rounds, present a summary:

```
+====================================================================+
|              INTAKE SUMMARY                                         |
+====================================================================+
| Problem         | [confirmed problem statement]                     |
| Approach        | [chosen implementation alternative]               |
| Scope mode      | [EXPANSION/SELECTIVE/HOLD/REDUCTION]               |
| Thoroughness    | [minimal/standard/deep]                           |
| UI scope        | [yes/no]                                          |
| Design score    | [N/10 across N dimensions]                        |
| Files affected  | ~[N]                                              |
| Stories est.    | ~[N]                                              |
| Key decisions   | [N] made, [N] deferred                            |
| Critical gaps   | [N] (must resolve before draft)                   |
| Expansions      | [N] accepted, [N] deferred (if applicable)        |
| NOT in scope    | [N] items                                          |
+====================================================================+
```

**Resolve all critical gaps before proceeding to Phase 2.** If any remain, ask about each one.

### Template Detection

Check if the task matches a common pattern and offer templates:

| Pattern | Trigger words | Template |
|---------|--------------|----------|
| API endpoint | "endpoint", "API", "route", "REST", "handler" | `references/templates/api-endpoint.md` |
| UI feature | "component", "page", "UI", "frontend", "modal", "form" | `references/templates/ui-feature.md` |
| Feature spec | "feature", "build", "full-stack", "end-to-end", "new capability" | `references/templates/feature-spec.md` |
| Refactor | "refactor", "restructure", "clean up", "reorganize" | `references/templates/refactor.md` |
| Bug fix | "bug", "fix", "broken", "regression", "error" | `references/templates/bug-fix.md` |
| Design change | "design", "redesign", "visual", "spacing", "typography", "a11y" | `references/templates/design-change.md` |
| Infrastructure | "infra", "deploy", "CI", "config", "service", "monitoring" | `references/templates/infrastructure.md` |
| Integration | "integrate", "third-party", "webhook", "OAuth", "API client" | `references/templates/integration.md` |
| Orchestration | "multi-agent", "council", "parallel models", "cross-review" | `references/templates/orchestration.md` |
| Hardening | "quality gate", "audit", "harden", "eval", "threshold" | `references/templates/hardening.md` |
| Plugin system | "plugin", "extension", "hook system", "extensible" | `references/templates/plugin-system.md` |
| Batch experiment | "batch", "experiment", "autoresearch", "sweep", "benchmark" | `references/templates/batch-experiment.md` |

---

## Resume Mode (`/plan resume`)

When invoked with `/plan resume` (or `/plan resume <slug>`):

### Discovery

1. Scan `.claude/plans/` for plan files sorted by modification time (newest first)
2. Filter out completed plans (those containing a `## References` section)
3. If `<slug>` provided, match against plan filenames (partial match OK)
4. If no incomplete plans found, tell the user and offer `/plan` to start fresh

### Present State

For the selected plan:
1. Read the plan file and parse frontmatter (`branch`, `linear_issue`, `thoroughness`, `reviews`)
2. Check branch state: `git branch --list feat/<slug>` — does the branch still exist?
3. Check story status: look for `[x]` vs `[ ]` in acceptance criteria, or `plan-progress.sh` state
4. Present summary:
   ```
   RESUMING: <plan title>
   Branch:   feat/<slug> [exists/missing]
   Linear:   AI-XXX [status]
   Stories:  X/Y complete

   Remaining:
     US-003: <title> — not started
     US-004: <title> — not started
   ```
5. Ask: continue with existing execution strategy, or modify?

### On Continue

1. Enter plan mode (`EnterPlanMode`)
2. Check out the feature branch if it exists: `git checkout feat/<slug>`
3. Initialize status line with remaining stories
4. Resume execution from the first incomplete story

---

## Phase 2: DRAFT

The draft is informed by ALL intake answers. It should contain zero assumptions — every decision was made in Phase 1.

1. **Write plan file** to `.claude/plans/{agent}:{descriptive-slug}.md`
   - Rename random slugs immediately. Symlink old name for backward compat.

2. **Frontmatter:**
   ```yaml
   ---
   agent: claude          # or codex, gemini, cursor
   branch: feat/<slug>
   session_id: <UUID>
   linear_issue: <AI-XXX or "pending">
   created_at: <ISO 8601>
   thoroughness: <minimal|standard|deep>
   scope_mode: <expansion|selective|hold|reduction>
   design_score: <N/10>
   ---
   ```

3. **Plan sections** (include based on thoroughness):

   **All plans (minimal+):**
   - Context (problem + why now — from Round 2 premise challenge)
   - Scope (in-scope + NOT-in-scope — from scope mode decisions)
   - What Already Exists (from Round 2 existing code leverage)
   - User Stories (US-XXX with Description + verifiable Acceptance Criteria)
   - Story Map (dependency graph)

   **Standard+:**
   - Implementation Approach (chosen alternative from Round 2, with rejected alternatives noted)
   - Error & Rescue Registry (from Round 3 error handling)
   - Testing & Validation (from Round 5 test diagram)
   - QA Strategy (pages/routes, interactions, health score baseline)
   - Future Recommendations (FR-XXX with priority)
   - GitHub Workflow (branch, commit format, PR)
   - Rollback plan (from Round 6)

   **Deep:**
   - ASCII diagrams (data flow with all 4 paths, state machines, dependencies)
   - Failure Modes Registry (from Round 5, with CRITICAL GAP flags)
   - Security & Threat Model (from Round 3)
   - Interaction State Tables (from Round 4)
   - User Journey Storyboard (from Round 4)
   - Design Scores per Dimension (from Round 4)
   - Performance Considerations (from Round 3)
   - Observability Plan (from Round 3)
   - Deployment Sequence (from Round 6)
   - Dream State Delta (current → plan → 12-month ideal)
   - Expansion Decisions (accepted/deferred/skipped — from Round 3.5)
   - Execution Strategy (pre-filled, refined in Phase 6)

4. **User Story format:**
   ```
   ### US-XXX: [Title]
   **Description:** [1-2 sentences: what + why]
   **Acceptance Criteria:**
   1. [Specific, verifiable condition]
   2. [Specific, verifiable condition]
   3. Typecheck/lint passes.
   ```

5. **Present the FULL plan text inline.** Never say "see the plan file." Show every word.

6. **Write test plan artifact** for `/qa` consumption:
   ```bash
   source <(~/.claude/skills/gstack/bin/gstack-slug 2>/dev/null) && mkdir -p ~/.gstack/projects/$SLUG
   ```
   Write to `~/.gstack/projects/{slug}/{user}-{branch}-test-plan-{datetime}.md`

### Council Mode (optional, deep thoroughness)

When thoroughness is "deep" AND the task involves architecture decisions or 6+ stories, offer council mode:

**Trigger conditions** (any of these):
- Deep thoroughness auto-detected (9+ files, 3+ new abstractions)
- 6+ stories in the plan
- User explicitly requests: `/plan council`, "use council", "get multiple opinions"

**How it works:**
1. Ask: "This is a complex plan. Want 3 frontier models (Claude, Gemini, Codex) to independently draft it, then cross-review? Or should I draft solo?"
   - **A) Council mode** — 3 models draft independently, cross-review, synthesize best ideas
   - **B) Solo draft** — I'll draft it myself (faster, less token cost)

2. If council mode selected:
   ```bash
   COUNCIL_AVAILABLE=0
   for cmd in claude codex gemini; do
     command -v $cmd >/dev/null 2>&1 && COUNCIL_AVAILABLE=$((COUNCIL_AVAILABLE + 1))
   done
   ```

   - If 2+ CLIs available: delegate to `council:plan`
   - If < 2 CLIs: warn and fall back to solo draft

3. Read council output, present as the Phase 2 draft

**Skip conditions:**
- Minimal or standard thoroughness → solo draft (don't offer council)
- Non-Claude agents (Codex/Gemini/Cursor) → always solo

---

## Phase 3: REVIEW (council for deep, self-validate for standard)

### Deep thoroughness: Council Review

Spawn a 3-model council to independently review the draft:

```bash
bash ~/openclaw/skills/council/scripts/council.sh \
  --mode review \
  --task "Review this plan for: logical gaps, unstated assumptions, missing error handling, overcomplexity, feasibility risks, missing dependencies" \
  --input <plan-file-path> \
  --output /tmp/council-review.md
```

If council unavailable (< 2 CLIs), fall back to self-validation.

Present council findings. For each issue raised by 2+ models, ask user to resolve via AskUserQuestion.

### Standard thoroughness: Self-Validation

Verify the draft accurately captures all intake decisions:
- Does the draft match the chosen implementation approach?
- Are all scope decisions reflected?
- Is the Error & Rescue Registry complete?
- Are all four data flow paths traced?
- Zero CRITICAL GAPS in Failure Modes Registry?
- Test diagram maps to acceptance criteria?
- QA strategy section present?

If gaps found → return to relevant intake round to resolve, then update draft.

### Minimal thoroughness: Skip

Proceed directly to Phase 4.

---

## Phase 4: ITERATE

- User reviews plan after review/validation
- Changes → update plan → re-present FULL plan
- If changes affect a reviewed section → re-validate
- Continue until explicit approval

**Never auto-approve.** Only proceed to Phase 5 on explicit signal: "looks good", "approved", "ship it". Neutral acknowledgments ("ok", "I see") are NOT approval.

---

## Phase 5: APPROVE

On explicit approval:

1. `ExitPlanMode` (Claude Code) or "Plan approved" (others)

2. **Linear parent issue** (if tracking enabled):
   ```
   save_issue(title, team: "OpenClaw", state: "In Progress",
              labels: ["Feature"], description: context + scope + story titles)
   ```

3. **Sub-issues per story** (skip for 1-2 story trivial plans):
   - Title: `[US-XXX] <Story title>`
   - Wave 2 stories: `blockedBy: [Wave 1 IDs]`

4. **FR backlog issues** (standalone, not sub-issues)

5. **Feature branch + draft PR:**
   ```bash
   git checkout -b feat/<plan-slug>
   git push -u private feat/<plan-slug>
   gh pr create --draft --title "feat: [AI-XXX] <title>" --body "..."
   ```

6. **Status line init** (Claude Code only):
   ```bash
   mkdir -p /tmp/claude/sessions/$PPID
   echo "<agent>:<plan-slug>" > /tmp/claude/sessions/$PPID/active-plan
   bash ~/.claude/skills/plan/hooks/plan-progress.sh init <plan-file-path>
   ```

---

## Phase 6: EXECUTE

Auto-propose execution strategy:

| Stories | Deps | Strategy | Models |
|---------|------|----------|--------|
| 1 | — | Solo | This session |
| 2 | independent | Parallel sub-agents | Sonnet workers |
| 2 | sequential | Sequential chain | This session |
| 3-5 | independent | Parallel sub-agents | Sonnet (worktree) |
| 3-5 | mixed | Waves | Wave 1 parallel, Wave 2 after |
| 6+ | independent | Ralph swarm | ralph.sh --parallel |
| 6+ | mixed | Ralph waves | ralph.sh --distribute |
| Any | deliberation | Council first | council:plan |

Present proposal: strategy, models, parallelism, isolation, dependency ordering, permission mode.

**Options:**
- **A) Execute now** — spawn agents
- **B) Modify strategy** — adjust parameters
- **C) Execute later** — save proposal to plan file

### Orchestration (when executing)

1. `TaskCreate` for each story BEFORE spawning agents
2. Spawn with `isolation: "worktree"` for code, `mode: "bypassPermissions"` for workers
3. Store agent IDs: `TaskUpdate(taskId, metadata: {agentId})`
4. Track: `plan-progress.sh update US-XXX in-progress|done`
5. On completion: `plan-progress.sh clear`

### Surviving Context Compaction

- Create tasks BEFORE spawning → TaskList survives compaction
- Store agent IDs in task metadata immediately
- Use TaskList to recover if IDs are lost
- Never guess IDs

---

## Phase 7: VALIDATE (post-execution QA)

After all stories are implemented, auto-run validation before shipping.

### 7A: Automated Checks

```bash
pnpm check    # typecheck
pnpm test     # tests
```

If either fails → fix before proceeding.

### 7B: QA Testing (auto-invoked)

Automatically invoke `/qa` in diff-aware mode scoped to the branch:

1. **Load test plan artifact** from Phase 2
2. **Run `/qa`** on affected pages/routes (diff-aware: `git diff main...HEAD --name-only`)
3. **Compare against baseline** if regression mode was specified during intake
4. **Fix critical + high issues** inline (atomic commits per fix)
5. **Document results** in the plan file

If no UI scope AND no user-visible behavior changes: skip browser QA, run automated checks only.

### 7C: Acceptance Criteria Verification

Walk through every US-XXX acceptance criterion:
- Mark each as [x] verified or [ ] failed
- For failures: fix or note why deferred
- All criteria must pass before shipping

### 7D: Validation Summary

```
+====================================================================+
|              VALIDATION SUMMARY                                     |
+====================================================================+
| Typecheck      | PASS / FAIL                                       |
| Tests          | PASS / FAIL (N tests)                             |
| QA health      | [score] or "skipped (no UI)"                      |
| QA issues      | N found, N fixed, N deferred                      |
| Acceptance     | N/N criteria verified                              |
| Ship ready?    | YES / NO (reasons)                                |
+====================================================================+
```

---

## Status Line Integration

The status line dynamically shows plan progress, running agents, and story completion:

### On Plan Approval (after ExitPlanMode)
```bash
mkdir -p /tmp/claude/sessions/$PPID
echo "<agent>:<plan-slug>" > /tmp/claude/sessions/$PPID/active-plan
bash ~/.claude/skills/plan/hooks/plan-progress.sh init <plan-file-path>
```

### During Implementation
```bash
bash ~/.claude/skills/plan/hooks/plan-progress.sh update US-001 in-progress
bash ~/.claude/skills/plan/hooks/plan-progress.sh update US-001 done
```

### On Plan Completion
```bash
bash ~/.claude/skills/plan/hooks/plan-progress.sh clear
```

Sub-agent tracking is automatic via `agent-tracker.sh` hook.

---

## Plan File Management

- **Naming:** `.claude/plans/{agent}:{slug}.md` — branch: `feat/<slug>`
- **Session linkage:** frontmatter `session_id` + `/done` appends References section
- **Commits:** `feat: [AI-XXX] [US-YYY] description`
- **One feature per branch, one branch per PR**
- **Child skills** (`children/strategy/`, `children/design/`, `children/review/`) remain for backward compat and standalone invocation. /plan no longer delegates to them — all content is front-loaded into intake.

### Consolidated Plan Document

All plans are appended to a single consolidated document for searchability and cross-plan awareness:

**File:** `.claude/plans/PLANS.md`

**On plan approval (Phase 5)**, append a summary entry:

```markdown
---

## [YYYY-MM-DD] {agent}:{slug}

**Branch:** `feat/{slug}` | **Linear:** AI-XXX | **Status:** in-progress
**Thoroughness:** {level} | **Scope mode:** {mode} | **Stories:** {count}

### Summary
{1-3 sentence description from Context section}

### Stories
- US-001: {title} — {status}
- US-002: {title} — {status}

### Deferred (FR)
- FR-001: {title}

[Full plan →](./{agent}:{slug}.md)
```

**On plan completion (`/done`)**, update the entry's status to `complete` and mark story statuses.

**On `/plan resume`**, read `PLANS.md` to show all active/incomplete plans before discovery.

---

## Notes

- Rename random slugs immediately
- Trivial (1-2 stories): abbreviated intake (Rounds 1-2 only), abbreviated review
- Memory-only plans: no Linear, no branch/PR, no QA
- If Linear MCP unavailable: fall back to `gh` CLI or skip
- Non-Claude agents without `Agent` tool: save execution proposal only
- Parallel execution mandatory for 3+ stories
- No skip option once rounds are determined — run all applicable rounds
- "Grill me" or "deep" forces all rounds regardless of scope signals
