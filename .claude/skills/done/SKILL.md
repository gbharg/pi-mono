---
name: done
description: "End-of-session wrap-up for pi-mono. Trigger: /done. Appends a daily-log entry, writes a session summary, refreshes memory/context.md from git state, and re-indexes qmd. Pass --commit to commit the memory updates."
user-invocable: true
allowed-tools: ["Bash"]
version: v1.0.0
---

# /done — pi-mono session wrap-up

Run this at the end of a working session so the memory system in `memory/`
captures what just happened. Right-sized counterpart to openclaw's much larger
`/done` — no MRDs, no Linear sync, no multi-host deploy. Just durable on-disk
memory.

This replaces the openclaw-style `/done` that was previously vendored under
`.claude/skills/done/`. Its `~/openclaw/memory/...` paths and bundled
scripts did not apply to pi-mono.

## What it does

1. Computes a slug from the current branch (`feat/foo` → `foo`, `fix/bar` → `bar`).
2. Reads the session summary body from a positional arg or from stdin. If
   nothing is provided, builds a minimal summary from git state (branch,
   recent commits, modified files) plus `.claude/.snapshot.md` (the
   pre-compact snapshot) when it is fresh.
3. Appends a `## HH:MM — <branch>` block to `memory/daily/YYYY-MM-DD.md`
   (creates the date heading if the file is new).
4. Writes the full summary to
   `memory/sessions/auto/YYYYMMDD-HHMMSS-<slug>.md`.
5. Rewrites the `## Active focus` and `## In-flight branches` sections of
   `memory/context.md` to reflect the latest session; leaves everything else
   intact.
6. Runs `qmd update pi-mono-memory` if `qmd` is on PATH and the collection
   is registered.
7. If `--commit` is passed, stages only the touched memory paths and commits
   as `memory: session log <date>`.

Best-effort: every step degrades to a no-op if its preconditions aren't met
(no git, no qmd, no memory dir).

## Invocation

```bash
# As a slash command in Claude Code:
/done

# Direct call with an explicit summary:
.claude/skills/done/done.sh "Wrapped up the auth refactor; added OAuth callback handler and updated 3 tests."

# Via stdin:
echo "Quick fix on the qmd index pattern." | .claude/skills/done/done.sh

# With auto-commit:
.claude/skills/done/done.sh --commit "Shipped ADR 0002."
```

## Flags

| Flag       | Effect                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `--commit` | Stage the touched memory files and commit as `memory: session log <date>`. Always stages explicit paths; never `git add -A`. |

## Output

- `memory/daily/YYYY-MM-DD.md` — appended `## HH:MM — <branch>` block.
- `memory/sessions/auto/YYYYMMDD-HHMMSS-<slug>.md` — full summary with
  frontmatter (branch, SHA, timestamp).
- `memory/context.md` — `## Active focus` repointed at the new session file;
  `## In-flight branches` replaced with the current branch status. Other
  sections untouched.
- Stdout: a list of the files written and the qmd / commit outcome.

## When NOT to use

- If the session was purely memory-only (you're in a `feat/memory-*`
  branch), `/done` would just log itself — usually pointless.
- If the branch contains no committable work yet, the summary will be
  sparse; finish the work first.

## Gotchas

- Slug uses everything after the first `/` in the branch name. Branches
  without a `/` use the full name.
- `qmd update pi-mono-memory` only fires when the collection is registered
  (`qmd collection add memory --name pi-mono-memory` from the repo root).
  Missing collection → silent no-op.
- `--commit` stages only `memory/daily/...`, `memory/sessions/auto/...`,
  and `memory/context.md`. Unrelated unstaged edits stay untouched.

## Shared Memory ACL (future)

The `agent-memory-shared` qmd collection (cross-repo blocks at `~/.agent-memory/shared/`) is queried by `.claude/hooks/memory-recall.sh` alongside `pi-mono-memory`. The current access model is intentionally simple: **every agent that runs the hook sees every block in `agent-memory-shared`** — there is no per-agent or per-channel filtering at recall time. Per-block `owner` metadata in `~/.agent-memory/shared/manifest.json` only gates *writes*, not reads.

Downstream consumers with multiple distinct agent personas — notably the exult-agent three-channel orchestrator (sendblue / ringcentral / email) — will eventually need finer-grained read scoping. Two viable options when that pressure arrives:

1. **Manifest ACL match at recall time**: extend the hook (or a shared helper) to read `manifest.json`, resolve the current agent's identity, and skip blocks whose `read_acl` doesn't include it.
2. **Split per-channel shared collections**: e.g. `agent-memory-shared-sendblue`, `agent-memory-shared-ringcentral`, with the hook selecting collections based on the calling channel. Simpler operationally; duplicates blocks that are truly cross-channel.

Defer the choice until a real isolation requirement lands (e.g. user-specific PII that should not bleed across channels). For now, keep shared blocks generic enough that "every agent sees every block" is the correct semantics.
