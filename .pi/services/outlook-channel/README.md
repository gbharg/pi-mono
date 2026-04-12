# outlook-channel

Real-time Outlook email channel for Claude Code. When a message arrives at
`agent@exulthealthcare.com`, the running Claude Code session receives a
`<channel source="outlook-channel">` injection, same pattern as
`bluebubbles-channel` delivers iMessages.

Status: **scaffolded, not installed, not registered.** Human review required
before `bun install` / `claude mcp add`.

## Architecture

This is **Option B: polling MCP server**. Three options were considered:

| Option | Push fidelity | Infra required | Completeness |
| --- | --- | --- | --- |
| A. Graph change notifications (webhooks) | True push, <1s latency | Public HTTPS endpoint with valid cert, subscription renewal every 3 days, validation handshake | 10/10 |
| **B. Polling MCP server (this)** | ~30s latency | None — runs as MCP stdio child of Claude Code | **8/10** |
| C. Cron + file-drop hook | ~60s latency, not real-time | launchd/cron only | 6/10 |

**Why B:** No public-facing HTTPS endpoint exists on this iMac. The only
cloudflared tunnel running is BlueBubbles' private one (localhost:1234 to a
BB-owned trycloudflare subdomain). Caddy at 127.0.0.1:8443 is localhost-only
for poke-mcp. Option A would require provisioning a new Cloudflare named
tunnel + cert + subscription-renewal cron, which is an open-ended infra task.
Option B delivers the same user experience with ~30s lag and zero new infra.

Upgrade path to A: only the poller block (`pollOnce` + `setInterval`) needs
replacement with an HTTPS listener that handles `validationToken` and POST
notification bodies. MCP tools + channel-notification code stay identical.

## How it works

1. On startup, loads `/Users/agent/pi-mono/.config/exult/microsoft365.json`
   and acquires an app-only Graph token via client_credentials.
2. Connects to Claude Code as an MCP stdio server (tools namespace
   `mcp__outlook-channel__*`).
3. Every 30s, polls
   `GET /users/agent@exulthealthcare.com/messages?$filter=receivedDateTime gt <cursor>`
   — only fetches headers + bodyPreview, not full body (PHI minimization).
4. For each new message, emits an MCP notification with method
   `notifications/claude/channel`. Claude Code renders that as a
   `<channel source="outlook-channel" message_id="..." from="..." subject="...">`
   tag in the running session.
5. Persists the cursor (last `receivedDateTime`) and a seen-id map to
   `~/.claude/channels/outlook/` so restarts don't replay or miss messages.
6. Refreshes the access token when <5 min remaining on expiry.

## Tools exposed

- `outlook_inbox_recent(count?: number)` — fetch recent headers (default 10,
  max 50).
- `outlook_read_message(id: string)` — fetch full body for a message id.
- `outlook_send_reply(id: string, body: string)` — reply via Graph `/reply`
  endpoint, preserving threading.

## PHI handling

- Logs (stderr only): subjects truncated to 60 chars via `redact()`,
  reply bodies to 100 chars. Message bodies NEVER written to logs.
- Cursor state (`~/.claude/channels/outlook/cursor.json`): contains only an
  ISO timestamp. No PHI.
- Seen state (`~/.claude/channels/outlook/seen.json`): Graph message ids +
  first-seen epoch ms. Message ids are opaque but should still be treated as
  sensitive. Files created with mode 0600.
- Channel injections to Claude Code: `bodyPreview` only (Graph truncates to
  ~255 chars, already plain text). Full body requires explicit
  `outlook_read_message` call — gives the agent a chance to decide before
  pulling PHI into context.

## Setup (human reviewer)

```bash
cd /Users/agent/pi-mono/.pi/services/outlook-channel

# 1. Install deps
bun install

# 2. Smoke test — should log "MCP connected" and "poller active",
#    then emit "acquired new token" and begin polling. Ctrl-C to stop.
bun run server.ts

# 3. Register with Claude Code
claude mcp add outlook-channel \
  --scope user \
  -- bun run /Users/agent/pi-mono/.pi/services/outlook-channel/server.ts
```

### First-run behaviour

On the very first run, the cursor file does not exist and the poller starts
with `lastReceived = now()`. This is intentional — it prevents backfilling
the entire inbox on startup. Only messages received after the first launch
will be delivered.

To test with an actual inbound, send an email to
`agent@exulthealthcare.com` from any other account after the server is
running. Within 30s, the agent session should see:

```
<channel source="outlook-channel" message_id="AAMk..." from="sender@example.com" subject="Test">
From: Sender Name <sender@example.com>
Subject: Test
Received: 2026-04-10T13:45:02Z
Attachments: no

Hello there — this is a test message body preview...
</channel>
```

## Environment overrides

| Env var | Default |
| --- | --- |
| `OUTLOOK_CREDS_PATH` | `/Users/agent/pi-mono/.config/exult/microsoft365.json` |
| `OUTLOOK_MAILBOX` | `agent@exulthealthcare.com` |
| `OUTLOOK_POLL_MS` | `30000` |
| `OUTLOOK_STATE_DIR` | `~/.claude/channels/outlook` |

## Known limitations

- **30s latency floor.** For true push, implement Option A later.
- **Single mailbox.** Hard-coded to `agent@exulthealthcare.com`. The app has
  tenant-wide `Mail.ReadWrite` so expanding is a config change, but the
  current scope is intentional — this is a COO-inbound channel, not a shared
  mailbox monitor.
- **No access control on inbound.** Unlike bluebubbles-channel which
  allowlists senders, this channel forwards every new message in the
  mailbox. Rationale: Gautam controls who can reach `agent@` via M365 tenant
  policies. Add sender-allowlist here if that changes.
- **`outlook_send_reply` has no approval gate.** bluebubbles-channel relays
  permission prompts to iMessage; this channel does not. If you want
  per-reply approval, hook into `notifications/claude/channel/permission`
  following the bluebubbles pattern.
- **Body fetching pulls full HTML.** `outlook_read_message` does a minimal
  HTML-strip. If you need clean text, pipe through a sanitizer library
  before injecting.
- **No attachment handling.** Attachments are flagged (`Attachments: yes`)
  but bytes are not fetched. Add a `outlook_read_attachment(id, attId)` tool
  if needed.

## Files

- `server.ts` — MCP stdio server (poller + tools)
- `package.json` — deps: `@modelcontextprotocol/sdk`, `zod` (same versions as
  `bluebubbles-channel`)
- `README.md` — this file
