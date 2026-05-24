/**
 * docstrange channel.
 *
 * Phase C: served as Streamable HTTP from a VM-hosted python process
 * (port 18815, fronted by Tailscale funnel at /docstrange). Clients
 * connect over HTTP with a bearer token instead of spawning a local
 * subprocess. The same per-host renderer fills in the bearer at render
 * time from the host's gitignored .env file; tests substitute a redacted
 * placeholder so goldens stay reproducible.
 *
 * Note: server runtime is Python (mcp-shared/python/serve_mcp_over_http),
 * but the channel descriptor lives in TypeScript because the renderer is TS.
 */

import type { ChannelDef } from "../types.ts";

export const docstrange: ChannelDef = {
  name: "docstrange",
  defaultLaunchStyle: "http",
  toolDirRel: "tools/docstrange-mcp",
  entryFile: "server.py",
  // See advancedmd.ts for rationale -- hard-coded claude-cloud URL so every
  // consuming host reaches the real server, not its own tailnet.
  httpUrl: () => "https://claude-cloud.tail053faf.ts.net/docstrange/mcp",
  httpBearerEnvKey: "MCP_BEARER_TOKEN",
  env: [
    // Client-side env: the bearer token used to populate the
    // Authorization header at render time. Not embedded in the launched
    // process env -- it lives in the rendered headers block instead.
    { key: "MCP_BEARER_TOKEN", kind: "secret", required: true },
  ],
};
