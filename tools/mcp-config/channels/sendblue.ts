/**
 * Sendblue iMessage/SMS channel.
 *
 * One server per host. Each host has its own Sendblue subaccount, so the
 * API_KEY_ID, API_SECRET_KEY, and OWN_NUMBER are per-host secrets.
 *
 * SENDBLUE_WEBHOOK_PATH defaults to /webhook/13df5edcb8054a5e (shared rotation token).
 */

import type { ChannelDef } from "../types.ts";

export const sendblue: ChannelDef = {
  name: "sendblue-channel",
  defaultLaunchStyle: "bash-cd-exec",
  toolDirRel: "tools/sendblue-channel",
  entryFile: "server.ts",
  env: [
    { key: "SENDBLUE_API_KEY_ID", kind: "secret", required: true },
    { key: "SENDBLUE_API_SECRET_KEY", kind: "secret", required: true },
    { key: "SENDBLUE_OWN_NUMBER", kind: "config", required: false },
    { key: "SENDBLUE_WEBHOOK_URL", kind: "config", required: false },
    { key: "SENDBLUE_WEBHOOK_PORT", kind: "config", required: false },
    // Default webhook path is /webhook/13df5edcb8054a5e (per the team's rotation token).
    // Hosts that need it set it explicitly in their descriptor's env override.
    // It is NOT applied automatically because claude-cloud embeds the path inside
    // SENDBLUE_WEBHOOK_URL and would diverge from the byte-identical golden otherwise.
    { key: "SENDBLUE_WEBHOOK_PATH", kind: "config", required: false },
    { key: "SENDBLUE_STATE_DIR", kind: "config", required: false },
    { key: "HOME", kind: "config", required: false },
  ],
};
