# Agent-Specific Configuration

## Detection

Determine the running agent from these signals (in priority order):

1. `--agent` flag passed to `/done`
2. Environment variable `OPENCLAW_AGENT_ID`
3. CLI tool name (claude → claude-code, codex → codex, gemini → gemini)
4. Default: `claude-code`

## Flags

| Flag            | Effect                                              |
| --------------- | --------------------------------------------------- |
| `--agent X`     | Override agent detection                            |
| `--linear`      | Enable Linear issue creation (session + follow-ups) |
| `--no-simplify` | Skip the /simplify code review step                 |

## Config Table

| Variable            | claude-code                   | codex                   | gemini                   | openclaw                      |
| ------------------- | ----------------------------- | ----------------------- | ------------------------ | ----------------------------- |
| AGENT_ID            | claude-code                   | codex                   | gemini                   | openclaw                      |
| CONTEXT_PATH        | agents/claude-code/context.md | agents/codex/context.md | agents/gemini/context.md | agents/claude-code/context.md |
| BRANCH_PREFIX       | memory/claude-code/           | memory/codex/           | memory/gemini/           | memory/openclaw/              |
| AUTO_MERGE          | true                          | true                    | false                    | true                          |
| SMOKE_TEST          | true                          | false                   | false                    | true                          |
| LINEAR_UPDATE       | false                         | false                   | false                    | false                         |
| COMPACT_SIGNAL      | true                          | false                   | true                     | false                         |
| LEARNINGS_AGENT     | claude-code                   | codex                   | gemini                   | openclaw                      |
| VALIDATE_PRE_MERGE  | true                          | true                    | true                     | true                          |
| VALIDATE_POST_MERGE | true                          | false                   | false                    | true                          |
| GENERATE_MRD        | true                          | true                    | true                     | true                          |
| COLLECT_TELEMETRY   | true                          | true                    | true                     | false                         |

`LINEAR_UPDATE` defaults to `false` for all agents. Pass `--linear` to `/done` to enable Linear session tracking and follow-up issue creation for that run.

All agents run pre-merge validation by default. Post-merge validation only runs for agents that auto-merge (claude-code, openclaw). All agents generate MRDs when a Linear ticket is assigned. The gateway agent (openclaw) doesn't collect telemetry because it lacks session transcript access.

## Agent-Specific Overrides

### claude-code

- Runs validation gate (pnpm check, shellcheck) before summary
- Runs `/simplify` on changed code (skip with `--no-simplify`)
- Creates Linear session issues only when `--linear` is passed
- Triggers post-deploy smoke test
- Saves snapshot and signals user to start a new session (session-bootstrap hook provides continuity)

### codex

- Skips auto-merge (leaves PR open for review)
- Skips smoke test and Linear update
- Uses `~/.codex/skills/` for skill installation

### gemini

- Skips auto-merge (leaves PR open for review)
- Saves snapshot as final step
- Uses `~/.claude/skills/` for skill installation (shared with claude-code)

### openclaw

- Writes done-marker to `~/.openclaw/state/done-markers/`
- Runs validation gate (pnpm check, shellcheck)
- Runs `/simplify` on changed code (skip with `--no-simplify`)
- Creates Linear session issues only when `--linear` is passed
- Triggers post-deploy smoke test
- Ends with `/reset` to clear conversation
