---
skill: design-review
created: 2026-03-19
---

# Eval Criteria (5 binary checks)

## EVAL 1: Structured Dual Score Output
Question: Does the skill output contain both a Design Score (A-F letter grade) AND an AI Slop Score (A-F letter grade) as distinct headline metrics?
Pass: Both "Design Score: {letter}" and "AI Slop Score: {letter}" appear as separate headline-level items in the output.
Fail: Either score is missing, they are combined into a single score, or the output uses a numeric scale instead of letter grades.

## EVAL 2: Screenshot Evidence for Findings
Question: Does every design finding reference at least one screenshot command ($B snapshot, $B screenshot, or $B responsive) as evidence?
Pass: Each finding in the audit explicitly includes or references a screenshot/snapshot command call that would produce visual evidence.
Fail: Any finding is stated without screenshot evidence, or screenshots are mentioned generically but not tied to specific findings.

## EVAL 3: AI Slop Detection Applied
Question: Does the audit explicitly check for AI slop anti-patterns from the 10-item blacklist (purple gradients, 3-column feature grids, icons in colored circles, centered everything, uniform bubbly border-radius, decorative blobs, emoji as design, colored left-border cards, generic hero copy, cookie-cutter rhythm)?
Pass: The audit names and evaluates at least 3 specific anti-patterns from the blacklist by name, with pass/fail observations per pattern.
Fail: AI slop is mentioned vaguely or generically without checking specific blacklist items, or fewer than 3 specific patterns are evaluated.

## EVAL 4: Atomic Commit Discipline in Fix Loop
Question: Does the fix loop produce exactly one commit per design finding, using the format "style(design): FINDING-NNN -- short description"?
Pass: Each fix is committed individually with the prescribed commit message format, and the skill explicitly prohibits bundling multiple fixes.
Fail: Multiple fixes are bundled into one commit, the commit format is wrong, or there is no commit discipline guidance.

## EVAL 5: Self-Regulation Risk Heuristic
Question: Does the skill include a quantitative risk computation that triggers a stop condition (risk > 20% or > 30 fixes)?
Pass: A numeric risk formula is present that accumulates risk from reverts, file types changed, and fix count, with explicit stop thresholds at 20% risk and 30-fix hard cap.
Fail: Risk management is mentioned vaguely, or thresholds are missing, or there is no quantitative formula.

---

# Test Inputs (3 diverse prompts)

## INPUT 1: Full Visual QA with Spacing Focus
"Run /design-review on https://acme-dashboard.example.com -- focus especially on spacing consistency, grid alignment, and typography scale issues. This is a SaaS dashboard with lots of data tables and cards."

## INPUT 2: AI Slop Detection on a Landing Page
"Run /design-review on https://startup-landing.example.com -- this was built with an AI tool and I suspect it looks generic. I want to know if it passes the AI slop test and what specific patterns to fix."

## INPUT 3: Iterative Fix Loop with Commit Discipline
"Run /design-review on https://my-app.example.com in quick mode. After the audit, fix all high-impact findings. I want atomic commits for each fix and before/after screenshots. Stop if risk gets too high."
