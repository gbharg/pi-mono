#!/usr/bin/env bun
/**
 * mcp-config renderer.
 *
 * Usage:
 *   bun tools/mcp-config/render.ts --host <name> [--out <path>] [--check]
 *                                   [--allow-missing <channel>]...
 *                                   [--env-file <path>]
 *
 * Phase 1 goal: produce byte-identical output to the existing hand-rolled
 * .mcp.json on each host. NOT wired into any supervisor — see README.
 */

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalize, type Json } from "./canonical.ts";
import { getChannel, channels as channelRegistry } from "./channels/index.ts";
import { parseDotenv } from "./dotenv.ts";
import type {
  ChannelDef,
  HostChannelRef,
  HostDef,
  LaunchStyle,
  McpServerEntry,
} from "./types.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

interface CliFlags {
  host: string;
  out?: string;
  check: boolean;
  allowMissing: Set<string>;
  envFile?: string;
}

function parseArgs(argv: string[]): CliFlags {
  const flags: CliFlags = {
    host: "",
    check: false,
    allowMissing: new Set(),
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--host":
        flags.host = argv[++i] ?? "";
        break;
      case "--out":
        flags.out = argv[++i];
        break;
      case "--check":
        flags.check = true;
        break;
      case "--allow-missing":
        flags.allowMissing.add(argv[++i] ?? "");
        break;
      case "--env-file":
        flags.envFile = argv[++i];
        break;
      case "-h":
      case "--help":
        printHelp();
        process.exit(0);
        break;
      default:
        if (a.startsWith("--")) {
          throw new Error(`Unknown flag: ${a}`);
        }
    }
  }
  if (!flags.host) {
    printHelp();
    throw new Error("--host is required");
  }
  return flags;
}

function printHelp(): void {
  process.stderr.write(`mcp-config renderer (phase 1)

  --host <name>            Host descriptor id (e.g. claude-cloud, mbp-work)
  --out <path>             Write to file (default: stdout)
  --check                  Print to stdout only; do not write a file
  --allow-missing <chan>   Skip a channel whose required env is missing
  --env-file <path>        Explicit path to per-host secrets .env

If --env-file is not given, the renderer looks for
  tools/mcp-config/hosts/<host>.env
relative to the repo root.
`);
}

async function loadHost(hostId: string): Promise<HostDef> {
  const path = resolve(HERE, "hosts", `${hostId}.ts`);
  if (!existsSync(path)) {
    throw new Error(`Unknown host: "${hostId}" (no descriptor at ${path})`);
  }
  const mod = (await import(path)) as { host?: HostDef; default?: HostDef };
  const host = mod.host ?? mod.default;
  if (!host) {
    throw new Error(`Host descriptor ${path} must export { host } or default`);
  }
  return host;
}

async function loadEnvFile(hostId: string, explicit?: string): Promise<Record<string, string>> {
  const candidate = explicit ?? resolve(HERE, "hosts", `${hostId}.env`);
  if (!existsSync(candidate)) return {};
  const text = await readFile(candidate, "utf8");
  return parseDotenv(text);
}

interface RenderInput {
  host: HostDef;
  /** Env from per-host .env file (secrets + config). */
  hostEnv: Record<string, string>;
  /** Channels to skip on missing required vars. */
  allowMissing?: Set<string>;
}

function resolveToolDir(host: HostDef, ref: HostChannelRef, def: ChannelDef): string {
  if (ref.toolDirAbs) return ref.toolDirAbs;
  return `${host.repoRoot}/${def.toolDirRel}`;
}

/** Build the env block for a modeled channel, applying defaults + host overrides. */
function buildChannelEnv(
  def: ChannelDef,
  ref: HostChannelRef,
  hostEnv: Record<string, string>,
): { env: Record<string, string>; missingRequired: string[] } {
  const env: Record<string, string> = {};
  const missing: string[] = [];
  for (const spec of def.env) {
    const val =
      ref.env?.[spec.key] ??
      hostEnv[spec.key] ??
      spec.default;
    if (val !== undefined && val !== "") {
      env[spec.key] = val;
    } else if (spec.required) {
      missing.push(spec.key);
    }
  }
  // Allow host overrides to inject env vars not declared on the channel.
  if (ref.env) {
    for (const [k, v] of Object.entries(ref.env)) {
      if (!(k in env)) env[k] = v;
    }
  }
  return { env, missingRequired: missing };
}

type LaunchSpec =
  | { kind: "process"; command: string; args: string[]; cwd?: string }
  | {
      kind: "http";
      type: "streamable-http";
      url: string;
      headers: Record<string, string>;
    };

function buildLaunch(
  host: HostDef,
  def: ChannelDef,
  ref: HostChannelRef,
  toolDir: string,
  resolvedEnv: Record<string, string>,
): LaunchSpec {
  const style: LaunchStyle = ref.launchStyle ?? def.defaultLaunchStyle;
  const bun = ref.bunOverride ?? host.binaries.bun;
  const entryAbs = `${toolDir}/${def.entryFile}`;
  switch (style) {
    case "bash-cd-exec":
      return {
        kind: "process",
        command: "bash",
        args: ["-c", `cd ${toolDir} && exec ${bun} run ${def.entryFile}`],
      };
    case "bun-run-abs":
      return {
        kind: "process",
        command: bun,
        args: ["run", entryAbs],
        cwd: toolDir,
      };
    case "bun-run-args":
      // bb-imessage style: `bun run --cwd <dir> --shell=bun --silent start`
      return {
        kind: "process",
        command: bun,
        args: ["run", "--cwd", toolDir, "--shell=bun", "--silent", "start"],
      };
    case "http": {
      if (!def.httpUrl) {
        throw new Error(
          `Channel "${def.name}" uses launch style "http" but has no httpUrl builder.`,
        );
      }
      const bearerKey = def.httpBearerEnvKey ?? "MCP_BEARER_TOKEN";
      const bearer = resolvedEnv[bearerKey];
      // Defense-in-depth: buildChannelEnv normally validates required envs
      // before we get here, but a channel could declare the bearer key as
      // optional (or omit it from env[]) and still ship as HTTP. Failing
      // fast here keeps the renderer honest in both cases.
      if (!bearer) {
        throw new Error(
          `Channel "${def.name}" launch style "http" requires env "${bearerKey}" to be set.`,
        );
      }
      return {
        kind: "http",
        type: "streamable-http",
        url: def.httpUrl(host),
        headers: {
          Authorization: `Bearer ${bearer}`,
        },
      };
    }
    default: {
      // Exhaustiveness check.
      const _exhaustive: never = style;
      throw new Error(`Unhandled launch style: ${_exhaustive as string}`);
    }
  }
}

export interface RenderResult {
  json: string;
  serverCount: number;
  skippedChannels: string[];
  warnings: string[];
}

export function render(input: RenderInput): RenderResult {
  const { host, hostEnv, allowMissing = new Set<string>() } = input;
  const servers: Record<string, Json> = {};
  const skipped: string[] = [];
  const warnings: string[] = [];

  for (const ref of host.channels) {
    if (!(ref.channel in channelRegistry)) {
      throw new Error(
        `Host ${host.hostname} references unknown channel "${ref.channel}". ` +
          `Add it to tools/mcp-config/channels/ or remove from descriptor.`,
      );
    }
    const def = getChannel(ref.channel);
    const { env, missingRequired } = buildChannelEnv(def, ref, hostEnv);
    if (missingRequired.length > 0) {
      if (allowMissing.has(ref.channel)) {
        skipped.push(ref.channel);
        warnings.push(
          `[warn] skipping channel "${ref.channel}" — missing required env: ${missingRequired.join(", ")}`,
        );
        continue;
      }
      throw new Error(
        `Channel "${ref.channel}" missing required env vars on ${host.hostname}: ` +
          `${missingRequired.join(", ")}. ` +
          `Set them in tools/mcp-config/hosts/${host.hostname}.env, or pass --allow-missing ${ref.channel}.`,
      );
    }
    const toolDir = resolveToolDir(host, ref, def);
    const launch = buildLaunch(host, def, ref, toolDir, env);
    const entry: McpServerEntry =
      launch.kind === "http"
        ? {
            type: launch.type,
            url: launch.url,
            headers: launch.headers,
          }
        : {
            command: launch.command,
            args: launch.args,
            ...(launch.cwd ? { cwd: launch.cwd } : {}),
            ...(Object.keys(env).length > 0 ? { env } : {}),
          };
    servers[def.name] = entry as unknown as Json;
  }

  // Passthrough: raw mcp server defs that aren't yet modeled.
  if (host.extraServers) {
    for (const [name, raw] of Object.entries(host.extraServers)) {
      if (name in servers) {
        throw new Error(
          `extraServers["${name}"] on ${host.hostname} collides with a modeled channel`,
        );
      }
      servers[name] = raw;
    }
  }

  const json = canonicalize({ mcpServers: servers });
  return {
    json,
    serverCount: Object.keys(servers).length,
    skippedChannels: skipped,
    warnings,
  };
}

async function main(): Promise<void> {
  const flags = parseArgs(process.argv.slice(2));
  const host = await loadHost(flags.host);
  const hostEnv = await loadEnvFile(flags.host, flags.envFile);
  const result = render({
    host,
    hostEnv,
    allowMissing: flags.allowMissing,
  });
  for (const w of result.warnings) process.stderr.write(w + "\n");

  if (flags.check || !flags.out) {
    process.stdout.write(result.json);
    return;
  }
  await writeFile(flags.out, result.json, "utf8");
  // Stamp the rendered location for debugging supervisor wiring later.
  const stamp = {
    host: host.hostname,
    renderedAt: new Date().toISOString(),
    out: flags.out,
    serverCount: result.serverCount,
    skippedChannels: result.skippedChannels,
  };
  await writeFile(
    join(HERE, ".rendered-by"),
    JSON.stringify(stamp, null, 2) + "\n",
    "utf8",
  );
  process.stderr.write(
    `wrote ${flags.out} (${result.serverCount} servers, ${result.skippedChannels.length} skipped)\n`,
  );
}

if (import.meta.main) {
  main().catch((err) => {
    process.stderr.write(`error: ${(err as Error).message}\n`);
    process.exit(1);
  });
}
