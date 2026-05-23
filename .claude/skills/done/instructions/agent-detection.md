# Agent Detection

Resolve the running agent in this order:

1. `--agent` flag (e.g., `/done --agent codex`)
2. `OPENCLAW_AGENT_ID`
3. CLI tool name (`claude`, `codex`, `gemini`)
4. Default: `claude-code`
