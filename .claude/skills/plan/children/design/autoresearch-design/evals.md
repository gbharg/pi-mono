# Autoresearch Evals — plan:design

## EVAL 1: 7-pass rating system used
**Question:** Did the review rate all 7 design dimensions on a 0-10 scale?
**Pass:** All 7 passes present with before/after scores
**Fail:** Passes missing or scores not given

## EVAL 2: Interaction state table produced
**Question:** Did the review create an interaction state table (loading/empty/error/success/partial)?
**Pass:** Table present with at least 3 UI features mapped across states
**Fail:** No state table, or just a text list without the structured format

## EVAL 3: AI slop detected and fixed
**Question:** Were vague/generic UI descriptions identified and replaced with specific ones?
**Pass:** At least 1 vague description rewritten with specific design decision
**Fail:** Generic descriptions like "clean modern UI" left in plan unchanged

## EVAL 4: Responsive + accessibility specified
**Question:** Does the review add responsive specs and accessibility requirements?
**Pass:** At least viewport-specific layout changes + touch targets or keyboard nav mentioned
**Fail:** No responsive or a11y additions to the plan

## EVAL 5: Issues asked individually
**Question:** Were design issues presented one at a time via AskUserQuestion?
**Pass:** Each genuine design choice got its own question
**Fail:** Issues batched or presented as text without user interaction
