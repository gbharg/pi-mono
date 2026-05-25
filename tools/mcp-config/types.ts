/**
 * Shared types for the mcp-config renderer.
 */

import type { Json } from "./canonical.ts";

/** Whether an env var is a secret (do not log) or plain config. */
export type EnvKind = "secret" | "config";

/** Declared env requirement for a channel. */
export interface EnvSpec {
  key: string;
  kind: EnvKind;
  /** If true, render fails when the value is missing (unless --allow-missing). */
  required: boolean;
  /** Static default value (host descriptors may override). */
  default?: string;
}

/**
 * How the MCP server process is launched.
 *
 *  - `bash-cd-exec`: `bash -c "cd <toolDir> && exec <bun> run <entry>"`
 *    Used by claude-cloud, mbp-work, gautams-imac-agent for sendblue today.
 *
 *  - `bun-run-abs`: `<bun> run <absoluteEntryPath>` with `cwd` set to toolDir.
 *    Used by gautams-imac-exult for sendblue + teams today.
 *
 *  - `bun-run-args`: `<bun> run --cwd <toolDir> --shell=bun --silent start`
 *    Used by gautams-imac-agent for bb-imessage today.
 *
 *  - `http`: no local process; client connects to a remote Streamable HTTP
 *    endpoint with a bearer token. Used by advancedmd-mcp (Phase B) and
 *    will be the default for new VM-hosted MCP servers.
 *
 * Phase 1 keeps all three legacy styles so we get byte-identical parity.
 * Phase 2+ will likely collapse the legacy styles into one canonical form.
 */
export type LaunchStyle = "bash-cd-exec" | "bun-run-abs" | "bun-run-args" | "http";

/**
 * Resolved server entry written to .mcp.json.
 *
 * Process-launched entries (the legacy stdio path) carry `command` + `args`
 * and optionally `cwd` and `env`. HTTP-launched entries (Phase B+) carry
 * `type: "streamable-http"`, `url`, and `headers` instead. The two
 * variants are mutually exclusive at the schema level; we model them with
 * optional fields here for renderer simplicity.
 */
export interface McpServerEntry {
  command?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  type?: string;
  url?: string;
  headers?: Record<string, string>;
}

/** Channel definition (modeled, secret-aware). */
export interface ChannelDef {
  /** Server name as it appears in mcpServers. */
  name: string;
  /** Default launch style; host can override via channel options. */
  defaultLaunchStyle: LaunchStyle;
  /** Path under host.repoRoot to the channel's tool directory. */
  toolDirRel: string;
  /** Entry file name relative to toolDir (for bash-cd-exec & bun-run-abs). */
  entryFile: string;
  /** Declared env vars (required + optional). */
  env: EnvSpec[];
  /**
   * Builder for the remote MCP endpoint URL when launch style is `"http"`.
   * Called with the resolved host descriptor so the channel can reference
   * `host.tailscaleHost` etc. Required when defaultLaunchStyle === "http"
   * OR any host overrides launchStyle to "http".
   */
  httpUrl?: (host: HostDef) => string;
  /**
   * Env key whose value is sent as the bearer token in the Authorization
   * header for `http` launch style. Defaults to "MCP_BEARER_TOKEN".
   */
  httpBearerEnvKey?: string;
}

/** Per-host channel inclusion + overrides. */
export interface HostChannelRef {
  channel: string;
  /** Override launch style for this host. */
  launchStyle?: LaunchStyle;
  /** Static env overrides not coming from .env files (e.g. webhook URL). */
  env?: Record<string, string>;
  /** Path overrides: e.g. claude-cloud sendblue still lives in openclaw repo. */
  toolDirAbs?: string;
  /** Override the bun binary used to launch this channel (cross-user setups). */
  bunOverride?: string;
}

/** Host descriptor. */
export interface HostDef {
  hostname: string;
  user: string;
  /** Absolute path to repo root used to resolve channel tool dirs. */
  repoRoot: string;
  /** Binary paths used to launch channels. */
  binaries: {
    bun: string;
    /** Reserved for phase 2 supervisor wiring. */
    claude?: string;
    /** bb-imessage binary path, if known. */
    bbImessage?: string;
  };
  /** Tailscale hostname (no scheme), used for default webhook URLs. */
  tailscaleHost?: string;
  /** Modeled channels enabled on this host. */
  channels: HostChannelRef[];
  /**
   * Raw mcp server entries that are not yet modeled by this system.
   *
   * Phase 1 keeps these as passthroughs so the rendered output is byte-identical
   * to the hand-rolled .mcp.json. Phase 2+ will model each as a proper channel.
   */
  extraServers?: Record<string, Json>;
}
