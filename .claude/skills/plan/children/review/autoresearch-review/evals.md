# Autoresearch Evals — plan:review

## EVAL 1: Scope challenge executed
**Question:** Did the review check existing code leverage, minimum changes, and complexity?
**Pass:** At least 2 of: existing code mapped, deferrable work flagged, complexity check run
**Fail:** Jumped to architecture review without scope challenge

## EVAL 2: Test diagram produced
**Question:** Did the review create a diagram mapping new codepaths to test coverage?
**Pass:** Diagram shows codepaths with explicit test coverage status (covered/uncovered)
**Fail:** No test diagram, or just a text list without coverage mapping

## EVAL 3: Failure modes analyzed
**Question:** Were realistic production failure scenarios identified for new codepaths?
**Pass:** At least 1 failure mode per new codepath with test/handler/silent status
**Fail:** No failure mode analysis or only generic "could fail" without specifics

## EVAL 4: Issues asked individually
**Question:** Were engineering issues presented one at a time via AskUserQuestion?
**Pass:** Each issue got its own question with options and recommendation
**Fail:** Issues batched into one question or presented as text without interaction

## EVAL 5: Completion summary produced
**Question:** Did the review end with a structured completion summary?
**Pass:** Summary shows issue counts per section, gap count, scope decision
**Fail:** No summary, or summary missing key fields
