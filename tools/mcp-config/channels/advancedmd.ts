/**
 * AdvancedMD EMR/PM channel.
 *
 * Phase B: served as Streamable HTTP from a single VM-hosted bun process
 * (port 18812, fronted by Tailscale funnel at /advancedmd). Clients
 * connect over HTTP with a bearer token instead of spawning a local
 * subprocess. The same per-host renderer fills in the bearer at render
 * time from the host's gitignored .env file; tests substitute a redacted
 * placeholder so goldens stay reproducible.
 */

import type { ChannelDef } from "../types.ts";

export const advancedmd: ChannelDef = {
  name: "advancedmd",
  defaultLaunchStyle: "http",
  toolDirRel: "tools/advancedmd-mcp",
  entryFile: "server.ts",
  // MCP servers physically live on claude-cloud; all consuming hosts (iMac,
  // MBP, claude-cloud itself) reach them at the same fixed URL. Hard-coding
  // avoids the bug where per-host tailscaleHost would point clients at
  // their own tailnet instead of the actual server location.
  httpUrl: () => "https://claude-cloud.tail053faf.ts.net/advancedmd/mcp",
  httpBearerEnvKey: "MCP_BEARER_TOKEN",
  env: [
    // Client-side env: the bearer token used to populate the
    // Authorization header at render time. Not embedded in the launched
    // process env -- it lives in the rendered headers block instead.
    { key: "MCP_BEARER_TOKEN", kind: "secret", required: true },
  ],
};
