/**
 * Channel registry. Add new channels here.
 *
 * Phase 1 models three messaging channels: sendblue, teams, bluebubbles.
 * Everything else (email-channel, gmail, fetch, ...) is rendered as a
 * passthrough via `host.extraServers` for now.
 *
 * Phase B added advancedmd (HTTP transport).
 * Phase C added rippling, ringcentral, ringcentral-admin, email, docstrange (HTTP transport).
 */

import type { ChannelDef } from "../types.ts";
import { sendblue } from "./sendblue.ts";
import { teams } from "./teams.ts";
import { teamsMcp } from "./teams-mcp.ts";
import { bluebubbles } from "./bluebubbles.ts";
import { advancedmd } from "./advancedmd.ts";
import { rippling } from "./rippling.ts";
import { ringcentral } from "./ringcentral.ts";
import { ringcentralAdmin } from "./ringcentral-admin.ts";
import { email } from "./email.ts";
import { docstrange } from "./docstrange.ts";

export const channels: Record<string, ChannelDef> = {
  sendblue,
  teams,
  "teams-mcp": teamsMcp,
  bluebubbles,
  advancedmd,
  rippling,
  ringcentral,
  // Hyphenated channel name: cannot be a bare identifier, so use the
  // string-key form. The camelCase ringcentralAdmin binding is the
  // import only -- the on-disk channel name is "ringcentral-admin".
  "ringcentral-admin": ringcentralAdmin,
  email,
  docstrange,
};

export function getChannel(id: string): ChannelDef {
  const c = channels[id];
  if (!c) {
    throw new Error(
      `Unknown channel: "${id}". Known channels: ${Object.keys(channels).join(", ")}`,
    );
  }
  return c;
}

export {
  sendblue,
  teams,
  teamsMcp,
  bluebubbles,
  advancedmd,
  rippling,
  ringcentral,
  ringcentralAdmin,
  email,
  docstrange,
};
