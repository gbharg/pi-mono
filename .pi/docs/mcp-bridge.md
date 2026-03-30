# Pi MCP Bridge

## Overview
OAuth proxy for MCP servers. Handles token management so Pi can talk to Linear (and future services) through a local endpoint.

## Architecture
```
Pi → http://localhost:3100/linear → MCP Bridge → OAuth token injection → https://mcp.linear.app/mcp
```

## Setup

### 1. Server is running (launchd)
- **Plist**: ~/Library/LaunchAgents/com.pi-agent.mcp-bridge.plist
- **Port**: 3100
- **Health**: http://localhost:3100/health

### 2. Authenticate with Linear (requires Gautam)
```bash
cd ~/pi-mono/.pi/services/mcp-bridge
bun run src/cli.ts auth linear
```
This opens a browser for OAuth consent. Gautam needs to click "Authorize".

### 3. Verify
```bash
bun run src/cli.ts status
```
Should show: `Linear: ✓ valid`

### 4. Configure Pi to use the MCP bridge
Add to Pi's settings.json or .pi/settings.json:
```json
{
  "mcpServers": {
    "linear": {
      "type": "http",
      "url": "http://localhost:3100/linear"
    }
  }
}
```

## Files
- Server: .pi/services/mcp-bridge/src/server.ts (Hono HTTP proxy)
- Auth: .pi/services/mcp-bridge/src/auth.ts (OAuth PKCE flow)
- Store: .pi/services/mcp-bridge/src/store.ts (token persistence at ~/.mcp-bridge/)
- Config: .pi/services/mcp-bridge/servers.json (upstream MCP URLs)

## Adding More Services
Add to servers.json:
```json
{
  "figma": {
    "url": "https://mcp.figma.com/mcp",
    "name": "Figma"
  }
}
```
Then: `bun run src/cli.ts auth figma`

## Recovery
1. Check health: `curl http://localhost:3100/health`
2. If down: `launchctl load ~/Library/LaunchAgents/com.pi-agent.mcp-bridge.plist`
3. If auth expired: `cd .pi/services/mcp-bridge && bun run src/cli.ts auth linear`
