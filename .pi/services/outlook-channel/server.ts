#!/usr/bin/env bun
/// <reference types="bun-types" />
/**
 * Outlook/Graph email channel for Claude Code.
 *
 * MCP stdio server that polls Microsoft Graph for inbound mail on
 * agent@exulthealthcare.com and pushes each new message into the running
 * Claude Code session as a <channel source="outlook-channel"> injection,
 * mirroring the bluebubbles-channel pattern.
 *
 * Architecture: Option B (polling) — no public HTTPS endpoint required.
 * See README.md for the full design doc and tradeoffs vs Graph change
 * notifications.
 *
 * Env vars (all optional):
 *   OUTLOOK_CREDS_PATH   Path to microsoft365.json creds file
 *                        (default: /Users/agent/pi-mono/.config/exult/microsoft365.json)
 *   OUTLOOK_MAILBOX      Mailbox UPN to poll (default: agent@exulthealthcare.com)
 *   OUTLOOK_POLL_MS      Poll interval in ms (default: 30000)
 *   OUTLOOK_STATE_DIR    State dir for cursor + seen ids
 *                        (default: ~/.claude/channels/outlook)
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "fs";
import { homedir } from "os";
import { join } from "path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CREDS_PATH =
  process.env.OUTLOOK_CREDS_PATH ??
  "/Users/agent/pi-mono/.config/exult/microsoft365.json";
const MAILBOX = process.env.OUTLOOK_MAILBOX ?? "agent@exulthealthcare.com";
const POLL_MS = Number(process.env.OUTLOOK_POLL_MS ?? 30_000);
const STATE_DIR =
  process.env.OUTLOOK_STATE_DIR ??
  join(homedir(), ".claude", "channels", "outlook");
const CURSOR_FILE = join(STATE_DIR, "cursor.json");
const SEEN_FILE = join(STATE_DIR, "seen.json");
const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

const log = (msg: string) =>
  process.stderr.write(`outlook-channel: ${msg}\n`);

function redact(s: string, max = 100): string {
  if (!s) return "";
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}...` : flat;
}

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

interface M365Creds {
  tenant_id: string;
  client_id: string;
  client_secret: string;
  token_endpoint?: string;
}

function loadCreds(): M365Creds {
  const raw = readFileSync(CREDS_PATH, "utf-8");
  const parsed = JSON.parse(raw) as M365Creds;
  if (!parsed.tenant_id || !parsed.client_id || !parsed.client_secret) {
    throw new Error(`missing tenant_id/client_id/client_secret in ${CREDS_PATH}`);
  }
  return parsed;
}

let creds: M365Creds;
try {
  creds = loadCreds();
} catch (err) {
  log(`failed to load creds: ${String(err)}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Token cache
// ---------------------------------------------------------------------------

interface CachedToken {
  token: string;
  expiresAt: number; // epoch ms
}

let cachedToken: CachedToken | null = null;
const TOKEN_REFRESH_SKEW_MS = 5 * 60 * 1000; // refresh when <5 min left

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - now > TOKEN_REFRESH_SKEW_MS) {
    return cachedToken.token;
  }

  const tokenUrl =
    creds.token_endpoint ??
    `https://login.microsoftonline.com/${creds.tenant_id}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: creds.client_id,
    client_secret: creds.client_secret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "(no body)");
    throw new Error(`token endpoint ${res.status}: ${text}`);
  }

  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = {
    token: json.access_token,
    expiresAt: now + json.expires_in * 1000,
  };
  log(`acquired new token, expires in ${json.expires_in}s`);
  return cachedToken.token;
}

// ---------------------------------------------------------------------------
// Graph helpers
// ---------------------------------------------------------------------------

async function graphGet<T = Record<string, unknown>>(path: string): Promise<T> {
  const token = await getAccessToken();
  const url = path.startsWith("http") ? path : `${GRAPH_BASE}${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    // Token likely stale — force refresh once
    cachedToken = null;
    const token2 = await getAccessToken();
    const res2 = await fetch(url, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    if (!res2.ok) {
      const text = await res2.text().catch(() => "(no body)");
      throw new Error(`graph GET ${res2.status}: ${text}`);
    }
    return (await res2.json()) as T;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "(no body)");
    throw new Error(`graph GET ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

async function graphPost<T = Record<string, unknown>>(
  path: string,
  body: Record<string, unknown>,
): Promise<T | null> {
  const token = await getAccessToken();
  const url = path.startsWith("http") ? path : `${GRAPH_BASE}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "(no body)");
    throw new Error(`graph POST ${res.status}: ${text}`);
  }
  if (res.status === 202 || res.status === 204) return null;
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// State (cursor + seen dedup)
// ---------------------------------------------------------------------------

interface CursorState {
  lastReceived: string; // ISO8601 — only fetch messages strictly after this
}

function ensureStateDir(): void {
  mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 });
}

function loadCursor(): CursorState {
  try {
    if (existsSync(CURSOR_FILE)) {
      return JSON.parse(readFileSync(CURSOR_FILE, "utf-8")) as CursorState;
    }
  } catch (err) {
    log(`failed to load cursor: ${String(err)}`);
  }
  // Default: start from "now" so we don't backfill old mail on first run
  return { lastReceived: new Date().toISOString() };
}

function saveCursor(state: CursorState): void {
  try {
    ensureStateDir();
    writeFileSync(CURSOR_FILE, JSON.stringify(state, null, 2) + "\n", {
      mode: 0o600,
    });
  } catch (err) {
    log(`failed to save cursor: ${String(err)}`);
  }
}

const SEEN_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h
let seen: Map<string, number> = new Map();

function loadSeen(): void {
  try {
    if (existsSync(SEEN_FILE)) {
      const raw = readFileSync(SEEN_FILE, "utf-8");
      seen = new Map(Object.entries(JSON.parse(raw) as Record<string, number>));
    }
  } catch {
    seen = new Map();
  }
}

function saveSeen(): void {
  try {
    ensureStateDir();
    const obj: Record<string, number> = {};
    for (const [id, ts] of seen) obj[id] = ts;
    writeFileSync(SEEN_FILE, JSON.stringify(obj) + "\n", { mode: 0o600 });
  } catch (err) {
    log(`failed to save seen: ${String(err)}`);
  }
}

function pruneSeen(): void {
  const cutoff = Date.now() - SEEN_MAX_AGE_MS;
  let pruned = 0;
  for (const [id, ts] of seen) {
    if (ts < cutoff) {
      seen.delete(id);
      pruned++;
    }
  }
  if (pruned > 0) {
    log(`pruned ${pruned} seen ids (${seen.size} remaining)`);
    saveSeen();
  }
}

let cursor = loadCursor();
loadSeen();
setInterval(pruneSeen, 15 * 60 * 1000);

// ---------------------------------------------------------------------------
// Unhandled error safety net
// ---------------------------------------------------------------------------

process.on("unhandledRejection", (err) =>
  log(`unhandled rejection: ${String(err)}`),
);
process.on("uncaughtException", (err) =>
  log(`uncaught exception: ${String(err)}`),
);

// ---------------------------------------------------------------------------
// Message shape
// ---------------------------------------------------------------------------

interface GraphMessage {
  id: string;
  subject?: string;
  bodyPreview?: string;
  body?: { contentType?: string; content?: string };
  from?: { emailAddress?: { name?: string; address?: string } };
  toRecipients?: Array<{ emailAddress?: { name?: string; address?: string } }>;
  receivedDateTime: string;
  hasAttachments?: boolean;
  isRead?: boolean;
  conversationId?: string;
  webLink?: string;
}

function fromAddress(msg: GraphMessage): string {
  return msg.from?.emailAddress?.address ?? "unknown";
}

function fromDisplay(msg: GraphMessage): string {
  const addr = msg.from?.emailAddress?.address ?? "";
  const name = msg.from?.emailAddress?.name ?? "";
  return name ? `${name} <${addr}>` : addr;
}

function plainBody(msg: GraphMessage): string {
  // Prefer bodyPreview (already plain text, Graph strips HTML)
  if (msg.bodyPreview) return msg.bodyPreview;
  const content = msg.body?.content ?? "";
  if (msg.body?.contentType === "html") {
    // Minimal HTML-to-text fallback; leave heavy lifting to the agent
    return content
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();
  }
  return content;
}

// ---------------------------------------------------------------------------
// MCP server
// ---------------------------------------------------------------------------

const mcp = new Server(
  { name: "outlook-channel", version: "0.1.0" },
  {
    capabilities: {
      experimental: {
        "claude/channel": {},
      },
      tools: {},
    },
    instructions: [
      `Outlook email channel for ${MAILBOX} via Microsoft Graph (Exult Agent Service app).`,
      "",
      "You receive real-time email as <channel source=\"outlook-channel\" message_id=\"...\" from=\"...\" subject=\"...\">...body...</channel>.",
      "Reply by calling outlook_send_reply with the message_id from the tag — Graph /reply handles threading + recipients automatically.",
      "Use outlook_inbox_recent to fetch recent headers, outlook_read_message to fetch a full message body.",
      "",
      "Only this mailbox is watched — never call other mailboxes. The Graph app has tenant-wide Mail.ReadWrite but this channel is scoped to agent@.",
      "Do NOT send email unless explicitly asked — this is a COO-inbound channel, not an outbound blaster.",
    ].join("\n"),
  },
);

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "outlook_inbox_recent",
      description:
        "Fetch the most recent messages from the agent mailbox. Returns headers only (id, from, subject, received, preview).",
      inputSchema: {
        type: "object" as const,
        properties: {
          count: {
            type: "number",
            description: "Max messages to return (default 10, max 50)",
          },
        },
      },
    },
    {
      name: "outlook_read_message",
      description:
        "Fetch the full body of a single message by id. Returns from, to, subject, receivedDateTime, body text.",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "Graph message id" },
        },
        required: ["id"],
      },
    },
    {
      name: "outlook_send_reply",
      description:
        "Send a plain-text reply to an existing message. Uses Graph /reply endpoint so threading and recipients are preserved.",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "Graph message id to reply to" },
          body: { type: "string", description: "Reply body (plain text)" },
        },
        required: ["id", "body"],
      },
    },
  ],
}));

mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
  const args = req.params.arguments ?? {};
  try {
    switch (req.params.name) {
      case "outlook_inbox_recent": {
        const count = Math.min(Number(args.count ?? 10), 50);
        const select =
          "id,subject,from,receivedDateTime,hasAttachments,isRead,bodyPreview";
        const path = `/users/${encodeURIComponent(
          MAILBOX,
        )}/messages?$top=${count}&$orderby=receivedDateTime desc&$select=${encodeURIComponent(select)}`;
        const resp = await graphGet<{ value: GraphMessage[] }>(path);
        const msgs = resp.value ?? [];
        if (msgs.length === 0) {
          return { content: [{ type: "text", text: "(inbox empty)" }] };
        }
        const lines = msgs.map((m) => {
          const flag = m.isRead ? " " : "*";
          const att = m.hasAttachments ? " [att]" : "";
          return `${flag} ${m.receivedDateTime} ${fromDisplay(m)} — ${m.subject ?? "(no subject)"}${att}\n  id=${m.id}`;
        });
        return { content: [{ type: "text", text: lines.join("\n") }] };
      }

      case "outlook_read_message": {
        const id = args.id as string;
        if (!id) throw new Error("id is required");
        const select =
          "id,subject,from,toRecipients,receivedDateTime,hasAttachments,body,conversationId,webLink";
        const path = `/users/${encodeURIComponent(MAILBOX)}/messages/${encodeURIComponent(id)}?$select=${encodeURIComponent(select)}`;
        const msg = await graphGet<GraphMessage>(path);
        const to = (msg.toRecipients ?? [])
          .map((r) => r.emailAddress?.address ?? "")
          .filter(Boolean)
          .join(", ");
        const body = plainBody(msg);
        const formatted =
          `From: ${fromDisplay(msg)}\n` +
          `To: ${to}\n` +
          `Subject: ${msg.subject ?? ""}\n` +
          `Received: ${msg.receivedDateTime}\n` +
          `Attachments: ${msg.hasAttachments ? "yes" : "no"}\n` +
          `Link: ${msg.webLink ?? ""}\n` +
          `\n${body}`;
        return { content: [{ type: "text", text: formatted }] };
      }

      case "outlook_send_reply": {
        const id = args.id as string;
        const body = args.body as string;
        if (!id || !body) throw new Error("id and body are required");
        const path = `/users/${encodeURIComponent(MAILBOX)}/messages/${encodeURIComponent(id)}/reply`;
        await graphPost(path, {
          comment: body,
        });
        log(`replied to ${id}: ${redact(body)}`);
        return { content: [{ type: "text", text: "reply sent" }] };
      }

      default:
        return {
          content: [{ type: "text", text: `unknown tool: ${req.params.name}` }],
          isError: true,
        };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`${req.params.name} error: ${msg}`);
    return {
      content: [{ type: "text", text: `${req.params.name} failed: ${msg}` }],
      isError: true,
    };
  }
});

// ---------------------------------------------------------------------------
// Connect MCP BEFORE starting the poller so notifications have a transport
// ---------------------------------------------------------------------------

await mcp.connect(new StdioServerTransport());
log(`MCP connected (mailbox=${MAILBOX}, poll=${POLL_MS}ms)`);

// ---------------------------------------------------------------------------
// Poller
// ---------------------------------------------------------------------------

async function pollOnce(): Promise<void> {
  try {
    // Pull messages strictly newer than the cursor.
    // We request bodyPreview + top-level fields only — body is fetched
    // on-demand via outlook_read_message so we don't drag full HTML through
    // the channel on every inbound.
    const select =
      "id,subject,from,receivedDateTime,hasAttachments,bodyPreview,conversationId";
    const filter = `receivedDateTime gt ${cursor.lastReceived}`;
    const path =
      `/users/${encodeURIComponent(MAILBOX)}/messages` +
      `?$top=50&$orderby=receivedDateTime desc` +
      `&$filter=${encodeURIComponent(filter)}` +
      `&$select=${encodeURIComponent(select)}`;

    const resp = await graphGet<{ value: GraphMessage[] }>(path);
    const msgs = (resp.value ?? []).slice().reverse(); // oldest-first for delivery
    if (msgs.length === 0) return;

    let newCursor = cursor.lastReceived;

    for (const msg of msgs) {
      if (!msg.id || !msg.receivedDateTime) continue;
      if (seen.has(msg.id)) continue;

      seen.set(msg.id, Date.now());

      const from = fromAddress(msg);
      const subject = msg.subject ?? "(no subject)";
      const preview = msg.bodyPreview ?? "";

      // Build channel payload. Body is preview only (~255 chars from Graph);
      // agent can call outlook_read_message for full content.
      const content =
        `From: ${fromDisplay(msg)}\n` +
        `Subject: ${subject}\n` +
        `Received: ${msg.receivedDateTime}\n` +
        `Attachments: ${msg.hasAttachments ? "yes" : "no"}\n` +
        `\n${preview}`;

      try {
        await mcp.notification({
          method: "notifications/claude/channel",
          params: {
            content,
            meta: {
              source: "outlook-channel",
              message_id: msg.id,
              conversation_id: msg.conversationId ?? "",
              from,
              subject,
              mailbox: MAILBOX,
            },
          },
        });
        log(`inbound ${msg.id} from ${from}: ${redact(subject, 60)}`);
      } catch (err) {
        log(`notify failed for ${msg.id}: ${String(err)}`);
        // Don't advance cursor past a message we failed to deliver
        seen.delete(msg.id);
        break;
      }

      if (msg.receivedDateTime > newCursor) newCursor = msg.receivedDateTime;
    }

    if (newCursor !== cursor.lastReceived) {
      cursor = { lastReceived: newCursor };
      saveCursor(cursor);
      saveSeen();
    }
  } catch (err) {
    log(`poll error: ${String(err)}`);
  }
}

// Kick off an immediate poll, then interval
pollOnce().catch((err) => log(`initial poll failed: ${String(err)}`));
setInterval(() => {
  pollOnce().catch((err) => log(`poll failed: ${String(err)}`));
}, POLL_MS);

log("poller active");

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

let shuttingDown = false;
function shutdown(): void {
  if (shuttingDown) return;
  shuttingDown = true;
  log("shutting down");
  saveCursor(cursor);
  saveSeen();
  process.exit(0);
}
process.stdin.on("end", shutdown);
process.stdin.on("close", shutdown);
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
