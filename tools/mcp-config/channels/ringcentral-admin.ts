/**
 * RingCentral Admin channel.
 *
 * Phase C: served as Streamable HTTP from a single VM-hosted Python process
 * (port 18814, fronted by Tailscale funnel at /ringcentral-admin). Clients
 * connect over HTTP with a bearer token instead of spawning a local
 * subprocess. The same per-host renderer fills in the bearer at render
 * time from the host's gitignored .env file; tests substitute a redacted
 * placeholder so goldens stay reproducible.
 *
 * Wraps the RingCentral Platform API with the Remote Admin JWT (stored
 * server-side at EXULT_RC_CONFIG). Reads are always on; writes gated by
 * EXULT_RC_ALLOW_WRITES=1 in the supervisor env (Gautam-approval gate).
 */

import type { ChannelDef } from "../types.ts";

export const ringcentralAdmin: ChannelDef = {
  name: "ringcentral-admin",
  defaultLaunchStyle: "http",
  toolDirRel: "tools/ringcentral-admin",
  entryFile: "server.py",
  // See advancedmd.ts for rationale -- hard-coded claude-cloud URL so every
  // consuming host reaches the real server, not its own tailnet.
  httpUrl: () =>
    "https://claude-cloud.tail053faf.ts.net/ringcentral-admin/mcp",
  httpBearerEnvKey: "MCP_BEARER_TOKEN",
  env: [
    // Client-side env: the bearer token used to populate the
    // Authorization header at render time. Not embedded in the launched
    // process env -- it lives in the rendered headers block instead.
    { key: "MCP_BEARER_TOKEN", kind: "secret", required: true },
  ],
};
