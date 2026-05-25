/**
 * Host: macbook (user: Work, a.k.a. mbp-work).
 *
 * .mcp.json at /Users/Work/pi-mono/.mcp.json — only the sendblue channel
 * runs here. Supervisor wrapper: /Users/Work/.local/bin/sendblue-pi-forever.sh
 * (do not modify in phase 1).
 */

import type { HostDef } from "../types.ts";

export const host: HostDef = {
  hostname: "mbp-work",
  user: "Work",
  repoRoot: "/Users/Work/openclaw",
  binaries: {
    bun: "/Users/Work/.bun/bin/bun",
  },
  tailscaleHost: "macbook.tail053faf.ts.net",
  channels: [
    {
      channel: "sendblue",
      // sendblue tool dir is /Users/Work/openclaw/tools/sendblue-channel (matches repoRoot).
      env: {
        SENDBLUE_OWN_NUMBER: "+16452468277",
        SENDBLUE_WEBHOOK_URL: "https://macbook.tail053faf.ts.net",
        SENDBLUE_WEBHOOK_PORT: "18803",
        SENDBLUE_WEBHOOK_PATH: "/webhook/13df5edcb8054a5e",
      },
    },
    // HTTP-launched MCP channels. The servers physically live on
    // claude-cloud (Tailscale VM); this host consumes them remotely with a
    // shared MCP_BEARER_TOKEN read from the per-host .env at render time.
    { channel: "advancedmd" },
    { channel: "ringcentral" },
    { channel: "ringcentral-admin" },
    { channel: "docstrange" },
    { channel: "rippling" },
    { channel: "email" },
    { channel: "teams-mcp" },
  ],
};

export default host;
