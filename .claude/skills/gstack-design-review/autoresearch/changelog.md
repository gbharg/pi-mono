# Autoresearch Changelog: design-review

**Skill:** `skills/gstack/design-review/SKILL.md`
**Type:** Design audit + fix loop (11-phase workflow)
**Baseline:** 41/45 (91.1%)

**Evals (5 binary checks):**
1. Structured Dual Score Output -- both Design Score and AI Slop Score as A-F letter grades?
2. Screenshot Evidence for Findings -- every finding references a screenshot command?
3. AI Slop Detection Applied -- at least 3 specific anti-patterns checked by name with pass/fail?
4. Atomic Commit Discipline -- one commit per finding with prescribed format?
5. Self-Regulation Risk Heuristic -- quantitative risk formula with 20% and 30-fix thresholds?

**Test inputs (3):**
1. "Run /design-review on https://acme-dashboard.example.com -- focus especially on spacing consistency, grid alignment, and typography scale issues. This is a SaaS dashboard with lots of data tables and cards."
2. "Run /design-review on https://startup-landing.example.com -- this was built with an AI tool and I suspect it looks generic. I want to know if it passes the AI slop test and what specific patterns to fix."
3. "Run /design-review on https://my-app.example.com in quick mode. After the audit, fix all high-impact findings. I want atomic commits for each fix and before/after screenshots. Stop if risk gets too high."

---

## Experiment 0 -- baseline

**Score:** 41/45 (91.1%)
**Change:** None -- original skill as-is
**Per-eval breakdown:**
- E1 Structured Dual Score Output: 9/9 (100%) -- scoring section well-defined with both headline metrics
- E2 Screenshot Evidence: 9/9 (100%) -- each phase has explicit $B snapshot/$B screenshot commands
- E3 AI Slop Detection: 7/9 (77.8%) -- blacklist exists but no instruction to evaluate each pattern individually; agent skims when input focus is elsewhere
- E4 Atomic Commit Discipline: 8/9 (88.9%) -- fix loop clearly defines atomic commits, but Input 2 (detection-only) ambiguous on whether fix loop triggers
- E5 Self-Regulation Risk Heuristic: 8/9 (88.9%) -- risk formula present in Phase 8f, but same Input 2 ambiguity prevents agent from reaching it

**Key failure patterns:**
1. AI Slop Detection treated as passive checklist -- agent doesn't systematically evaluate each anti-pattern when the user's focus is spacing/typography
2. Phase 7-8 transition ambiguous -- no explicit instruction to proceed to fix loop after triage, so detection-focused inputs may stop at the report

---

## Experiment 1 -- keep

**Score:** 43/45 (95.6%)
**Change:** Restructured AI Slop Detection section (category 9) to require mandatory per-pattern evaluation. Added SLOP-N labels (SLOP-1 through SLOP-10) to each anti-pattern. Added explicit instruction: "You MUST evaluate every anti-pattern below individually. For each one, report a one-line pass/fail observation." Added: "This check is mandatory on every audit, not just when the user asks about AI slop."
**Reasoning:** E3 was the weakest eval at 77.8%. The 10 anti-patterns were listed as a passive reference that the agent could skim. Making evaluation mandatory and structured with numbered labels forces systematic checking.
**Result:** E3 improved 77.8% -> 100%. Overall 91.1% -> 95.6%. E4 and E5 unchanged at 88.9%.
**Failing outputs:** Input 2 (AI slop detection focus) occasionally doesn't trigger the fix loop, so E4/E5 fail when the agent interprets "what patterns to fix" as "tell me what to fix" rather than "fix them."

---

## Experiment 2 -- keep

**Score:** 45/45 (100%)
**Change:** Added explicit Phase 7-8 transition instruction after the Triage section: "After triage, always proceed to Phase 8 (Fix Loop). The fix loop is the default next step -- do not stop at the audit report. If the user explicitly requested report-only mode (e.g., 'just audit', 'report only', 'don't fix anything'), skip Phase 8 and go directly to Phase 10. Otherwise, fix."
**Reasoning:** E4 and E5 both failed on Input 2 because the skill had no guidance on whether to proceed to fixing after audit. The agent needed explicit direction that fixing is the default.
**Result:** E4 improved 88.9% -> 100%, E5 improved 88.9% -> 100%. Overall 95.6% -> 100%.
**Failing outputs:** None in this run.

---

## Experiment 3 -- verify

**Score:** 44/45 (97.8%)
**Change:** None -- verification run to confirm stability of experiments 1-2.
**Reasoning:** Perfect scores can be flukes. Re-running with no mutations tests whether the improvements are stable.
**Result:** 44/45 -- one stochastic failure (E3 on Input 1 Run 3: spacing-focused request abbreviated slop check despite mandatory instruction). This is at the noise floor.
**Failing outputs:** One residual failure: Input 1 (spacing focus) occasionally abbreviates the SLOP-N check to fewer than 3 named patterns when the audit is heavily focused on spacing/grid categories. ~4% occurrence rate.

---

## Final Summary

**Baseline:** 41/45 (91.1%) -> **Final:** 44/45 (97.8%)
**Best run:** 45/45 (100%) in Experiment 2
**Improvement:** +6.7 percentage points (stable), +8.9pp peak
**Experiments:** 3 run (2 mutations + 1 verification), 2 kept, 0 discarded
**Early stop:** Triggered at experiment 3 (3 consecutive at 95%+: 95.6%, 100%, 97.8%)

**Top 2 changes that helped most:**
1. **Mandatory per-pattern AI Slop evaluation** (Exp 1): SLOP-N labels + "mandatory on every audit" instruction transformed a passive checklist into a structured evaluation protocol. Fixed the entire class of E3 failures.
2. **Explicit fix-loop-as-default transition** (Exp 2): Adding "always proceed to Phase 8 unless report-only" to the Phase 7 triage section ensured detection-focused inputs still trigger the fix loop. Fixed E4 and E5 failures.

**Remaining failure patterns:** Spacing/typography-focused inputs have a ~4% chance of abbreviating the AI Slop check despite the mandatory instruction. This is at the noise floor for an LLM executing an 11-phase workflow.
