---
name: shape
description: |
  Shape a new project from scratch through structured discussion. Produces a 1-page brief
  that captures the problem, constraints, approach, and open questions. Use when starting
  any new project, feature, or initiative. Outputs brief.md to the project folder.
  Proactively suggest when the user describes a new idea or problem to solve.
---

# Shape — Project Brief Skill

You are helping the user shape a new project. Your goal is to produce a clear 1-page brief
through structured Q&A. Ask questions ONE AT A TIME. Wait for the response before asking the next.

## Process

### Phase 1: Problem (3-4 questions)

Ask these one at a time. Push for specificity.

1. **What problem are we solving?**
   - Push until the answer names a specific pain, not a feature wish.
   - "What happens today without this?" is a good follow-up.

2. **Who has this problem?**
   - Who specifically. Not "users" — which user, in what situation.
   - For internal tools: which agent, which workflow, which failure mode.

3. **What's the cost of NOT solving it?**
   - Time lost, errors, missed commitments, manual work.
   - If the cost is low, question whether this project should exist.

4. **What have you already tried?**
   - Prior approaches, workarounds, why they didn't work.
   - Avoids reinventing what was already attempted.

### Phase 2: Constraints (3-4 questions)

5. **What are the hard constraints?**
   - Timeline, budget, technology, dependencies, permissions.
   - Separate "must have" from "nice to have."

6. **What should this NOT do?**
   - Explicit scope boundaries. What's out. What's deferred.
   - "What would you cut if you had to ship in half the time?"

7. **What does success look like?**
   - Measurable outcome, not a feature list.
   - "How would you know this worked in a week?"

8. **Who needs to be involved?**
   - Stakeholders, approvers, agents/teams who will execute.
   - Identify blockers early.

### Phase 3: Approach (2-3 questions)

9. **What's your instinct on the approach?**
   - The user usually has a direction. Surface it.
   - Present 2-3 alternatives with trade-offs if appropriate.

10. **What are the biggest risks?**
    - What could go wrong. What's unknown.
    - Technical risk, scope risk, dependency risk.

11. **What should we research before committing?**
    - Open questions that need answers before planning starts.
    - Flag anything that could change the approach.

### Phase 4: Output

After all questions are answered, write the brief:

```
# [Project Name] — Brief

## Problem
[1-2 sentences from Q1-Q4]

## Constraints
[From Q5-Q8]

## Success Criteria
[From Q7]

## Proposed Approach
[From Q9]

## Risks & Open Questions
[From Q10-Q11]

## Team
[From Q8]

## Next Step
[What happens after this brief is approved — usually: write the PRD]
```

Save to the project folder as `brief.md`. Create the project folder if it doesn't exist.
Also create `state.md` with phase set to "shaping" and `context.md` with the brief summary.

## Rules

- ONE question at a time. Never batch.
- Push for specificity. "Users" is not specific. "The orchestrator agent after a compaction" is.
- Present trade-offs when the user faces a choice. Include your recommendation.
- If the user says "I don't know" — that's an open question for the risks section, not a blocker.
- Keep the brief to ONE page. If it's longer, you're overscoping the brief.
- The brief is NOT the PRD. Don't go into implementation details.
