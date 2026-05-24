/**
 * Host: gautams-imac (user: exult).
 *
 * Today's .mcp.json at /Users/exult/exult-agent/.mcp.json launches sendblue
 * (under user `exult`) plus a bunch of channels owned by user `Work` from the
 * same iMac (cross-user via absolute paths). Phase 1 mirrors that exactly.
 *
 * Launch style is `bun-run-abs` (bun run <abs path> with cwd set), not the
 * `bash -c cd && exec` form used by the other hosts. This was the team's
 * original style and we keep it byte-identical in phase 1.
 */

import type { HostDef } from "../types.ts";

const WORK_REPO = "/Users/Work/Documents/GitHub/exult-agent";
const WORK_BUN = "/Users/Work/.bun/bin/bun";

// Shared RingCentral creds reused across teams + ringcentral channels today.
// Phase 1 keeps placeholders inline for byte-identical parity with the
// (also-placeholdered) goldens; the per-host .env file materializes the real
// secret values at supervisor render time. See render.test.ts for how the test
// harness substitutes placeholders into the rendered output before diffing.
const RC_CLIENT_ID = "<REDACTED_RINGCENTRAL_CLIENT_ID>";
const RC_CLIENT_SECRET = "<REDACTED_RINGCENTRAL_CLIENT_SECRET>";
const RC_JWT = "<REDACTED_RINGCENTRAL_JWT>";

export const host: HostDef = {
  hostname: "gautams-imac-exult",
  user: "exult",
  repoRoot: "/Users/exult/exult-agent",
  binaries: {
    bun: "/opt/homebrew/bin/bun",
  },
  tailscaleHost: "gautams-imac.tail053faf.ts.net",
  channels: [
    {
      channel: "sendblue",
      launchStyle: "bun-run-abs",
      env: {
        SENDBLUE_OWN_NUMBER: "+13053333940",
        SENDBLUE_WEBHOOK_URL: "https://gautams-imac.tail053faf.ts.net",
        SENDBLUE_WEBHOOK_PORT: "18800",
        SENDBLUE_WEBHOOK_PATH: "/webhook/13df5edcb8054a5e",
        SENDBLUE_STATE_DIR: "/Users/exult/.claude/channels/sendblue",
        HOME: "/Users/exult",
      },
    },
    {
      // teams-channel on this host launches from user Work's exult-agent checkout
      // (cross-user), using user Work's bun. Override path + launch style.
      channel: "teams",
      launchStyle: "bun-run-abs",
      toolDirAbs: `${WORK_REPO}/tools/teams-channel`,
      bunOverride: WORK_BUN,
      env: {
        MSTEAMS_WEBHOOK_PORT: "3978",
        RINGCENTRAL_CLIENT_ID: RC_CLIENT_ID,
        RINGCENTRAL_CLIENT_SECRET: RC_CLIENT_SECRET,
        RINGCENTRAL_JWT: RC_JWT,
        AMD_OFFICE_KEY: "<REDACTED_AMD_OFFICE_KEY>",
        AMD_USERNAME: "<REDACTED_AMD_USERNAME>",
        AMD_PASSWORD: "<REDACTED_AMD_PASSWORD>",
        AMD_APPNAME: "TEMP",
      },
    },
    // HTTP-launched MCP channels. The servers physically live on
    // claude-cloud (Tailscale VM); this host consumes them remotely with a
    // shared MCP_BEARER_TOKEN read from the per-host .env at render time.
    // Replaces the prior local-spawn extraServers entries for advancedmd,
    // ringcentral, ringcentral-admin, docstrange, and email-channel.
    { channel: "advancedmd" },
    { channel: "ringcentral" },
    { channel: "ringcentral-admin" },
    { channel: "docstrange" },
    { channel: "rippling" },
    { channel: "email" },
    { channel: "teams-mcp" },
  ],
  // Passthrough channels not yet modeled. Phase 2+ promotes these to proper channels.
  extraServers: {
    playwright: {
      command: "npx",
      args: ["@playwright/mcp@latest", "--browser", "chromium", "--caps", "vision,pdf"],
    },
  },
};

export default host;
