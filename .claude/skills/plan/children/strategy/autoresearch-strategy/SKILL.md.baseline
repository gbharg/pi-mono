---
name: plan:strategy
description: "CEO/strategy-level plan review. Premise challenge, scope modes, implementation alternatives, failure modes."
user-invocable: false
---

# Strategy Review (Child of /plan)

CEO/founder-mode plan review. Challenge premises, find better approaches, manage scope.

Invoked by the parent `/plan` skill during Phase 3A. Receives plan file path as context.

---

## Prime Directives

1. **Zero silent failures.** Every failure mode must be visible — to the system, team, user.
2. **Every error has a name.** Specific exception class, trigger, catch, user experience, tested. Catch-all handling is a code smell.
3. **Data flows have shadow paths.** Every flow has: happy path + nil input + empty input + upstream error. Trace all four.
4. **Interactions have edge cases.** Double-click, navigate-away-mid-action, slow connection, stale state, back button.
5. **Observability is scope.** Dashboards, alerts, runbooks are first-class deliverables.
6. **Diagrams are mandatory.** ASCII art for every non-trivial flow, state machine, pipeline, dependency graph.
7. **Everything deferred must be written down.** FR-XXX or TODOS.md — vague intentions are lies.
8. **Optimize for 6-month future.** If this solves today's problem but creates next quarter's nightmare, say so.
9. **Permission to say "scrap it."** If a fundamentally better approach exists, propose it.

---

## Review Steps

### Step 1: Premise Challenge

1. **Is this the right problem?** Could a different framing yield a simpler or more impactful solution?
2. **What's the actual outcome?** Is the plan the most direct path, or solving a proxy problem?
3. **What if we did nothing?** Real pain point or hypothetical?

### Step 2: Existing Code Leverage

Map every sub-problem to existing code:
- What already partially or fully solves each piece?
- Is the plan rebuilding anything that exists? If yes, why is rebuilding better than refactoring?

### Step 3: Dream State Mapping

```
CURRENT STATE          THIS PLAN              12-MONTH IDEAL
[describe]    --->     [describe delta]  ---> [describe target]
```

Does this plan move toward or away from the ideal?

### Step 4: Implementation Alternatives (MANDATORY)

Produce 2-3 distinct approaches. Never skip this.

```
APPROACH A: [Name]
  Summary: [1-2 sentences]
  Effort:  [S/M/L/XL]
  Risk:    [Low/Med/High]
  Pros:    [2-3 bullets]
  Cons:    [2-3 bullets]
  Reuses:  [existing code/patterns leveraged]

APPROACH B: [Name]
  ...
```

Rules:
- At least 2 approaches. One "minimal viable" (smallest diff), one "ideal architecture" (best long-term).
- If only one approach exists, explain why alternatives were eliminated.
- Present recommendation with one-line reasoning.
- Do NOT proceed to mode selection without user approval of approach.

### Step 5: Mode Selection

Ask the user which mode to operate in:

| Mode | Posture | When to use |
|------|---------|-------------|
| **SCOPE EXPANSION** | Dream big, 10x thinking | User wants to think bigger |
| **SELECTIVE EXPANSION** | Hold scope + cherry-pick | Default for most features |
| **HOLD SCOPE** | Maximum rigor, no changes | Scope is locked, make it bulletproof |
| **SCOPE REDUCTION** | Strip to essentials | Need to ship fast, cut everything |

### Step 6: Mode-Specific Analysis

**SCOPE EXPANSION:**
1. 10x check: What's 10x more ambitious for 2x the effort?
2. Platonic ideal: Best engineer, unlimited time, perfect taste — what does this become?
3. Delight opportunities: 5+ adjacent 30-minute improvements that make users think "oh nice"
4. **Opt-in ceremony:** Present each expansion as individual AskUserQuestion. Recommend enthusiastically. User decides. Accepted → plan scope. Rejected → NOT-in-scope.

**SELECTIVE EXPANSION:**
1. Run HOLD SCOPE analysis first (complexity check, minimum changes)
2. Then scan for expansions (do NOT add to scope yet):
   - 10x check, delight opportunities, platform potential
3. **Cherry-pick ceremony:** Present each expansion individually. Neutral posture — state effort + risk, let user decide. Top 5-6 if many candidates.

**HOLD SCOPE:**
1. Complexity check: >8 files or >2 new classes = smell. Challenge.
2. Minimum changes: What's the smallest set that achieves the goal? Flag deferrable work.

**SCOPE REDUCTION:**
1. Ruthless cut: Absolute minimum that ships value. Everything else deferred.
2. Separate "must ship together" from "nice to ship together."

---

## Cognitive Patterns (internalized, not checklist)

- **Classification instinct** — Categorize by reversibility x magnitude (Bezos doors)
- **Inversion reflex** — For every "how do we win?" also ask "what would make us fail?" (Munger)
- **Focus as subtraction** — Default: do fewer things, better (Jobs: 350 products → 10)
- **Speed calibration** — Fast is default. Only slow for irreversible + high-magnitude. 70% info is enough (Bezos)
- **Proxy skepticism** — Are metrics serving users or self-referential? (Bezos Day 1)
- **Essential vs accidental complexity** — Is this solving a real problem or one we created? (Brooks)
- **Leverage obsession** — Small effort → massive output. Technology is ultimate leverage (Altman)

---

## Engineering Preferences (guide all recommendations)

- DRY — flag repetition aggressively
- Well-tested — too many tests > too few
- "Engineered enough" — not fragile, not over-engineered
- More edge cases, not fewer; thoughtfulness > speed
- Explicit over clever
- Minimal diff: fewest new abstractions and files
- ASCII diagrams for complex designs

---

## Output Requirements

After completing the review, produce:

1. **Updated plan** with scope decisions baked in
2. **NOT-in-scope section** — every deferred item with one-line rationale
3. **"What already exists" section** — existing code/flows reusable
4. **Chosen approach** from Step 4 alternatives
5. **Strategy review summary:**
   ```
   Mode: [EXPANSION/SELECTIVE/HOLD/REDUCE]
   Expansions accepted: N
   Expansions deferred: N
   Approach chosen: [A/B/C]
   NOT-in-scope items: N
   ```

---

## Question Format

- One issue = one AskUserQuestion (never batch)
- Describe concretely. Present 2-3 options with effort + risk.
- State recommendation with reasoning.
- Label: NUMBER + LETTER (e.g., "2A", "2B")
- If obvious answer, state it and move on — don't waste a question.
