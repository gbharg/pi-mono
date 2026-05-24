/**
 * Host: gautams-imac (user: agent).
 *
 * .mcp.json at /Users/agent/openclaw/.mcp.json. This host runs bb-imessage
 * (bluebubbles bridge) plus a sendblue-channel that lives under user `Work`'s
 * openclaw checkout. The rest are public npx-launched servers and inline HTTP
 * MCPs — modeled as passthrough until phase 2.
 *
 * TODO(phase-2): bb-imessage tool path is /Users/Work/openclaw/tools/bb-imessage
 * (legacy openclaw repo, cross-user). Once we migrate the bridge to exult-agent
 * we can drop the toolDirAbs override.
 */

import type { HostDef } from "../types.ts";

export const host: HostDef = {
  hostname: "gautams-imac-agent",
  user: "agent",
  repoRoot: "/Users/agent/openclaw",
  binaries: {
    bun: "/Users/Work/.bun/bin/bun",
    // bb-imessage entry point — TODO confirm absolute path once migrated.
    bbImessage: "/Users/Work/.bun/bin/bun",
  },
  tailscaleHost: "gautams-imac.tail053faf.ts.net",
  channels: [
    {
      channel: "bluebubbles",
      toolDirAbs: "/Users/Work/openclaw/tools/bb-imessage",
    },
    {
      channel: "sendblue",
      // sendblue here uses bash-cd-exec form pointing to user Work's openclaw.
      toolDirAbs: "/Users/Work/openclaw/tools/sendblue-channel",
    },
    // HTTP-launched MCP channels. The servers physically live on
    // claude-cloud (Tailscale VM); this host consumes them remotely with a
    // shared MCP_BEARER_TOKEN read from the per-host .env at render time.
    // Rippling moves from the local-spawn extraServers entry to the HTTP
    // channel modeled here.
    { channel: "advancedmd" },
    { channel: "ringcentral" },
    { channel: "ringcentral-admin" },
    { channel: "docstrange" },
    { channel: "rippling" },
    { channel: "email" },
    { channel: "teams-mcp" },
  ],
  extraServers: {
    nia: {
      type: "http",
      url: "https://apigcp.trynia.ai/mcp",
      headers: {
        Authorization: "Bearer ${NIA_API_KEY}",
      },
    },
    gmail: {
      command: "npx",
      args: ["-y", "gmail-mcp"],
      env: {
        GMAIL_CREDENTIALS_PATH: "~/.gmail-mcp/credentials.json",
        GMAIL_OAUTH_PATH: "~/.gmail-mcp/gcp-oauth.keys.json",
      },
    },
    fetch: {
      command: "npx",
      args: ["-y", "@anthropic/mcp-server-fetch"],
    },
    lume: {
      command: "lume",
      args: ["serve", "--mcp"],
    },
    agentation: {
      command: "npx",
      args: ["-y", "agentation", "mcp"],
    },
    commdb: {
      command: "npx",
      args: ["tsx", "/Users/Work/openclaw/tools/commdb/src/mcp-server.ts"],
      cwd: "/Users/Work/openclaw/tools/commdb",
    },
    paper: {
      type: "http",
      url: "http://127.0.0.1:29979/mcp",
    },
  },
};

export default host;
