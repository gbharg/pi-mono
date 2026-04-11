# exult-mcp-ringcentral-admin

Local stdio MCP server wrapping the RingCentral Platform API with the Exult
"Remote Admin" JWT app. Covers account-level admin operations that Keragon's
RingCentral MCP does **not** expose.

## Tools

Read-only unless `EXULT_RC_ALLOW_WRITES=1` is set (no write tools are
implemented yet — all tools here are read-only).

- `get_account_info`
- `list_extensions` (with type/status filters)
- `get_extension`
- `list_call_queues`
- `get_call_queue_members`
- `pull_call_log` (detailed, paginated, recording URLs)
- `get_voicemails` (message store listing)
- `get_voicemail_transcript` (AudioTranscription attachment)
- `get_ivr_menus`
- `list_phone_numbers`
- `get_service_status`

## Install

Requires `uv` or Python 3.11+.

```bash
cd /Users/agent/pi-mono/packages/exult-mcp/ringcentral-admin
uv venv
uv pip install -e .
```

## Run (smoke test)

```bash
EXULT_RC_CONFIG=/Users/agent/pi-mono/.config/exult/ringcentral.json \
  uv run --project /Users/agent/pi-mono/packages/exult-mcp/ringcentral-admin \
  python server.py < /dev/null
```

(It will wait for stdio traffic; use the Claude Desktop client to speak to it.)

## Claude Desktop wiring

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "exult-ringcentral-admin": {
      "command": "uv",
      "args": [
        "--directory",
        "/Users/agent/pi-mono/packages/exult-mcp/ringcentral-admin",
        "run",
        "python",
        "server.py"
      ],
      "env": {
        "EXULT_RC_CONFIG": "/Users/agent/pi-mono/.config/exult/ringcentral.json"
      }
    }
  }
}
```

## Config

Reads credentials from `EXULT_RC_CONFIG` (default
`/Users/agent/pi-mono/.config/exult/ringcentral.json`). The file must contain
`client_id`, `client_secret`, `jwt`, and `server`. Never commit this file.

## claude.ai remote MCP

Not suitable for claude.ai remote hosting as-is because:

1. It reads a local JWT file — would need OAuth-based user-credential wrapping.
2. PHI in call logs (caller numbers are PHI under some interpretations).

For a hosted variant, wrap in a Cloudflare Worker + OAuth provider gated on
Exult SSO — see `/Users/agent/pi-mono/packages/exult-mcp/README.md` for the
hosting recipe outline.
