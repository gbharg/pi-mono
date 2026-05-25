# 0002 — session logging

Date: 2026-05-24
Status: accepted
Supersedes: parts of 0001 (extends the hook contracts established there)

## Context

PR #18 (ADR 0001) shipped the memory directory and three hooks, but the
PreCompact hook only wrote a session stub + daily marker; nothing helped a
session *resume* with continuity after a compact, and there was no
end-of-session ritual to consolidate what just happened.

openclaw has both pieces: `~/openclaw/memory/scripts/pre-compaction-extract.sh`
plus a multi-step `/done` skill at `~/openclaw/skills/done/` that handles
Linear sync, MRDs, multi-host deploy, statusline emits, telemetry, etc.
Most of that is over-spec for a single-repo, single-agent codebase.

The `.claude/skills/done/` slot already contained a mirrored copy of the
openclaw `/done` skill (commit `a52f257`), but its `~/openclaw/memory/...`
paths and bundled deploy/sync scripts do not apply to pi-mono work.

## Decision

Extend the two PR-#18 hooks rather than add sibling hooks, and replace the
mirrored openclaw `/done` `SKILL.md` with a right-sized pi-mono version
plus a single `done.sh` script:

- **`memory-pre-compact.sh`** also writes
  `/tmp/pi-mono-session-snapshot.md` with branch, ahead/behind, commits on
  the branch, file diff against `origin/main`, uncommitted status, and the
  head of `memory/context.md`. The snapshot is overwritten on every
  compaction — only the most recent one is useful.

- **`memory-bootstrap.sh`** also injects the snapshot when it exists and
  was written in the last 6 hours, so the resumed session gets git +
  context continuity without depending on disk session files.

- **`/done`** (`.claude/skills/done/SKILL.md` + `done.sh`) writes a daily
  log entry, a session summary under `memory/sessions/auto/`, refreshes the
  `## Active focus` and `## In-flight branches` sections of
  `memory/context.md`, runs `qmd update pi-mono-memory` if registered, and
  optionally commits with `memory: session log <date>` under `--commit`.

The previously-vendored openclaw subdirs at `.claude/skills/done/{scripts,
instructions, references, eval}/` are left on disk but no longer referenced
by `SKILL.md`. Cleanup of those is deferred to a follow-up; deleting them
in this PR would widen the blast radius unnecessarily.

## Consequences

- Sessions that resume after a `/compact` see branch + diff state in the
  first prompt instead of starting cold.
- `/done` produces durable on-disk memory without any pnpm/bun deps, Linear
  account, or `~/openclaw` repo presence.
- The single `memory/context.md` (flat layout from ADR 0001) is mutated by
  `/done`; we intentionally rewrite only two sections so user-edited
  content elsewhere is preserved.
- The `auto/` subdirectory under `memory/sessions/` keeps the human-curated
  session stubs (from `memory-pre-compact.sh`) separate from `/done`'s
  machine-written summaries.
- The mirrored openclaw subdirs are now dead weight; a follow-up should
  either delete them or re-target their contents at pi-mono.
