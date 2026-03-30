/**
 * iMessage Channel Extension for Pi — Direct Injection Architecture
 *
 * Runs an HTTP webhook server in-process on port 3001. When SendBlue
 * delivers a webhook, the message is injected into Pi's session immediately
 * via sendUserMessage(). No filesystem queue, no polling, no latency.
 *
 * Architecture:
 *   SendBlue webhook -> HTTP server (:3001) inside this extension -> pi.sendUserMessage() -> Pi session
 *   Pi session -> reply/react/typing tools -> SendBlue API -> iMessage
 *
 * Previous architecture (eliminated):
 *   SendBlue webhook -> Express server (:3001) -> inbox/*.json -> polling loop -> Pi session
 */

import * as http from "node:http";
import * as fs from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { Type } from "@sinclair/typebox";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const CHANNEL_DIR = join(homedir(), "imessage-channel");
const WEBHOOK_PORT = 3001;
const WEBHOOK_HOST = "0.0.0.0";
const LOG = "[imessage-channel]";

// -- Env + credentials --

function loadEnv(): Record<string, string> {
  const envPath = join(CHANNEL_DIR, ".env");
  const env: Record<string, string> = {};
  try {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq > 0) {
        env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
      }
    }
  } catch {
    // .env not found
  }
  return env;
}

const env = loadEnv();
const API_KEY_ID = env.SENDBLUE_API_KEY_ID ?? "";
const API_SECRET = env.SENDBLUE_API_SECRET_KEY ?? "";
const OWN_NUMBER = env.SENDBLUE_OWN_NUMBER ?? "+16292925296";
const ALLOWED_NUMBERS = new Set(
  (env.ALLOWED_NUMBERS ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean)
    .map(normalizeNumber),
);

const API_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  "sb-api-key-id": API_KEY_ID,
  "sb-api-secret-key": API_SECRET,
};

function normalizeNumber(addr: string): string {
  const digits = addr.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

function isAllowed(sender: string): boolean {
  if (ALLOWED_NUMBERS.size === 0) return true;
  return ALLOWED_NUMBERS.has(normalizeNumber(sender));
}

async function sendbluePost(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`https://api.sendblue.co${path}`, {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "(no body)");
    throw new Error(`SendBlue API error ${res.status}: ${text}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

/** Fetch recent message history from SendBlue API */
async function fetchRecentHistory(limit = 50): Promise<string> {
  try {
    const url = new URL("https://api.sendblue.co/api/v2/messages");
    url.searchParams.set("limit", String(limit));

    const res = await fetch(url.toString(), { headers: API_HEADERS });
    if (!res.ok) {
      console.error(`${LOG} Failed to fetch history: ${res.status}`);
      return "";
    }
    const data = (await res.json()) as { data: Array<Record<string, unknown>> };
    const messages = (data.data ?? []).map((m: Record<string, unknown>) => {
      const dir = m.is_outbound ? "SENT" : "RECEIVED";
      const number = (m.number as string) ?? "unknown";
      const content = (m.content as string) ?? "[media]";
      const date = (m.date_sent as string) ?? "";
      const handle = (m.message_handle as string) ?? "";
      return `[${dir}] ${date} | ${number} | "${(content as string).slice(0, 200)}" | handle: ${handle}`;
    });

    return messages.join("\n");
  } catch (err) {
    console.error(`${LOG} Error fetching history:`, err);
    return "";
  }
}

/** Append a JSONL line to the message log */
function logMessageToFile(entry: Record<string, unknown>): void {
  const logPath = join(CHANNEL_DIR, "messages.jsonl");
  try {
    fs.appendFileSync(logPath, JSON.stringify(entry) + "\n", "utf-8");
  } catch (err) {
    console.error(`${LOG} Failed to write message log:`, err);
  }
}

// -- Read JSON body from an incoming HTTP request --

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

// ============================================================================
// Extension entry point
// ============================================================================

export default function (pi: ExtensionAPI) {
  let server: http.Server | null = null;

  pi.on("session_start", async (_event, ctx) => {
    // Guard against double-start
    if (server) return;

    // Load recent message history as hidden context
    fetchRecentHistory(50)
      .then((history) => {
        if (history) {
          pi.sendMessage(
            {
              customType: "imessage-history",
              content: `[iMessage History -- last 50 messages]\n\n${history}`,
              display: false,
            },
            { deliverAs: "nextTurn" },
          );
        }
      })
      .catch((err) => {
        console.error(`${LOG} Failed to inject history:`, err);
      });

    // Drain any leftover inbox files from the old polling architecture.
    // This handles messages that arrived between the old server shutting down
    // and this new extension starting.
    drainLegacyInbox(pi);

    // -- Start the in-process webhook server --

    server = http.createServer(async (req, res) => {
      // Health check
      if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          ok: true,
          channel: "imessage-sendblue",
          architecture: "direct-injection",
          timestamp: new Date().toISOString(),
        }));
        return;
      }

      // Main webhook endpoint: POST /webhook
      if (req.method === "POST" && req.url === "/webhook") {
        // Respond immediately to avoid SendBlue retries
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ received: true }));

        try {
          const raw = await readBody(req);
          const body = JSON.parse(raw) as Record<string, unknown>;

          // Status callback (outbound delivery update) -- log only
          if (body.is_outbound === true) {
            console.log(`${LOG} Status update: ${String(body.status)} for ${String(body.number ?? body.to_number)}`);
            return;
          }

          const sender = (body.from_number as string) ?? "";
          const content = (body.content as string) ?? "";
          const mediaUrl = (body.media_url as string) ?? null;
          const messageHandle = (body.message_handle as string) ?? "";
          const service = (body.service as string) ?? "iMessage";

          if (!sender || (!content && !mediaUrl)) {
            console.log(`${LOG} Ignoring empty inbound webhook payload`);
            return;
          }

          if (!isAllowed(sender)) {
            console.warn(`${LOG} Dropped message from non-allowed sender: ${sender}`);
            return;
          }

          console.log(`${LOG} Inbound from ${sender}: "${content.slice(0, 80)}"${mediaUrl ? " [+media]" : ""}`);

          // Log to JSONL file
          logMessageToFile({
            timestamp: (body.date_sent as string) || new Date().toISOString(),
            direction: "inbound",
            from: sender,
            to: (body.to_number as string) ?? OWN_NUMBER,
            content,
            media_url: mediaUrl,
            message_handle: messageHandle,
            service,
            status: (body.status as string) ?? "RECEIVED",
          });

          // Auto read receipt
          sendbluePost("/api/mark-read", {
            from_number: OWN_NUMBER,
            number: sender,
          }).catch((err) => {
            console.warn(`${LOG} Auto mark-read failed: ${err instanceof Error ? err.message : String(err)}`);
          });

          // Auto typing indicator
          sendbluePost("/api/send-typing-indicator", {
            from_number: OWN_NUMBER,
            number: sender,
          }).catch((err) => {
            console.warn(`${LOG} Auto typing indicator failed: ${err instanceof Error ? err.message : String(err)}`);
          });

          // DIRECT INJECTION: immediately inject into Pi's session
          const messageText = `[iMessage from ${sender} | handle: ${messageHandle} | service: ${service}]\n\n${content}${mediaUrl && mediaUrl !== "null" ? `\n\n[Attachment: ${mediaUrl}]` : ""}`;

          pi.sendUserMessage(messageText, { deliverAs: "steer" });
          console.log(`${LOG} Message injected directly into Pi session`);
        } catch (err) {
          console.error(`${LOG} Webhook handler error:`, err);
        }
        return;
      }

      // Typing indicator webhook: POST /webhook/typing
      if (req.method === "POST" && req.url === "/webhook/typing") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ received: true }));

        try {
          const raw = await readBody(req);
          const body = JSON.parse(raw) as Record<string, unknown>;
          const number = (body.number as string) ?? "";
          if (number && isAllowed(number)) {
            const isTyping = body.is_typing === true;
            console.log(`${LOG} ${number} ${isTyping ? "is typing..." : "stopped typing"}`);
          }
        } catch (err) {
          console.error(`${LOG} Typing webhook error:`, err);
        }
        return;
      }

      // Unknown route
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    });

    // Use unref() so the server doesn't prevent sub-agents from exiting
    server.unref();

    server.listen(WEBHOOK_PORT, WEBHOOK_HOST, () => {
      console.log(`${LOG} Webhook server listening on ${WEBHOOK_HOST}:${WEBHOOK_PORT} (direct injection)`);
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.error(`${LOG} Port ${WEBHOOK_PORT} already in use. Is the old webhook server still running? Kill it and restart Pi.`);
      } else {
        console.error(`${LOG} Server error:`, err);
      }
    });

    if (ctx.hasUI) {
      ctx.ui.setStatus("imessage", `iMessage channel active (${OWN_NUMBER}) -- direct injection on :${WEBHOOK_PORT}`);
    }
  });

  pi.on("session_shutdown", async () => {
    if (server) {
      server.close();
      server = null;
      console.log(`${LOG} Webhook server stopped`);
    }
  });

  // -- Tools for responding (unchanged) --

  pi.registerTool({
    name: "imessage_reply",
    label: "iMessage Reply",
    description: "Send an iMessage reply via SendBlue. Use this to respond to iMessage conversations.",
    promptSnippet: "Send an iMessage reply to a phone number",
    promptGuidelines: [
      "When you receive an iMessage (indicated by [iMessage from ...]), respond using the imessage_reply tool.",
      "Keep iMessage responses concise and conversational -- no markdown, plain text only.",
      "Always include the message_handle from the inbound message to thread the reply properly.",
      "If no message_handle is available, omit it to send a non-threaded message.",
    ],
    parameters: Type.Object({
      number: Type.String({ description: 'Recipient phone number in E.164 format (e.g. "+19723637754")' }),
      content: Type.String({ description: "Message text to send" }),
      reply_to: Type.Optional(Type.String({ description: "message_handle of the message to reply to (for threading)" })),
    }),
    async execute(_toolCallId, params) {
      // Send typing indicator first
      try {
        await sendbluePost("/api/send-typing-indicator", {
          from_number: OWN_NUMBER,
          number: params.number,
        });
        // Small delay for natural feel
        await new Promise((r) => setTimeout(r, 600));
      } catch { /* best effort */ }

      const body: Record<string, unknown> = {
        number: params.number,
        content: params.content,
        from_number: OWN_NUMBER,
      };
      if (params.reply_to) {
        body.reply_to_message_handle = params.reply_to;
      }

      const result = await sendbluePost("/api/send-message", body);

      // Log outbound message
      logMessageToFile({
        timestamp: new Date().toISOString(),
        direction: "outbound",
        from: OWN_NUMBER,
        to: params.number,
        content: params.content,
        media_url: null,
        message_handle: (result as Record<string, unknown>).message_handle ?? "",
        service: "iMessage",
        status: "SENT",
      });

      return {
        content: [{ type: "text" as const, text: `Sent to ${params.number}: "${params.content.slice(0, 80)}${params.content.length > 80 ? "..." : ""}"` }],
        details: { result },
      };
    },
  });

  pi.registerTool({
    name: "imessage_react",
    label: "iMessage React",
    description: "Send a tapback reaction to an iMessage.",
    promptSnippet: "Send a tapback reaction (love/like/laugh/emphasize/question) to an iMessage",
    parameters: Type.Object({
      number: Type.String({ description: "Recipient phone number" }),
      message_handle: Type.String({ description: "message_handle of the message to react to" }),
      reaction: Type.String({ description: "Reaction type: love, like, dislike, laugh, emphasize, question" }),
    }),
    async execute(_toolCallId, params) {
      const result = await sendbluePost("/api/send-reaction", {
        from_number: OWN_NUMBER,
        number: params.number,
        message_handle: params.message_handle,
        reaction: params.reaction,
      });
      return {
        content: [{ type: "text" as const, text: `${params.reaction} reaction sent` }],
        details: { result },
      };
    },
  });

  pi.registerTool({
    name: "imessage_history",
    label: "iMessage History",
    description: "Fetch recent iMessage history for a phone number via SendBlue API.",
    promptSnippet: "Fetch recent iMessage conversation history",
    parameters: Type.Object({
      number: Type.Optional(Type.String({ description: "Phone number to filter by" })),
      limit: Type.Optional(Type.Number({ description: "Max messages to return (default 20)" })),
    }),
    async execute(_toolCallId, params) {
      const url = new URL("https://api.sendblue.co/api/v2/messages");
      if (params.limit) url.searchParams.set("limit", String(params.limit));
      if (params.number) url.searchParams.set("number", params.number);

      const res = await fetch(url.toString(), { headers: API_HEADERS });
      if (!res.ok) throw new Error(`SendBlue API error ${res.status}`);
      const data = (await res.json()) as { data: Array<Record<string, unknown>> };

      const messages = (data.data ?? []).map((m) => {
        const dir = m.is_outbound ? "->" : "<-";
        const content = (m.content as string) ?? "[media]";
        const date = (m.date_sent as string) ?? "";
        const handle = (m.message_handle as string) ?? "";
        return `${dir} ${date} | "${content.slice(0, 120)}" | handle: ${handle}`;
      });

      return {
        content: [{ type: "text" as const, text: messages.join("\n") || "(no messages)" }],
        details: {},
      };
    },
  });
}

// ============================================================================
// Legacy inbox drain -- process any files left from the old architecture
// ============================================================================

function drainLegacyInbox(pi: ExtensionAPI): void {
  const INBOX_DIR = join(homedir(), ".imessage-channel", "inbox");
  const DEAD_LETTER_DIR = join(homedir(), ".imessage-channel", "dead-letter");

  for (const dir of [DEAD_LETTER_DIR, INBOX_DIR]) {
    try {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
      for (const file of files) {
        const filepath = join(dir, file);
        try {
          const raw = fs.readFileSync(filepath, "utf-8");
          const msg = JSON.parse(raw) as {
            from: string;
            content: string;
            media_url: string | null;
            message_handle: string;
            service?: string;
          };
          pi.sendUserMessage(
            `[iMessage from ${msg.from} | handle: ${msg.message_handle} | service: ${msg.service ?? "iMessage"}]\n\n${msg.content}${msg.media_url ? `\n\n[Attachment: ${msg.media_url}]` : ""}`,
            { deliverAs: "steer" },
          );
          fs.unlinkSync(filepath);
          console.log(`${LOG} Drained legacy inbox file: ${file}`);
        } catch (err) {
          console.error(`${LOG} Failed to drain legacy file ${file}:`, err);
          try { fs.unlinkSync(filepath); } catch {}
        }
      }
    } catch {
      // dir doesn't exist or not readable -- that's fine
    }
  }
}
