/**
 * RingCentral MCP channel.
 *
 * Phase C: served as Streamable HTTP from a single VM-hosted bun process
 * (port 18813, fronted by Tailscale funnel at /ringcentral). Clients
 * connect over HTTP with a bearer token instead of spawning a local
 * subprocess. The same per-host renderer fills in the bearer at render
 * time from the host's gitignored .env file; tests substitute a redacted
 * placeholder so goldens stay reproducible.
 */

import type { ChannelDef } from "../types.ts";

export const ringcentral: ChannelDef = {
  name: "ringcentral",
  defaultLaunchStyle: "http",
  toolDirRel: "tools/ringcentral-mcp",
  entryFile: "server.ts",
  // See advancedmd.ts for rationale -- hard-coded claude-cloud URL so every
  // consuming host reaches the real server, not its own tailnet.
  httpUrl: () => "https://claude-cloud.tail053faf.ts.net/ringcentral/mcp",
  httpBearerEnvKey: "MCP_BEARER_TOKEN",
  env: [
    // Client-side env: the bearer token used to populate the
    // Authorization header at render time. Not embedded in the launched
    // process env -- it lives in the rendered headers block instead.
    { key: "MCP_BEARER_TOKEN", kind: "secret", required: true },
  ],
};
