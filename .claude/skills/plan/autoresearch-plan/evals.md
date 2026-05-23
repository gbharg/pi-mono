# Autoresearch Evals — /plan (Parent Skill)

## EVAL 1: Intake completeness
**Question:** Did the skill ask about the goal, Linear issue, and branch strategy before drafting?
**Pass condition:** All 3 required fields were collected (or confirmed from context) before any plan text was drafted
**Fail condition:** Drafting began without collecting all required fields, or fields were silently assumed

## EVAL 2: Plan structure
**Question:** Does the plan contain Context, Scope, User Stories with AC, and NOT-in-scope?
**Pass condition:** All 4 sections present with substantive content (not just headers)
**Fail condition:** Any required section missing or contains only placeholder text

## EVAL 3: Thoroughness calibration
**Question:** Did the skill auto-detect appropriate thoroughness for the task complexity?
**Pass condition:** Review depth matches task signals (e.g., UI task triggers design review, simple fix gets minimal review)
**Fail condition:** Over-reviewed a simple task (ran all 3 reviews for a 1-file fix) OR under-reviewed a complex task (skipped strategy review for 10-file feature)

## EVAL 4: Full plan presented inline
**Question:** Was the complete plan text shown inline to the user?
**Pass condition:** Full plan visible in conversation — every section, every story, every AC
**Fail condition:** Plan abbreviated, summarized, or deferred to "see the plan file"

## EVAL 5: Execution proposal
**Question:** Did the skill propose an execution strategy matching the decision tree?
**Pass condition:** Strategy, model selection, parallelism level all specified and match story count/dependency shape
**Fail condition:** No execution proposal generated, OR strategy doesn't match task shape (e.g., solo proposed for 5 stories)
