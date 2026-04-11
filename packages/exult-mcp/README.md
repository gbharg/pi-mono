# exult-mcp

Local stdio MCP servers wrapping Exult Healthcare operational services for use
in Claude Desktop and Claude Code. Each server is a self-contained Python
package that runs via `uv run` and reads credentials from the Exult config
directory.

## Servers in this package

| Server | Covers | Keragon overlap? | claude.ai hostable? |
|---|---|---|---|
| `ringcentral-admin` | RC Platform API: extensions, queues, IVR, detailed call log, voicemail + transcripts, phone numbers | Partial (Keragon has sendSms, basic getCompanyCallRecords, contacts). This MCP adds admin/paginated/voicemail coverage. | No (JWT stored locally, PHI in call logs) |
| `microsoft365-admin` | Graph app-only (tenant-wide) — directory, any user's mail/calendar, groups, SharePoint | No (claude_ai_Microsoft_365 is Gautam's personal delegated OAuth) | Yes, if wrapped in a Cloudflare Worker with OAuth in front |
| `advancedmd-xmlrpc` | `getUpdatedPatients`, `getUpdatedVisits`, `getVisitInfoByDate`, `getEhrUpdatedNotes`, `getAppointmentHistory`, raw escape hatch | **Complement** — Keragon covers patient/appointment CRUD but not the service-account-scoped `getUpdated*` family | No (PHI, session-cookie auth) |

## Services NOT in this package (coverage sources)

| Service | Where it's covered |
|---|---|
| AdvancedMD patient/appointment/billing CRUD | `claude_ai_Keragon__com_keragon_advancedmd_*` (remote MCP, already registered at claude.ai) |
| RingCentral SMS/fax, basic call records, contacts | `claude_ai_Keragon__com_keragon_ringcentral_*` |
| Microsoft 365 personal (Gautam's mailbox/calendar) | `claude_ai_Microsoft_365` remote MCP |
| Gmail / Google Calendar | `claude_ai_Gmail`, `claude_ai_Google_Calendar` |
| Linear | `claude_ai_Linear` |
| Slack | `claude_ai_Slack` |
| Cloudflare | `claude_ai_Cloudflare_Developer_Platform` |
| Vercel | `claude_ai_Vercel` |
| BlueBubbles iMessage | local `bluebubbles-channel` MCP |
| MyFax | **GAP** — parallel investigation agent working on creds (`/Users/agent/pi-mono/.pi/services/myfax_integration/` is empty) |
| PracticeMD | **GAP** — parallel investigation agent (`/Users/agent/pi-mono/.pi/services/practicemd_integration/` empty) |
| Curogram | **GAP** — investigation pending |
| Twilio | **GAP** — BAA evaluation pending (`/Users/agent/pi-mono/.pi/services/twilio_baa/` empty) |

Those four gaps will get their own MCP server subdirectory once the parallel
agents return with working credentials.

## Install all servers

```bash
for pkg in ringcentral-admin microsoft365-admin advancedmd-xmlrpc; do
  cd /Users/agent/pi-mono/packages/exult-mcp/$pkg
  uv venv --quiet
  uv pip install --quiet -e .
done
```

## Claude Desktop wiring

All three are already registered in
`~/Library/Application Support/Claude/claude_desktop_config.json`. Restart
Claude Desktop to pick them up. Credentials live outside the package at
`/Users/agent/pi-mono/.config/exult/*.json` — never committed.

## claude.ai remote MCP (hosting recipe)

claude.ai MCP servers must be publicly reachable HTTPS + OAuth. None of these
stdio servers can be added autonomously — Gautam has to register a public URL
via claude.ai settings UI.

For the ONE server that's suitable (`microsoft365-admin`), the hosting recipe:

1. Wrap the tool dispatch logic in a Cloudflare Worker using
   `@modelcontextprotocol/sdk` (TypeScript) or deploy this Python server on
   Vercel as a serverless function with the `mcp` SDK's HTTP transport.
2. Put the Graph client_secret in a Worker secret — never exposed to the
   browser.
3. Front the Worker with an OAuth provider (Auth0 or Clerk) that only allows
   `@exulthealthcare.com` accounts.
4. Register the public URL at claude.ai → Settings → Integrations → Add MCP
   server.

The `ringcentral-admin` and `advancedmd-xmlrpc` servers should **not** be
hosted on claude.ai — PHI exposure + session-cookie auth + local creds make
them local-only.

## Logs / debugging

Each server logs to stderr. Claude Desktop pipes server stderr to
`~/Library/Logs/Claude/mcp-server-<name>.log` — tail those files to see
auth failures, tool errors, and traceback dumps.

## Security

- Config JSON files contain live credentials. Do not commit them.
- The package-level `.gitignore` excludes `__pycache__/`, `.venv/`, and `.env`.
- Credential rotation procedure: update the config JSON in place; each server
  refreshes its token cache on the next tool call.
