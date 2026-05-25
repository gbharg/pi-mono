/**
 * BlueBubbles iMessage bridge channel (a.k.a. bb-imessage).
 *
 * Today this only runs on gautams-imac-agent. The server name in mcpServers
 * is "bb-imessage" (legacy) — keep that for parity in phase 1.
 *
 * TODO(phase-2): the tool dir lives under /Users/Work/openclaw/tools/bb-imessage
 * on the iMac. Once we migrate to exult-agent monorepo, switch to
 * `tools/bb-imessage` under host.repoRoot like the others.
 */

import type { ChannelDef } from "../types.ts";

export const bluebubbles: ChannelDef = {
  name: "bb-imessage",
  // bb-imessage uses `bun run --cwd <dir> --shell=bun --silent start` today.
  defaultLaunchStyle: "bun-run-args",
  toolDirRel: "tools/bb-imessage",
  entryFile: "start",
  env: [
    { key: "BB_PASSWORD", kind: "secret", required: true },
    { key: "BB_HOST", kind: "config", required: false },
    { key: "BB_PORT", kind: "config", required: false },
  ],
};
