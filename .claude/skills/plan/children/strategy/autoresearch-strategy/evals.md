# Autoresearch Evals — plan:strategy

## EVAL 1: Premise challenge executed
**Question:** Did the review challenge whether this is the right problem to solve?
**Pass:** At least 2 of: "what if we did nothing?", existing code leverage analysis, proxy problem check
**Fail:** Jumped straight to implementation alternatives without questioning the premise

## EVAL 2: Implementation alternatives presented
**Question:** Were at least 2 distinct implementation approaches presented with effort/risk/pros/cons?
**Pass:** 2+ approaches with concrete differences, not just "do it" vs "don't do it"
**Fail:** Only one approach presented, or alternatives are trivially similar

## EVAL 3: Scope mode selected and applied
**Question:** Was a scope mode (EXPAND/SELECTIVE/HOLD/REDUCE) selected and consistently applied?
**Pass:** Mode explicitly chosen, subsequent analysis follows that mode's rules
**Fail:** No mode selected, or mode drifts mid-review (e.g., expanding scope after choosing HOLD)

## EVAL 4: NOT-in-scope section produced
**Question:** Does the review output include a NOT-in-scope section with deferred items?
**Pass:** Section present with at least 1 item and one-line rationale per item
**Fail:** Section missing or items listed without rationale

## EVAL 5: Scope changes presented individually
**Question:** Were scope expansions/reductions presented as individual decisions (not batched)?
**Pass:** Each scope change got its own question with options
**Fail:** Multiple scope changes bundled into one question or silently applied
