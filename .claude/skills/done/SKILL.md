---
name: done
description: "End-of-session wrap-up. Trigger: /done. Detects agent, mines reusable work, writes session memory, and keeps deployed repos in sync across MBP and iMac."
user-invocable: true
version: v1.0.0
---

# /done

Use this skill to finish a work session without leaving memory drift, doc drift, or deploy drift behind.

## Load Order

1. Read `references/agent-config.md` to resolve the running agent and flags.
2. Read `references/workflow.md` and execute it in order.
3. Prefer bundled scripts for deterministic steps:
   - `scripts/save_log.sh`
   - `scripts/follow-ups.sh`
   - `scripts/pull-main.sh`
   - `scripts/sync-imac-after-deploy.sh`
   - `scripts/update-changelog.sh`
   - `scripts/feature-manifest.sh`
   - `scripts/generate-mrd.sh`
   - `scripts/validate-feature.sh`
   - `scripts/check-overwrites.sh`
   - `scripts/collect-telemetry.sh`

## Flags

| Flag            | Effect                                              |
| --------------- | --------------------------------------------------- |
| `--agent X`     | Override agent detection                            |
| `--linear`      | Enable Linear issue creation (session + follow-ups) |
| `--no-simplify` | Skip the /simplify code review step                 |
| `--no-validate` | Skip pre-merge validation                           |
| `--no-mrd`      | Skip MRD generation                                 |

## Agent Detection

See [instructions/agent-detection.md](instructions/agent-detection.md) for the resolution priority order.

## Source Of Truth

Use the session/chat history as the primary record of what happened. Use git state, command output, and changed files to verify details, not to replace the actual session narrative, decisions, or deferred work.

## Ordering and Deployment Rules

See [instructions/ordering-rules.md](instructions/ordering-rules.md) for merge ordering constraints and post-deploy sync requirements.

## Evaluation

See [eval/checklist.md](eval/checklist.md) for assertions that verify a complete /done execution.

## Key Paths

- Scripts: `scripts/save_log.sh`, `scripts/follow-ups.sh`, `scripts/pull-main.sh`, `scripts/sync-imac-after-deploy.sh`, `~/openclaw/scripts/skill-sync`
- Agent config: `references/agent-config.md`
- Full workflow: `references/workflow.md`
- Daily logs: `~/openclaw/memory/daily/YYYY-MM-DD.md`
- Agent context: `~/openclaw/memory/agents/<AGENT_ID>/context.md`
- Decisions: `~/openclaw/memory/shared/decisions/YYYY-MM.md`
- Learnings: `~/openclaw/skills/memory:learnings/scripts/learnings.sh`
- Feature manifests: `~/openclaw/memory/shared/features/<slug>.md`
- MRDs: `~/openclaw/memory/shared/features/{AI-NNN}-{slug}-mrd.md`

For the step-by-step procedure, agent flags, and command snippets, use `references/workflow.md`.

## Gotchas

See [references/gotchas.md](references/gotchas.md) for known failure points and workarounds.

## Shared Memory ACL (future)

The `agent-memory-shared` qmd collection (cross-repo blocks at `~/.agent-memory/shared/`) is queried by `.claude/hooks/memory-recall.sh` alongside `pi-mono-memory`. The current access model is intentionally simple: **every agent that runs the hook sees every block in `agent-memory-shared`** — there is no per-agent or per-channel filtering at recall time. Per-block `owner` metadata in `~/.agent-memory/shared/manifest.json` only gates *writes*, not reads.

Downstream consumers with multiple distinct agent personas — notably the exult-agent three-channel orchestrator (sendblue / ringcentral / email) — will eventually need finer-grained read scoping. Two viable options when that pressure arrives:

1. **Manifest ACL match at recall time**: extend the hook (or a shared helper) to read `manifest.json`, resolve the current agent's identity, and skip blocks whose `read_acl` doesn't include it.
2. **Split per-channel shared collections**: e.g. `agent-memory-shared-sendblue`, `agent-memory-shared-ringcentral`, with the hook selecting collections based on the calling channel. Simpler operationally; duplicates blocks that are truly cross-channel.

Defer the choice until a real isolation requirement lands (e.g. user-specific PII that should not bleed across channels). For now, keep shared blocks generic enough that "every agent sees every block" is the correct semantics.
