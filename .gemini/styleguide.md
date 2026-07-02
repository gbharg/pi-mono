# PR Review Style Guide

Guidance for automated PR reviewers (Gemini Code Assist, Claude, Codex).

## Focus
- Meaningful issues only: bugs, security, performance, correctness.
- Skip trivial style nits; formatting is enforced by linters.
- Review only the changed lines and their direct blast radius; do not flag
  pre-existing issues in surrounding code (mention them at most once, separately).
- Tag each finding with severity:
  - HIGH — security, data loss, crash, PHI exposure, broken build/deploy.
  - MEDIUM — correctness bugs, performance regressions, missing error handling.
  - LOW — maintainability, unclear naming, missing tests for edge cases.
- Call out genuinely good patterns briefly (one line) — positive signal matters.

## Context
- Read CLAUDE.md and AGENTS.md at repo root for project conventions; they are authoritative.
- If neither file exists, fall back to language-community defaults and say so;
  do not skip convention checks silently.
- If the PR body or commits reference a plan file (.claude/plans/*.md) or a Linear ID
  (AI-###), evaluate the diff against that plan's scope and acceptance criteria.
- If a referenced plan file is not found at the given path, note that in the review
  and proceed without scope-checking — never silently skip scope validation.
- If no plan or Linear ID is referenced, review on the merits; no scope check needed.
- Flag scope creep: changes unrelated to the stated plan/issue.

## Output
- One finding per comment, anchored to the relevant line where possible.
- End with a short summary verdict and the finding count by severity.

## Workflow suggestions
- Suggest splitting PRs that mix unrelated concerns.
- Call out missing tests for changed behavior, and CI impact.

<!-- Ported from pr-review-shared/lib/build-prompt-v2.js (VM reviewer bots); severity
     definitions, diff-only scope, and fallback rules added per bot review feedback. -->
