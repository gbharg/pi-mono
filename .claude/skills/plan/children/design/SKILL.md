---
name: plan:design
description: "Designer's eye plan review. 7-pass rating system covering information architecture, interaction states, user journey, AI slop, design system, responsive/a11y, and unresolved decisions."
user-invocable: false
---

# Design Review (Child of /plan)

7-pass design review for plans with UI scope. Rate each dimension 0-10, explain what a 10 looks like, fix the plan to get there.

Invoked by the parent `/plan` skill during Phase 3B. Only runs when UI scope is detected.

---

## Design Principles

1. **Empty states are features.** "No items found" is not a design. Warmth, primary action, context.
2. **Every screen has a hierarchy.** First, second, third. If everything competes, nothing wins.
3. **Specificity over vibes.** "Clean, modern UI" is not a decision. Name the font, spacing, pattern.
4. **Edge cases are user experiences.** 47-char names, zero results, error states, first-time vs power user.
5. **AI slop is the enemy.** Generic card grids, hero sections, 3-column features = fail.
6. **Responsive is not "stacked on mobile."** Each viewport gets intentional design.
7. **Accessibility is not optional.** Keyboard nav, screen readers, contrast, 44px touch targets.
8. **Subtraction default.** If an element doesn't earn its pixels, cut it.
9. **Trust at pixel level.** Every interface decision builds or erodes user trust.

---

## Cognitive Patterns (internalized)

- **See the system, not the screen** — What comes before, after, when things break
- **Empathy as simulation** — Bad signal, one hand free, boss watching, 1st time vs 1000th
- **Hierarchy as service** — What should user see first? Respecting their time
- **Constraint worship** — "If I can only show 3 things, which 3?"
- **Edge case paranoia** — 47 chars? Zero results? Network fails? Colorblind? RTL?
- **"Would I notice?" test** — Invisible design = perfect design
- **Principled taste** — "This feels wrong" traced to a broken principle (Zhuo)
- **Subtraction default** — "As little design as possible" (Rams)
- **Time-horizon design** — 5-sec visceral, 5-min behavioral, 5-year reflective (Norman)

---

## The 0-10 Method

For each pass:
1. **Rate** the plan on that dimension
2. **Gap** — explain why it's not a 10
3. **Fix** — edit the plan to add what's missing
4. **Re-rate** — verify improvement
5. **Ask** — AskUserQuestion only for genuine design choices (not every gap)

---

## 7 Review Passes

### Pass 1: Information Architecture
**Rate 0-10:** Does the plan define what the user sees first, second, third?

**FIX TO 10:** Add information hierarchy to the plan. Include ASCII diagram of screen/page structure and navigation flow. Apply constraint worship — if you can only show 3 things, which 3?

### Pass 2: Interaction State Coverage
**Rate 0-10:** Does the plan specify loading, empty, error, success, partial states?

**FIX TO 10:** Add interaction state table:
```
FEATURE              | LOADING | EMPTY | ERROR | SUCCESS | PARTIAL
---------------------|---------|-------|-------|---------|--------
[each UI feature]    | [spec]  | [spec]| [spec]| [spec]  | [spec]
```
Empty states need warmth, a primary action, and context. Not just "No items found."

### Pass 3: User Journey & Emotional Arc
**Rate 0-10:** Does the plan consider the user's emotional experience?

**FIX TO 10:** Add user journey storyboard:
```
STEP | USER DOES        | USER FEELS      | PLAN SPECIFIES?
-----|------------------|-----------------|----------------
1    | Lands on page    | [emotion]       | [what supports it]
```
Apply time-horizon design: 5-sec visceral, 5-min behavioral, 5-year reflective.

### Pass 4: AI Slop Risk
**Rate 0-10:** Does the plan describe specific, intentional UI — or generic patterns?

**FIX TO 10:** Rewrite vague UI descriptions:
- "Cards with icons" → what differentiates from every SaaS template?
- "Hero section" → what makes this feel like THIS product?
- "Clean, modern UI" → meaningless. Replace with actual decisions.
- "Dashboard with widgets" → what makes this NOT every other dashboard?

### Pass 5: Design System Alignment
**Rate 0-10:** Does the plan align with DESIGN.md (if it exists)?

**FIX TO 10:**
- DESIGN.md exists → annotate with specific tokens/components
- No DESIGN.md → flag the gap, recommend `/design-consultation`
- New component → does it fit the existing vocabulary?

### Pass 6: Responsive & Accessibility
**Rate 0-10:** Mobile/tablet, keyboard nav, screen readers specified?

**FIX TO 10:** Add responsive specs per viewport — not "stacked on mobile" but intentional layout changes. Add a11y: keyboard nav patterns, ARIA landmarks, touch targets (44px min), color contrast requirements.

### Pass 7: Unresolved Design Decisions
Surface ambiguities that will haunt implementation:
```
DECISION NEEDED              | IF DEFERRED, WHAT HAPPENS
-----------------------------|---------------------------
Empty state design?          | Engineer ships "No items found."
Mobile nav pattern?          | Desktop nav hides behind hamburger
```
Each decision = one AskUserQuestion with recommendation.

---

## Output Requirements

1. **Updated plan** with design specs from all passes
2. **NOT-in-scope section** — deferred design decisions with rationale
3. **"What already exists" section** — DESIGN.md, patterns, components to reuse
4. **Completion summary:**
   ```
   Pass 1 (Info Arch):   _/10 → _/10
   Pass 2 (States):      _/10 → _/10
   Pass 3 (Journey):     _/10 → _/10
   Pass 4 (AI Slop):     _/10 → _/10
   Pass 5 (Design Sys):  _/10 → _/10
   Pass 6 (Responsive):  _/10 → _/10
   Pass 7 (Decisions):   _ resolved, _ deferred
   Overall:              _/10 → _/10
   ```

---

## Question Format

- One issue = one AskUserQuestion (never batch)
- Describe the design gap concretely — what's missing, what user experiences if not specified
- 2-3 options with effort to specify now vs risk if deferred
- Map recommendation to a Design Principle above
- If gap has obvious fix → state what you'll add and move on
- If section has no issues → say so and move on
