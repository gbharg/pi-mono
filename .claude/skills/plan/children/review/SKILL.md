---
name: plan:review
description: "Engineering plan review. Architecture, code quality, tests, and performance. Scope challenge, test diagram, failure modes."
user-invocable: false
---

# Engineering Review (Child of /plan)

Architecture, code quality, tests, and performance review. The most detailed review — runs last.

Invoked by the parent `/plan` skill during Phase 3C. Always runs unless minimal thoroughness AND user explicitly skips.

---

## Engineering Preferences (guide all recommendations)

- **DRY** — flag repetition aggressively
- **Well-tested** — too many tests > too few
- **"Engineered enough"** — not fragile, not over-engineered
- **More edge cases, not fewer** — thoughtfulness > speed
- **Explicit over clever**
- **Minimal diff** — fewest new abstractions and files touched
- **ASCII diagrams** in code comments for complex designs
- **Diagram maintenance** is part of the change — stale diagrams are worse than none

---

## Cognitive Patterns (internalized)

1. **Blast radius instinct** — worst case, how many systems/people affected
2. **Boring by default** — proven technology, 3 innovation tokens (McKinley)
3. **Incremental over revolutionary** — strangler fig, canary, refactor not rewrite
4. **Systems over heroes** — design for tired humans at 3am
5. **Reversibility preference** — feature flags, A/B tests, incremental rollouts
6. **Failure is information** — blameless postmortems, error budgets (SRE)
7. **Essential vs accidental complexity** — real problem or one we created? (Brooks)
8. **Make the change easy, then make the easy change** (Beck)
9. **Own your code in production** (Majors)
10. **Error budgets over uptime targets** (Google SRE)

---

## Step 0: Scope Challenge (always first)

1. **What existing code solves each sub-problem?** Can we capture outputs from existing flows rather than building parallel ones?
2. **Minimum changes for the goal?** Flag work deferrable without blocking the core objective. Be ruthless about scope creep.
3. **Complexity check:** >8 files or >2 new classes/services = smell. Challenge whether the goal can be achieved with fewer moving parts.
4. **TODOS cross-reference:** Read TODOS.md if it exists. Blocking items? Bundleable items? New work to capture?

If complexity check triggers, recommend scope reduction before proceeding.

---

## Review Sections (4 sections, max 8 issues each)

### Section 1: Architecture Review

Evaluate:
- System design and component boundaries
- Dependency graph and coupling concerns
- Data flow patterns and potential bottlenecks
- Scaling characteristics and single points of failure
- Security architecture (auth, data access, API boundaries)
- Whether key flows need ASCII diagrams in plan or code comments
- **For each new codepath:** describe one realistic production failure scenario and whether the plan accounts for it

**STOP.** AskUserQuestion per issue. One at a time. Recommend + WHY. Move on when resolved.

### Section 2: Code Quality Review

Evaluate:
- Code organization and module structure
- DRY violations — be aggressive
- Error handling patterns and missing edge cases (call out explicitly)
- Technical debt hotspots
- Over-engineered or under-engineered areas
- Existing ASCII diagrams in touched files — still accurate after this change?

**STOP.** AskUserQuestion per issue. One at a time.

### Section 3: Test Review

1. **Diagram all new codepaths:** Make a diagram of all new UX, data flow, codepaths, and branching outcomes. For each, note what is new.
2. **Map to tests:** For each item in the diagram, verify a corresponding test exists or is planned.
3. **Produce test plan:**

```markdown
## Affected Pages/Routes
- {URL path} — {what to test and why}

## Key Interactions to Verify
- {interaction} on {page}

## Edge Cases
- {edge case} on {page}

## Critical Paths
- {end-to-end flow that must work}
```

**STOP.** AskUserQuestion per gap. One at a time.

### Section 4: Performance Review

Evaluate:
- N+1 queries and database access patterns
- Memory-usage concerns
- Caching opportunities
- Slow or high-complexity code paths

**STOP.** AskUserQuestion per issue. One at a time.

---

## Required Outputs

### "NOT in scope" section
Work considered and explicitly deferred, with one-line rationale each.

### "What already exists" section
Existing code/flows that already partially solve sub-problems, and whether the plan reuses them.

### Test Diagram
Codepaths → test coverage mapping. Every new codepath needs a corresponding test or explicit justification for skipping.

### Failure Modes
For each new codepath:
1. One realistic way it could fail in production (timeout, nil, race condition, stale data)
2. Whether a test covers that failure
3. Whether error handling exists
4. Whether the user would see a clear error or a **silent failure**

If any failure mode has no test AND no error handling AND would be silent → flag as **CRITICAL GAP**.

### Completion Summary

```
Step 0: Scope Challenge — [accepted as-is / reduced]
Architecture Review: _ issues found, _ resolved
Code Quality Review: _ issues found, _ resolved
Test Review: diagram produced, _ gaps identified
Performance Review: _ issues found, _ resolved
NOT in scope: written (_ items)
What already exists: written
Failure modes: _ critical gaps flagged
```

---

## Question Format

- **One issue = one AskUserQuestion.** Never batch multiple issues.
- Describe the problem concretely with file and line references where possible.
- Present 2-3 options including "do nothing" where reasonable.
- For each option: effort, risk, maintenance burden in one line.
- **Map recommendation to engineering preference above.** One sentence connecting to DRY, explicit > clever, minimal diff, etc.
- Label: NUMBER + LETTER (e.g., "3A", "3B")
- **Escape hatch:** No issues in a section → say so, move on. Obvious fix → state it, move on.
