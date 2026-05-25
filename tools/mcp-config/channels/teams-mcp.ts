/**
 * teams-mcp channel — Streamable HTTP transport for teams-channel.
 *
 * Phase C: teams-channel server.ts now runs THREE concerns in one bun
 * process:
 *   1. Stdio MCP transport (for the local Claude parent that supervises it)
 *   2. Streamable HTTP MCP transport on MCP_PORTS["teams-mcp"] (18811)
 *   3. Bot Framework webhook listener on port 3978 (UNCHANGED)
 *
 * This channel def models concern (2): remote MCP clients (e.g. claude.ai)
 * connect via the Tailscale funnel at https://<host>/teams-mcp/mcp with
 * a bearer token, exactly the same pattern as advancedmd-mcp in Phase B.
 *
 * The original `teams` channel (stdio launch for the local supervisor)
 * is preserved separately. A given host typically registers EITHER
 * `teams` (legacy stdio) OR `teams-mcp` (HTTP), not both -- claude-cloud
 * is the VM that runs the stdio supervisor; remote hosts use HTTP.
 */

import type { ChannelDef } from "../types.ts";

export const teamsMcp: ChannelDef = {
  name: "teams-mcp",
  defaultLaunchStyle: "http",
  toolDirRel: "tools/teams-channel",
  entryFile: "server.ts",
  // See advancedmd.ts for rationale -- hard-coded claude-cloud URL so every
  // consuming host reaches the real server, not its own tailnet.
  httpUrl: () => "https://claude-cloud.tail053faf.ts.net/teams-mcp/mcp",
  httpBearerEnvKey: "MCP_BEARER_TOKEN",
  env: [
    { key: "MCP_BEARER_TOKEN", kind: "secret", required: true },
  ],
};
