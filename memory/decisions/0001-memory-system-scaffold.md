# 0001 — memory system scaffold

Date: 2026-05-24
Status: accepted

## Context

pi-mono had no memory infrastructure — every Claude Code session started cold.
openclaw has a mature system (`memory/`, daily logs, per-agent sessions,
`qmd`-indexed cross-referenceable knowledge, recall/compact hooks) but it is
sized for a multi-agent vault. Copying it wholesale would be over-engineering.

## Decision

Ship a right-sized subset:

- Single-agent flat layout (`memory/daily/`, `memory/sessions/`,
  `memory/decisions/`, `memory/learnings.md`, `memory/context.md`,
  `memory/MEMORY.md`).
- Three project-scoped hooks under `.claude/hooks/`:
  - `memory-recall.sh` (UserPromptSubmit) — single-tier `qmd` lookup.
  - `memory-bootstrap.sh` (SessionStart) — context + today's daily.
  - `memory-pre-compact.sh` (PreCompact) — write session extract + daily marker.
- One new `qmd` collection (`pi-mono-memory`) pointed at `memory/`.

Explicitly **not** ported: per-agent pools, snapshot archive, learnings CLI,
ontology/entities, statusline integration, cross-repo federation.

## Consequences

- Sessions resume with relevant past context without manual handoff.
- All memory ships with the repo (no user-local `~/.claude/hooks/` coupling).
- If pi-mono ever needs multi-agent pools or richer indexing, openclaw's
  `memory/scripts/` are a known reference.
- Memory churn is committed to the branch; merge conflicts will be markdown-only
  and easy to resolve.
