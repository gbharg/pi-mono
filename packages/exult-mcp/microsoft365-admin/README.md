# exult-mcp-microsoft365-admin

Local stdio MCP server wrapping Microsoft Graph with the Exult Agent Service
app-only (client_credentials) identity. Covers tenant-wide admin that the
personal `claude_ai_Microsoft_365` remote MCP does not — that one is Gautam's
delegated OAuth, scoped to his single mailbox.

## Tools

All read-only today.

- `list_users` (directory listing with $filter, $top, $select)
- `get_user`
- `search_users` (startswith displayName/mail)
- `list_user_mail` (any tenant mailbox, service-account scope)
- `get_mail_message`
- `list_user_calendar` (calendar view window)
- `list_groups`
- `list_group_members`
- `list_sharepoint_sites`
- `list_sharepoint_drive_items`
- `get_tenant_details`

## Known scope gaps

Per `/Users/agent/pi-mono/memory/reference_m365_app_scopes.md` (verified
2026-04-10), the Exult Agent Service app **cannot**:

- Reset user passwords without a separate Graph role grant
- Access all SharePoint sites uniformly — depends on site-level grants

That's why no password-reset tool is exposed here.

## Install

```bash
cd /Users/agent/pi-mono/packages/exult-mcp/microsoft365-admin
uv venv
uv pip install -e .
```

## Claude Desktop wiring

```json
{
  "mcpServers": {
    "exult-microsoft365-admin": {
      "command": "uv",
      "args": [
        "--directory",
        "/Users/agent/pi-mono/packages/exult-mcp/microsoft365-admin",
        "run",
        "python",
        "server.py"
      ],
      "env": {
        "EXULT_M365_CONFIG": "/Users/agent/pi-mono/.config/exult/microsoft365.json"
      }
    }
  }
}
```

## claude.ai remote MCP

Hostable as a Cloudflare Worker if you wrap with OAuth. The client_credentials
token never leaves the Worker — the client connecting (claude.ai) authenticates
via your OAuth provider and the Worker translates calls. Do **not** expose the
raw client_secret to the browser.
