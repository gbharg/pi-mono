/**
 * Email channel (Microsoft 365 / Microsoft Graph).
 *
 * Phase C: served as Streamable HTTP from a single VM-hosted bun process
 * (port 18810, fronted by Tailscale funnel at /email). Dual-listener
 * pattern -- the same bun process also runs the MS365 Graph delta-poll
 * loop in the background, surfacing inbound emails as MCP channel
 * notifications and exposing reply/send/forward/mark_read/flag tools.
 *
 * Bearer token is read from the per-host .env at render time and embedded
 * in the Authorization header; tests substitute a redacted placeholder.
 */

import type { ChannelDef } from "../types.ts";

export const email: ChannelDef = {
  name: "email-channel",
  defaultLaunchStyle: "http",
  toolDirRel: "tools/email-channel",
  entryFile: "server.ts",
  // See advancedmd.ts for rationale -- hard-coded claude-cloud URL so every
  // consuming host reaches the real server, not its own tailnet.
  httpUrl: () => "https://claude-cloud.tail053faf.ts.net/email/mcp",
  httpBearerEnvKey: "MCP_BEARER_TOKEN",
  env: [
    // Client-side env: the bearer token used to populate the
    // Authorization header at render time. Not embedded in the launched
    // process env -- it lives in the rendered headers block instead.
    { key: "MCP_BEARER_TOKEN", kind: "secret", required: true },
  ],
};
