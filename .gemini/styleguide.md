# PR Review Style Guide

Guidance for automated PR reviewers (Gemini Code Assist, Claude, Codex).

## Focus
- Meaningful issues only: bugs, security, performance, correctness.
- Skip trivial style nits; formatting is enforced by linters.
- Tag each finding with severity: HIGH / MEDIUM / LOW.

## Context
- Read CLAUDE.md and AGENTS.md at repo root for project conventions; they are authoritative.
- If the PR body or commits reference a plan file (.claude/plans/*.md) or a Linear ID (AI-###), evaluate the diff against that plan's scope and acceptance criteria.
- Flag scope creep: changes unrelated to the stated plan/issue.

## Workflow suggestions
- Suggest splitting PRs that mix unrelated concerns.
- Call out missing tests for changed behavior, and CI impact.
