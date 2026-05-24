/**
 * Snapshot tests: rendered output for each host must be byte-identical to the
 * captured-from-prod golden under tools/mcp-config/golden/<host>.mcp.json.
 *
 * Run: bun test tools/mcp-config/render.test.ts
 *
 * SECURITY: real production secrets are NEVER committed to this repo. The
 * goldens, host descriptors, and the envFixture below all contain stable
 * `<REDACTED_*>` placeholder strings. The renderer treats them as opaque
 * values, so the diff stays byte-identical. The per-host .env file
 * (gitignored) holds the real secret values for supervisor render-time use;
 * tests do not touch the real values.
 */

import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { render } from "./render.ts";
import type { HostDef } from "./types.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

function parseDotenv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

interface HostCase {
  id: string;
  /**
   * Test fixture: env vars to inject into the renderer. Values are placeholder
   * strings that match the placeholders embedded in the corresponding golden
   * file. This preserves byte-identical render-vs-golden parity WITHOUT ever
   * committing the real production secrets.
   */
  envFixture: Record<string, string>;
}

const HOST_CASES: HostCase[] = [
  {
    id: "claude-cloud",
    envFixture: {
      SENDBLUE_API_KEY_ID: "<REDACTED_SENDBLUE_API_KEY_ID_CLAUDE_CLOUD>",
      SENDBLUE_API_SECRET_KEY: "<REDACTED_SENDBLUE_API_SECRET_KEY_CLAUDE_CLOUD>",
      MSTEAMS_APP_ID: "<REDACTED_MSTEAMS_APP_ID>",
      MSTEAMS_APP_PASSWORD: "<REDACTED_MSTEAMS_APP_PASSWORD>",
      MSTEAMS_TENANT_ID: "<REDACTED_MSTEAMS_TENANT_ID>",
      MCP_BEARER_TOKEN: "<REDACTED_MCP_BEARER_TOKEN>",
    },
  },
  {
    id: "gautams-imac-exult",
    envFixture: {
      SENDBLUE_API_KEY_ID: "<REDACTED_SENDBLUE_API_KEY_ID_IMAC_EXULT>",
      SENDBLUE_API_SECRET_KEY: "<REDACTED_SENDBLUE_API_SECRET_KEY_IMAC_EXULT>",
      MSTEAMS_APP_ID: "<REDACTED_MSTEAMS_APP_ID>",
      MSTEAMS_APP_PASSWORD: "<REDACTED_MSTEAMS_APP_PASSWORD>",
      MSTEAMS_TENANT_ID: "<REDACTED_MSTEAMS_TENANT_ID>",
      MCP_BEARER_TOKEN: "<REDACTED_MCP_BEARER_TOKEN>",
    },
  },
  {
    id: "gautams-imac-agent",
    envFixture: {
      BB_PASSWORD: "<REDACTED_BB_PASSWORD>",
      SENDBLUE_API_KEY_ID: "<REDACTED_SENDBLUE_API_KEY_ID_IMAC_AGENT>",
      SENDBLUE_API_SECRET_KEY: "<REDACTED_SENDBLUE_API_SECRET_KEY_IMAC_AGENT>",
      MCP_BEARER_TOKEN: "<REDACTED_MCP_BEARER_TOKEN>",
    },
  },
  {
    id: "mbp-work",
    envFixture: {
      SENDBLUE_API_KEY_ID: "<REDACTED_SENDBLUE_API_KEY_ID_MBP_WORK>",
      SENDBLUE_API_SECRET_KEY: "<REDACTED_SENDBLUE_API_SECRET_KEY_MBP_WORK>",
      MCP_BEARER_TOKEN: "<REDACTED_MCP_BEARER_TOKEN>",
    },
  },
];

describe("mcp-config renderer parity (phase 1)", () => {
  for (const { id, envFixture } of HOST_CASES) {
    test(`render(${id}) matches golden byte-for-byte`, async () => {
      const hostPath = resolve(HERE, "hosts", `${id}.ts`);
      const goldenPath = resolve(HERE, "golden", `${id}.mcp.json`);
      expect(existsSync(hostPath)).toBe(true);
      expect(existsSync(goldenPath)).toBe(true);

      const mod = (await import(hostPath)) as {
        host?: HostDef;
        default?: HostDef;
      };
      const host = mod.host ?? mod.default;
      if (!host) throw new Error(`host descriptor ${hostPath} missing export`);

      const result = render({ host, hostEnv: envFixture });
      const golden = readFileSync(goldenPath, "utf8");
      expect(result.json).toBe(golden);
    });
  }

  test("rendering with missing required env throws", async () => {
    const hostPath = resolve(HERE, "hosts", "claude-cloud.ts");
    const mod = (await import(hostPath)) as { host: HostDef };
    expect(() => render({ host: mod.host, hostEnv: {} })).toThrow(
      /missing required env/i,
    );
  });

  test("--allow-missing skips channel instead of throwing", async () => {
    const hostPath = resolve(HERE, "hosts", "claude-cloud.ts");
    const mod = (await import(hostPath)) as { host: HostDef };
    const result = render({
      host: mod.host,
      hostEnv: {
        MSTEAMS_APP_ID: "x",
        MSTEAMS_APP_PASSWORD: "x",
        MSTEAMS_TENANT_ID: "x",
      },
      allowMissing: new Set([
        "sendblue",
        "advancedmd",
        "rippling",
        "ringcentral",
        "ringcentral-admin",
        "email",
        "docstrange",
        "teams-mcp",
      ]),
    });
    expect(result.skippedChannels).toContain("sendblue");
    expect(result.skippedChannels).toContain("advancedmd");
    expect(result.skippedChannels).toContain("rippling");
    expect(result.skippedChannels).toContain("ringcentral");
    expect(result.skippedChannels).toContain("ringcentral-admin");
    expect(result.skippedChannels).toContain("email");
    expect(result.skippedChannels).toContain("docstrange");
    expect(result.skippedChannels).toContain("teams-mcp");
    expect(result.json).not.toContain("sendblue-channel");
    expect(result.json).not.toContain('"advancedmd"');
    expect(result.json).not.toContain('"rippling"');
    expect(result.json).not.toContain('"ringcentral"');
    expect(result.json).not.toContain('"ringcentral-admin"');
    expect(result.json).not.toContain("email-channel");
    expect(result.json).not.toContain('"docstrange"');
    expect(result.json).not.toContain('"teams-mcp"');
    expect(result.json).toContain("teams-channel");
  });

  test("http launch style emits streamable-http entry with bearer header (ringcentral)", async () => {
    const hostPath = resolve(HERE, "hosts", "claude-cloud.ts");
    const mod = (await import(hostPath)) as { host: HostDef };
    const result = render({
      host: mod.host,
      hostEnv: {
        SENDBLUE_API_KEY_ID: "<REDACTED_SENDBLUE_API_KEY_ID_CLAUDE_CLOUD>",
        SENDBLUE_API_SECRET_KEY:
          "<REDACTED_SENDBLUE_API_SECRET_KEY_CLAUDE_CLOUD>",
        MSTEAMS_APP_ID: "<REDACTED_MSTEAMS_APP_ID>",
        MSTEAMS_APP_PASSWORD: "<REDACTED_MSTEAMS_APP_PASSWORD>",
        MSTEAMS_TENANT_ID: "<REDACTED_MSTEAMS_TENANT_ID>",
        MCP_BEARER_TOKEN: "<REDACTED_MCP_BEARER_TOKEN>",
      },
    });
    const parsed = JSON.parse(result.json) as {
      mcpServers: Record<
        string,
        {
          type?: string;
          url?: string;
          headers?: Record<string, string>;
          command?: string;
        }
      >;
    };
    const entry = parsed.mcpServers["ringcentral"];
    expect(entry).toBeDefined();
    expect(entry.type).toBe("streamable-http");
    expect(entry.url).toBe(
      "https://claude-cloud.tail053faf.ts.net/ringcentral/mcp",
    );
    expect(entry.headers?.Authorization).toBe(
      "Bearer <REDACTED_MCP_BEARER_TOKEN>",
    );
    // http-launched entries must NOT include command/args/env -- the
    // client connects to a remote endpoint instead of spawning a process.
    expect(entry.command).toBeUndefined();
    expect((entry as { args?: unknown }).args).toBeUndefined();
    expect((entry as { env?: unknown }).env).toBeUndefined();
  });

  test("canonical output: keys sorted, 2-space indent, trailing newline", () => {
    // Read any golden — they were all canonicalized by the same code.
    const golden = readFileSync(
      resolve(HERE, "golden", "mbp-work.mcp.json"),
      "utf8",
    );
    expect(golden.endsWith("\n")).toBe(true);
    // Spot-check 2-space indent
    expect(golden).toContain('\n  "mcpServers"');
    expect(golden).toContain('\n    "sendblue-channel"');
  });

  test("http launch style emits streamable-http entry with bearer header (advancedmd)", async () => {
    const hostPath = resolve(HERE, "hosts", "claude-cloud.ts");
    const mod = (await import(hostPath)) as { host: HostDef };
    const result = render({
      host: mod.host,
      hostEnv: {
        SENDBLUE_API_KEY_ID: "<REDACTED_SENDBLUE_API_KEY_ID_CLAUDE_CLOUD>",
        SENDBLUE_API_SECRET_KEY:
          "<REDACTED_SENDBLUE_API_SECRET_KEY_CLAUDE_CLOUD>",
        MSTEAMS_APP_ID: "<REDACTED_MSTEAMS_APP_ID>",
        MSTEAMS_APP_PASSWORD: "<REDACTED_MSTEAMS_APP_PASSWORD>",
        MSTEAMS_TENANT_ID: "<REDACTED_MSTEAMS_TENANT_ID>",
        MCP_BEARER_TOKEN: "<REDACTED_MCP_BEARER_TOKEN>",
      },
    });
    const parsed = JSON.parse(result.json) as {
      mcpServers: Record<
        string,
        {
          type?: string;
          url?: string;
          headers?: Record<string, string>;
          command?: string;
        }
      >;
    };
    const entry = parsed.mcpServers["advancedmd"];
    expect(entry).toBeDefined();
    expect(entry.type).toBe("streamable-http");
    expect(entry.url).toBe(
      "https://claude-cloud.tail053faf.ts.net/advancedmd/mcp",
    );
    expect(entry.headers?.Authorization).toBe(
      "Bearer <REDACTED_MCP_BEARER_TOKEN>",
    );
    // http-launched entries must NOT include command/args/env -- the
    // client connects to a remote endpoint instead of spawning a process.
    expect(entry.command).toBeUndefined();
    expect((entry as { args?: unknown }).args).toBeUndefined();
    expect((entry as { env?: unknown }).env).toBeUndefined();

    // Phase C: rippling renders the same shape on the same host.
    const ripp = parsed.mcpServers["rippling"];
    expect(ripp).toBeDefined();
    expect(ripp.type).toBe("streamable-http");
    expect(ripp.url).toBe(
      "https://claude-cloud.tail053faf.ts.net/rippling/mcp",
    );
    expect(ripp.headers?.Authorization).toBe(
      "Bearer <REDACTED_MCP_BEARER_TOKEN>",
    );
    expect(ripp.command).toBeUndefined();
    expect((ripp as { args?: unknown }).args).toBeUndefined();
    expect((ripp as { env?: unknown }).env).toBeUndefined();
  });

  test("dotenv parser handles quoted + unquoted values", () => {
    const parsed = parseDotenv(
      [
        "# comment",
        "FOO=bar",
        'BAZ="quoted value"',
        "EMPTY=",
        "INVALID_LINE",
      ].join("\n"),
    );
    expect(parsed.FOO).toBe("bar");
    expect(parsed.BAZ).toBe("quoted value");
    expect(parsed.EMPTY).toBe("");
    expect(parsed.INVALID_LINE).toBeUndefined();
  });
});

describe("guardrail: no real secrets committed to goldens or host descriptors", () => {
  // High-entropy / known-credential-shape patterns. The goal is to fail-loud
  // if a future change accidentally re-introduces a real secret into a file
  // that is checked into git.
  //
  // Each entry: human-friendly label + regex applied to each string value
  // (goldens) or to the file's raw text (host descriptors).
  const PATTERNS: Array<{ label: string; re: RegExp }> = [
    // Known service-specific prefixes
    { label: "rippling API token prefix", re: /\bRPKEY[0-9A-Za-z]{20,}\b/ },
    // JWT shape: three base64url segments separated by dots, last segment ≥30 chars
    {
      label: "JWT-shaped token",
      re: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{30,}\b/,
    },
    // Long hex strings (≥24 chars) — covers Sendblue API keys/secrets (32 hex)
    { label: "long hex blob (≥24 chars)", re: /\b[0-9a-f]{24,}\b/ },
    // Microsoft Graph / Azure secret shape (tilde-bracketed entropy blocks)
    {
      label: "Azure-style client secret",
      re: /\b[A-Za-z0-9._~-]{6}~[A-Za-z0-9._~-]{30,}\b/,
    },
    // AdvancedMD password literal that leaked earlier
    { label: "AMD password literal", re: /ExultAPI!2026secure/ },
    // BB password literal that leaked earlier
    { label: "BB password literal", re: /Bhargava121621/ },
  ];

  // Placeholder marker we explicitly allow — guardrail must NOT trip on these.
  const PLACEHOLDER_RE = /^<REDACTED_[A-Z0-9_]+>$/;

  function checkValue(value: string): { label: string; sample: string } | null {
    if (PLACEHOLDER_RE.test(value)) return null;
    for (const { label, re } of PATTERNS) {
      if (re.test(value)) {
        return { label, sample: value.slice(0, 12) + "..." };
      }
    }
    return null;
  }

  // Recursively walk a parsed JSON tree, returning leaf string values
  // alongside a dotted path for error messages.
  function walkStrings(
    node: unknown,
    path: string,
    out: Array<{ path: string; value: string }>,
  ): void {
    if (typeof node === "string") {
      out.push({ path, value: node });
    } else if (Array.isArray(node)) {
      node.forEach((v, i) => walkStrings(v, `${path}[${i}]`, out));
    } else if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        walkStrings(v, path ? `${path}.${k}` : k, out);
      }
    }
  }

  test("golden/*.mcp.json files contain no high-entropy secret values", () => {
    const goldenDir = resolve(HERE, "golden");
    const files = readdirSync(goldenDir).filter((f) => f.endsWith(".mcp.json"));
    expect(files.length).toBeGreaterThan(0);
    const findings: string[] = [];
    for (const f of files) {
      const text = readFileSync(resolve(goldenDir, f), "utf8");
      const parsed = JSON.parse(text) as unknown;
      const strings: Array<{ path: string; value: string }> = [];
      walkStrings(parsed, "", strings);
      for (const { path, value } of strings) {
        const hit = checkValue(value);
        if (hit) {
          findings.push(`${f}:${path} matched ${hit.label} (${hit.sample})`);
        }
      }
    }
    if (findings.length > 0) {
      throw new Error(
        "Possible real secret detected in golden file(s):\n  " +
          findings.join("\n  ") +
          "\nIf this is a false positive, refine the pattern in render.test.ts " +
          "(guardrail). If it is a real secret, replace it with " +
          "<REDACTED_KEY_NAME> and rotate the leaked credential.",
      );
    }
  });

  test("hosts/*.ts descriptors contain no high-entropy secret literals", () => {
    const hostsDir = resolve(HERE, "hosts");
    const files = readdirSync(hostsDir).filter((f) => f.endsWith(".ts"));
    expect(files.length).toBeGreaterThan(0);
    const findings: string[] = [];
    // Match string literals (single- or double-quoted, plus simple template
    // strings without ${} interpolation). Lightweight extractor — good enough
    // for the guardrail without pulling in a real TS parser.
    const stringLiteralRe = /(['"`])((?:\\.|(?!\1).)*?)\1/g;
    for (const f of files) {
      const text = readFileSync(resolve(hostsDir, f), "utf8");
      let m: RegExpExecArray | null;
      stringLiteralRe.lastIndex = 0;
      while ((m = stringLiteralRe.exec(text)) !== null) {
        const value = m[2];
        if (value.includes("${")) continue; // template with interpolation; skip
        const hit = checkValue(value);
        if (hit) {
          findings.push(`${f}: literal matched ${hit.label} (${hit.sample})`);
        }
      }
    }
    if (findings.length > 0) {
      throw new Error(
        "Possible real secret detected in host descriptor(s):\n  " +
          findings.join("\n  ") +
          "\nUse <REDACTED_KEY_NAME> placeholders in committed code; read real " +
          "values from the gitignored hosts/<host>.env at supervisor render time.",
      );
    }
  });
});
