# SendBlue iMessage Channel Setup

## Overview
Always-on iMessage channel for Pi, using SendBlue API v2 for send/receive via webhook.

## Credentials
- SendBlue API Key ID: `f7bf1a10e3f41bad4d4ef944bfc8da6a`
- SendBlue API Secret: stored in ~/imessage-channel/.env
- SendBlue Number: +16292925296
- Allowed Numbers: +19723637754 (Gautam)
- Linear API Key: stored in ~/imessage-channel/.env (needs to move to central location)

## Architecture
```
Gautam's iPhone
  → iMessage → SendBlue Cloud
    → webhook POST to https://gautams-imac.tail053faf.ts.net:8443/sendblue/webhook
      → Tailscale Funnel (:8443)
        → Caddy (localhost:8443, bind 127.0.0.1)
          → handle_path /sendblue/* strips prefix
            → Express webhook server (localhost:3001)
              → auto read receipt + typing indicator
              → writes to ~/.imessage-channel/inbox/<timestamp>.json
                → Pi extension polls inbox every 500ms
                  → pi.sendUserMessage() with deliverAs: "followUp"
                    → appears in Pi session as [iMessage from ...]
```

## Components

### 1. Webhook Server (~/imessage-channel/)
- **Runtime**: TypeScript + Express v5 + tsx
- **Port**: 3001
- **Entry**: src/index.ts
- **Config**: .env (source before running)
- **Key files**:
  - src/config.ts — loads env vars
  - src/sendblue-client.ts — REST client for SendBlue API
  - src/webhook-server.ts — Express webhook endpoints (/webhook, /webhook/typing, /health)
  - src/channel.ts — auto read receipt + typing indicator on inbound
  - src/message-log.ts — appends to messages.jsonl
  - src/cli.ts — command-line tools for send/reply/react/history
  - imessage — convenience wrapper script

### 2. Caddy Reverse Proxy
- **Config**: ~/openclaw/tools/poke-mcp/Caddyfile
- **Route**: `handle_path /sendblue/*` → `reverse_proxy localhost:3001`
- **Auth**: No auth on /sendblue/* (bypasses Bearer token required for other routes)
- **Binding**: `bind 127.0.0.1` to avoid conflict with Tailscale Funnel

### 3. Tailscale Funnel
- **URL**: https://gautams-imac.tail053faf.ts.net:8443
- **Route**: / → proxy http://localhost:8443 (Caddy)
- **Config**: `tailscale serve` (already configured, funnel on)

### 4. launchd Service
- **Plist**: ~/Library/LaunchAgents/com.imessage-channel.plist
- **KeepAlive**: true
- **RunAtLoad**: true
- **Logs**: /tmp/imessage-channel.log, /tmp/imessage-channel.err
- **Env vars**: All SendBlue creds + WEBHOOK_PORT + LOG_LEVEL baked into plist

### 5. Pi Extension
- **Location**: ~/.pi/agent/extensions/imessage-channel/
- **Entry**: index.ts + package.json
- **Deps**: @sinclair/typebox (for tool parameter schemas)
- **Behavior**:
  - On session_start: polls ~/.imessage-channel/inbox/ every 500ms
  - New .json file → reads, deletes, calls pi.sendUserMessage() with deliverAs: "followUp"
  - Registers tools: imessage_reply, imessage_react, imessage_history
  - Loads SendBlue creds from ~/imessage-channel/.env directly
  - Shows status: "📱 iMessage channel active (+16292925296)"

## CLI Usage
```bash
cd ~/imessage-channel
./imessage send "Hello"
./imessage reply <message_handle> "Reply text"
./imessage react <message_handle> like
./imessage history [limit]
./imessage read
./imessage typing
```

## SendBlue API Endpoints Used
- POST /api/send-message — send (requires from_number)
- POST /api/send-reaction — tapback (from_number, number, message_handle, reaction)
- POST /api/mark-read — read receipt (from_number, number)
- POST /api/send-typing-indicator — typing bubble (from_number, number)
- GET /api/v2/messages — fetch history (params: number, limit)

## Known Limitations
- SendBlue webhook does NOT include reply_to/thread reference — can't see which message Gautam is replying to
- Free tier ("free_api" plan)
- Reactions on specific messages may have limited reliability

## Recovery Steps (if machine crashes)
1. Verify Tailscale is connected: `tailscale status`
2. Verify Caddy is running: `curl http://localhost:8443/sendblue/health`
3. If not: `launchctl load ~/Library/LaunchAgents/com.openclaw.caddy-proxy.plist`
4. Verify webhook server: `curl http://localhost:3001/health`
5. If not: `launchctl load ~/Library/LaunchAgents/com.imessage-channel.plist`
6. Verify end-to-end: `curl -sk https://gautams-imac.tail053faf.ts.net:8443/sendblue/health`
7. Pi extension loads automatically on session start (reads inbox dir)
