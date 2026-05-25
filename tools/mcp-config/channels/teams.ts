/**
 * Microsoft Teams bot channel.
 *
 * Env vars come from the registered Azure AD app + tenant.
 */

import type { ChannelDef } from "../types.ts";

export const teams: ChannelDef = {
  name: "teams-channel",
  defaultLaunchStyle: "bash-cd-exec",
  toolDirRel: "tools/teams-channel",
  entryFile: "server.ts",
  env: [
    { key: "MSTEAMS_APP_ID", kind: "secret", required: true },
    { key: "MSTEAMS_APP_PASSWORD", kind: "secret", required: true },
    { key: "MSTEAMS_TENANT_ID", kind: "secret", required: true },
    { key: "MSTEAMS_WEBHOOK_PORT", kind: "config", required: false, default: "3978" },
    { key: "MSTEAMS_WEBHOOK_URL", kind: "config", required: false },
    // RingCentral creds appear in some hosts' teams env today (legacy / shared).
    // Phase 1 supports them as optional; phase 2 should split into a dedicated channel.
    { key: "RINGCENTRAL_CLIENT_ID", kind: "secret", required: false },
    { key: "RINGCENTRAL_CLIENT_SECRET", kind: "secret", required: false },
    { key: "RINGCENTRAL_JWT", kind: "secret", required: false },
    { key: "AMD_OFFICE_KEY", kind: "secret", required: false },
    { key: "AMD_USERNAME", kind: "secret", required: false },
    { key: "AMD_PASSWORD", kind: "secret", required: false },
    { key: "AMD_APPNAME", kind: "config", required: false },
  ],
};
