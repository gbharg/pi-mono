/**
 * Host: claude-cloud (this Tailscale VM).
 *
 * Today's .mcp.json sits at /home/claude/repos/exult-agent/.mcp.json and
 * launches teams-channel + sendblue-channel via `bash -c "cd ... && exec bun run server.ts"`.
 *
 * NOTE: the sendblue tool dir on this host still lives in the legacy openclaw
 * repo (/home/claude/repos/openclaw/tools/sendblue-channel), not under
 * exult-agent. That's a phase-2 migration; phase 1 preserves it exactly.
 */

import type { HostDef } from "../types.ts";

export const host: HostDef = {
  hostname: "claude-cloud",
  user: "claude",
  repoRoot: "/home/claude/repos/exult-agent",
  binaries: {
    bun: "/home/claude/.bun/bin/bun",
  },
  tailscaleHost: "claude-cloud.tail053faf.ts.net",
  channels: [
    {
      channel: "sendblue",
      // VM sendblue server still lives in openclaw repo today. Phase 2 cleanup.
      toolDirAbs: "/home/claude/repos/openclaw/tools/sendblue-channel",
      env: {
        SENDBLUE_WEBHOOK_PORT: "18802",
        SENDBLUE_OWN_NUMBER: "+16292925296",
        SENDBLUE_WEBHOOK_URL:
          "https://claude-cloud.tail053faf.ts.net/sendblue/webhook/13df5edcb8054a5e",
      },
    },
    {
      channel: "teams",
      env: {
        MSTEAMS_WEBHOOK_PORT: "3978",
        MSTEAMS_WEBHOOK_URL:
          "https://claude-cloud.tail053faf.ts.net/teams/api/messages",
      },
    },
    {
      // Phase B: HTTP-launched MCP. Bearer token is read from the per-host
      // .env at render time and embedded in the Authorization header.
      channel: "advancedmd",
    },
    {
      // Phase C: HTTP-launched MCP. Bearer token is read from the per-host
      // .env at render time and embedded in the Authorization header.
      channel: "rippling",
    },
    {
      // Phase C: HTTP-launched MCP. Bearer token is read from the per-host
      // .env at render time and embedded in the Authorization header.
      channel: "ringcentral",
    },
    {
      // Phase C: HTTP-launched Python MCP on :18814, funneled at
      // /ringcentral-admin. Supervisor: ~/run-ringcentral-admin-mcp.sh;
      // env: ~/.config/ringcentral-admin-mcp.env (mode 0600).
      channel: "ringcentral-admin",
    },
    {
      // Phase C: HTTP-launched MCP (dual-listener -- same bun process also
      // runs the MS365 Graph delta-poll loop). Bearer token is read from
      // the per-host .env at render time.
      channel: "email",
    },
    {
      // Phase C: HTTP-launched python MCP. Same bearer pattern as advancedmd.
      channel: "docstrange",
    },
    {
      // Phase C: HTTP-launched MCP for the teams-channel bun process. The
      // SAME bun process (registered above as `teams`, stdio) also serves
      // Streamable HTTP on MCP_PORTS["teams-mcp"] (18811), exposed via the
      // Tailscale funnel at /teams-mcp. Bearer token shares the host-wide
      // MCP_BEARER_TOKEN.
      channel: "teams-mcp",
    },
  ],
};

export default host;
