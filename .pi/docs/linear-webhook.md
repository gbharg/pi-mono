# Linear Webhook Setup

## Overview
Receives Linear webhook events (Issue, Comment, Project changes) and writes them to ~/.pi/linear-inbox/ for Pi to process.

## Architecture
```
Linear Cloud
  → webhook POST to https://gautams-imac.tail053faf.ts.net:8443/linear/webhook
    → Tailscale Funnel (:8443)
      → Caddy (localhost:8443)
        → handle_path /linear/* strips prefix
          → Express webhook server (localhost:3002)
            → writes to ~/.pi/linear-inbox/<timestamp>-<type>-<action>.json
```

## Components

### Webhook Server
- **Location**: ~/pi-mono/.pi/services/linear-webhook/server.ts
- **Port**: 3002
- **Runtime**: TypeScript + Express + tsx
- **Inbox**: ~/.pi/linear-inbox/

### Caddy Route
- **Config**: ~/openclaw/tools/poke-mcp/Caddyfile
- **Route**: `handle_path /linear/*` → `reverse_proxy localhost:3002`
- **Auth**: None (external service callback)

### launchd Service
- **Plist**: ~/Library/LaunchAgents/com.pi-agent.linear-webhook.plist
- **KeepAlive**: true
- **Logs**: /tmp/pi-linear-webhook.log

### Linear Webhook Registration
- **Webhook ID**: 3032e329-a88c-488a-b81d-e6ad95229db3
- **URL**: https://gautams-imac.tail053faf.ts.net:8443/linear/webhook
- **Events**: Issue, Comment, Project
- **Scope**: All public teams

## Recovery Steps
1. Verify server: `curl http://localhost:3002/health`
2. If not: `launchctl load ~/Library/LaunchAgents/com.pi-agent.linear-webhook.plist`
3. Verify Caddy route: `curl http://localhost:8443/linear/health`
4. Verify end-to-end: `curl -sk https://gautams-imac.tail053faf.ts.net:8443/linear/health`
5. If webhook not firing: check Linear settings or re-register via API
