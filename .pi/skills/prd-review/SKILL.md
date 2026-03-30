---
name: prd-review
description: |
  Review and expand a project brief into a full PRD through structured Q&A. Covers product
  requirements, design requirements, and engineering requirements. Each section builds on the
  brief and gates the next. Use after /skill:shape produces a brief.md.
  Proactively suggest when a brief exists but no PRD has been written yet.
---

# PRD Review — Product Requirements Document Skill

You are helping the user turn a project brief into a complete PRD. The brief should already
exist. Read it first. Then work through three sections, asking questions ONE AT A TIME.

## Pre-flight

1. Read the project's `brief.md`. If it doesn't exist, suggest running `/skill:shape` first.
2. Read `state.md` and `context.md` for current project state.

## Section 1: Product Requirements (4-5 questions)

1. **What are the user-facing requirements?**
   - Concrete behaviors, not implementation. "When X happens, user sees Y."
   - Push until each requirement is testable.

2. **What are the acceptance criteria?**
   - How do we know each requirement is met?
   - "Show me the test" — even if informal.

3. **What's the priority order?**
   - If we can only ship 3 of 5 requirements, which 3?
   - Forces ruthless prioritization.

4. **What are the edge cases?**
   - Error states, empty states, overload, permissions.
   - "What happens when this fails?"

5. **What's explicitly out of scope for v1?**
   - Reconfirm from the brief. Add anything new.

## Section 2: Design Requirements (3-4 questions)

6. **What's the experience flow?**
   - Step by step, from trigger to completion.
   - For CLI/agent work: what does the interaction look like?

7. **What are the interface constraints?**
   - iMessage limitations, TUI constraints, API format requirements.
   - What can't we do because of the medium?

8. **What existing patterns should we follow?**
   - Consistency with current tools, conventions, file formats.
   - "How does this fit with what already exists?"

9. **What should this feel like to use?**
   - Fast? Thorough? Invisible? Interactive?
   - The vibe matters — it shapes implementation choices.

## Section 3: Engineering Requirements (4-5 questions)

10. **What's the technical architecture?**
    - High-level components, how they connect, data flow.
    - Present 2-3 options with trade-offs if the approach isn't obvious.

11. **What are the dependencies?**
    - External services, APIs, libraries, other projects.
    - What has to exist before we can build this?

12. **What are the performance requirements?**
    - Response time, throughput, resource limits.
    - "What's unacceptable?"

13. **How do we test this?**
    - Automated tests, manual validation, integration tests.
    - Define the testing strategy before implementation.

14. **How do we roll back?**
    - If this breaks something, how do we undo it?
    - Every change should be reversible.

## Output

After all sections, write the PRD:

```
# [Project Name] — PRD

## Brief
[Link to or summary of brief.md]

## Product Requirements
[From Section 1, numbered, each with acceptance criteria]

## Design Requirements
[From Section 2 — experience flow, constraints, patterns, feel]

## Engineering Requirements
[From Section 3 — architecture, dependencies, performance, testing, rollback]

## Out of Scope
[Consolidated from brief + new items]

## Milestones
[Break the work into 2-4 milestones based on priority order from Q3]

## Next Step
[Write the technical spec / task breakdown]
```

Save as `prd.md` in the project folder. Update `state.md` phase to "prd".

## Rules

- ONE question at a time. Wait for response.
- Read the brief first — don't re-ask what's already answered.
- Push for testable, measurable requirements. "It should be fast" is not a requirement.
- Present trade-offs with recommendations when choices arise.
- Milestones should map to natural compaction points.
- The PRD is the contract. After approval, scope doesn't change without a new discussion.
