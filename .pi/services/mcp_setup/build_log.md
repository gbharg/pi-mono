# Exult MCP Setup — Build Log

- **Date**: 2026-04-11
- **Agent**: Claude Code (Opus 4.6 1M)
- **Host**: gautams-imac (Tailscale 100.92.200.34)
- **Session task**: Discover MBP MCP configs, inventory iMac state, build
  missing MCP servers for Exult operational services, register with Claude
  Desktop.

## 1. MBP config discovery — GAP

- Tailscale listing shows `macbook` at `100.100.183.111`, last seen 8h ago,
  currently **offline**.
- `ssh -o ConnectTimeout=5 g@macbook` timed out (port 22 unreachable).
- No `~/.ssh/config` entry for the MBP on this iMac.
- **Outcome**: MBP config could NOT be ingested this session. Re-run the rsync
  step next time the MBP is online:
  ```bash
  rsync -av --progress \
    g@macbook:"'~/Library/Application Support/Claude/claude_desktop_config.json'" \
    /tmp/mbp-claude-desktop-config.json
  ```

## 2. iMac current MCP state

### Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`)

**Before this session**: no `mcpServers` key — only sidebar preferences.

**After this session**: 3 new stdio servers registered (see §4). Backup at
`~/Library/Application Support/Claude/claude_desktop_config.json.backup-20260411-012853`.

### Claude Code MCP tools loaded in THIS session (observed via tool manifest)

| Prefix | Source | Service coverage |
|---|---|---|
| `mcp__claude_ai_Cloudflare_Developer_Platform__*` | claude.ai remote | Cloudflare Workers, D1, R2, KV, Hyperdrive |
| `mcp__claude_ai_Gmail__*` | claude.ai remote | Gmail (personal OAuth) |
| `mcp__claude_ai_Google_Calendar__*` | claude.ai remote | GCal (personal OAuth) |
| `mcp__claude_ai_Keragon__com_keragon_advancedmd_*` | claude.ai remote | **AMD** — full patient/appt/billing CRUD |
| `mcp__claude_ai_Keragon__com_keragon_microsoftoutlook_*` | claude.ai remote | Outlook (Keragon's OAuth — Gautam's personal) |
| `mcp__claude_ai_Keragon__com_keragon_ringcentral_*` | claude.ai remote | **RC** — SMS, fax, call records, contacts |
| `mcp__claude_ai_Linear__*` | claude.ai remote | Linear issues/projects/docs |
| `mcp__claude_ai_Microsoft_365__*` | claude.ai remote | M365 — **Gautam's personal delegated OAuth** (single mailbox) |
| `mcp__claude_ai_Slack__*` | claude.ai remote | Slack |
| `mcp__claude_ai_Vercel__*` | claude.ai remote | Vercel |
| `mcp__bluebubbles-channel__*` | local stdio | iMessage (this iMac) |
| `mcp__craft__*` | local stdio | Craft notes |
| `mcp__apple-shortcuts__*` | local stdio | Apple Shortcuts |
| `mcp__plugin_github_github__*` | plugin | GitHub |
| `mcp__plugin_playwright_playwright__*` | plugin | Playwright |

### Coverage gap analysis

| Service | Covered by | Dedicated MCP needed? |
|---|---|---|
| AMD patient/appt CRUD | Keragon | NO — skip |
| AMD `getUpdated*` / service-account views | **nobody** (Keragon uses a different auth) | **YES** |
| RC SMS/fax/basic call records | Keragon | partial |
| RC extensions/queues/IVR/voicemail transcripts/pagination | **nobody** | **YES** |
| M365 (Gautam's personal) | claude_ai_Microsoft_365 | NO |
| M365 tenant-wide (Graph app-only) | **nobody** | **YES** |
| MyFax | nobody | pending investigation |
| PracticeMD | nobody | pending investigation |
| Curogram | nobody | pending investigation |
| Twilio | nobody | pending investigation |

## 3. New MCP servers built

All three under `/Users/agent/pi-mono/packages/exult-mcp/`:

### exult-ringcentral-admin (`packages/exult-mcp/ringcentral-admin/`)

- Language: Python 3.11+, `mcp`, `httpx`, `PyJWT`
- Transport: stdio
- Auth: RC JWT from `/Users/agent/pi-mono/.config/exult/ringcentral.json`
- Tools (11 all read-only): get_account_info, list_extensions, get_extension,
  list_call_queues, get_call_queue_members, pull_call_log, get_voicemails,
  get_voicemail_transcript, get_ivr_menus, list_phone_numbers,
  get_service_status
- **Live smoke test**: `get_account_info` returned account
  `2761864020 / Confirmed` — **PASS**

### exult-microsoft365-admin (`packages/exult-mcp/microsoft365-admin/`)

- Python 3.11+, `mcp`, `httpx`
- stdio
- Auth: client_credentials against Exult Agent Service app
  (`6725660a-f83a-4cb0-8892-14a223e0a701`) from
  `/Users/agent/pi-mono/.config/exult/microsoft365.json`
- Tools (11 all read-only): list_users, get_user, search_users, list_user_mail,
  get_mail_message, list_user_calendar, list_groups, list_group_members,
  list_sharepoint_sites, list_sharepoint_drive_items, get_tenant_details
- Known scope gaps (carried from
  `memory/reference_m365_app_scopes.md`): no password-reset, limited
  SharePoint depending on site-level grants — no tool exposed for those.
- **Live smoke test**: `/organization` returned
  `Exult Healthcare / 707a7153-af93-4b65-ae01-bfa6febbffdb` — **PASS**

### exult-advancedmd-xmlrpc (`packages/exult-mcp/advancedmd-xmlrpc/`)

- Python 3.11+, `mcp` only (uses stdlib urllib for XMLRPC to match existing
  `amd_xmlrpc_client.py` in `pi/services/cohort_analysis/`)
- stdio
- Auth: ARC022825 service account from
  `/Users/agent/pi-mono/.config/exult/amd_api_service.json` (office 161112)
- Tools (7 all read-only): login_probe, get_updated_patients,
  get_updated_visits, get_visit_info_by_date, get_ehr_updated_notes,
  get_appointment_history, raw_xmlrpc_request (escape hatch)
- Writes intentionally NOT exposed — per
  `memory/feedback_amd_writes.md`, every AMD write requires explicit Gautam
  approval, and Keragon already covers write ops with an audit trail.
- **Live smoke test**: Login + `getfieldsets` probe returned 3310 bytes with
  `<table>` elements — **PASS**

## 4. Claude Desktop registration

Updated `~/Library/Application Support/Claude/claude_desktop_config.json` to
add all 3 stdio entries under `mcpServers`. Commands use the absolute path
`/opt/homebrew/bin/uv` so the Claude Desktop app (which has a minimal PATH)
can find the binary.

Backup saved at
`~/Library/Application Support/Claude/claude_desktop_config.json.backup-20260411-012853`.

**Next step for Gautam**: quit and restart Claude Desktop. The servers will
appear in the MCP panel.

## 5. claude.ai remote MCP — MANUAL ACTION REQUIRED

None of the three new servers can be added autonomously to claude.ai (remote
MCP requires a public HTTPS endpoint + OAuth provider).

| Server | Suitable for claude.ai? | Why |
|---|---|---|
| `exult-microsoft365-admin` | Yes, IF wrapped in a Cloudflare Worker with OAuth | App-only creds can live in a Worker secret |
| `exult-ringcentral-admin` | No | PHI (caller numbers) + JWT file + session |
| `exult-advancedmd-xmlrpc` | No | PHI heavy + session-cookie auth tied to single origin |

If Gautam wants the M365 one on claude.ai, the hosting recipe is in
`packages/exult-mcp/README.md`.

## 6. Services still uncovered

- **MyFax** — parallel investigation agent working on creds. Stub directory
  `/Users/agent/pi-mono/.pi/services/myfax_integration/` is empty.
- **PracticeMD** — parallel investigation agent. Stub directory empty.
- **Curogram** — not started.
- **Twilio** — BAA evaluation pending. Stub directory empty.

When any of these become unblocked, drop a new subdirectory under
`packages/exult-mcp/` following the same layout (pyproject.toml + server.py +
README.md) and add an mcpServers entry.

## 7. Commit plan

- **Commit** (to `main`): packages/exult-mcp/** — all 3 server sources,
  pyproject.toml files, READMEs, package .gitignore, and this build log.
- **Do NOT commit**: any .config/exult/*.json (creds), any .venv/ or
  __pycache__/ left behind by uv.
- Claude Desktop config at
  `~/Library/Application Support/Claude/claude_desktop_config.json` is
  outside the git repo and is NOT committed.
