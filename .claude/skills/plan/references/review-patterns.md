# Review Patterns — What Works and What Doesn't

Compiled from analysis of existing plan sessions, gstack review skills, and orchestration patterns.

## Review Order: Strategy → Design → Engineering

This order matters:
1. **Strategy first** catches scope problems before you spend time on implementation details
2. **Design second** defines what the user sees before engineering constrains how it's built
3. **Engineering last** reviews the implementation plan with all scope and design decisions locked

Anti-pattern: Running engineering review first, then discovering scope should be halved.

## Thoroughness Calibration

### Signals that predict needed depth

| Signal | Reliability | Notes |
|--------|-------------|-------|
| File count | High | 1-2 files = minimal, 9+ = deep |
| New abstractions | High | New service/model/API = strategy review |
| UI scope | High | Any user-facing change = design review |
| Story count | Medium | 6+ stories = execution planning needed |
| User urgency | Medium | "Quick fix" vs "we need to get this right" |
| Existing tests | Low | No tests ≠ need deep review (might be intentional) |

### Over-review costs more than under-review

A 2-file bug fix that gets all 3 reviews wastes 20-30 minutes and frustrates the user. Under-reviewing a complex feature wastes time in implementation (rework). Default: err toward minimal and let the user ask for more.

## Question Patterns

### What works
- **One question per AskUserQuestion call.** Users can respond quickly, decisions don't get lost.
- **Options with concrete descriptions.** "A) Redis (fast, ephemeral)" vs "A) Option 1"
- **Recommendation with reasoning.** "Choose A because it matches your existing infra."
- **Escape hatch.** If the answer is obvious, just state it and move on.

### What doesn't work
- Batching 5 issues into one question → user skips half
- Asking about obvious things → user gets annoyed
- No recommendation → user has to think harder

## Execution Strategy Patterns

### When parallel works
- Independent stories (no shared file ownership)
- Each story has clear file boundaries
- Stories don't depend on each other's output

### When sequential is better
- Stories build on each other (schema → backend → frontend)
- Shared files that can't be split
- User wants to review each step before the next

### Common mistakes
- Proposing solo for 5+ stories (always rejected in review)
- Proposing Ralph for 2 stories (overkill)
- Not specifying file ownership → merge conflicts
- Not storing agent IDs in task metadata → lost after compaction

## Plan File Patterns

### Good plan files
- Descriptive slug: `claude:auth-middleware-refactor.md`
- Branch matches: `feat/auth-middleware-refactor`
- Frontmatter complete (agent, branch, session_id, linear_issue)
- Stories right-sized (one context window each)
- Dependencies explicit (Story Map with waves)
- NOT-in-scope section present (even if empty)

### Bad plan files
- Random slug never renamed
- Branch doesn't match plan name
- Missing frontmatter fields
- Stories too large (touch 10+ files each)
- Dependencies implicit ("do this after that")
- Deferred scope not tracked anywhere

## Linear Integration

- Parent issue: "In Progress" on plan approval
- Sub-issues: "Backlog" with blockedBy for dependencies
- FRs: Standalone backlog issues (not sub-issues)
- Commit format: `feat: [AI-XXX] [US-YYY] description`
- On /done: parent moves to "Pending Review"
