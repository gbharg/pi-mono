/**
 * Sendblue Extension for Pi — iMessage/SMS via Sendblue API
 *
 * Add iMessage/SMS to any Pi fork. Clone into ~/.pi/extensions/sendblue,
 * configure .env, and start Pi.
 *
 * Architecture:
 *   Sendblue webhook -> HTTP server (in-process) -> pi.sendUserMessage() -> Pi session
 *   Pi session -> reply/react/typing tools -> Sendblue API -> iMessage/SMS
 */

import * as fs from "node:fs";
import * as http from "node:http";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { StringEnum } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

const EXTENSION_DIR = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const LOG = "[sendblue]";
const MAX_BODY_SIZE = 1_048_576; // 1 MB — prevents memory exhaustion on malicious POST

// -- Configuration --

function loadEnv(): Record<string, string> {
	const candidates = [
		join(EXTENSION_DIR, ".env"),
		join(homedir(), ".pi", "sendblue", ".env"),
		join(homedir(), "sendblue-channel", ".env"),
	];
	const env: Record<string, string> = {};
	for (const envPath of candidates) {
		try {
			const lines = fs.readFileSync(envPath, "utf-8").split("\n");
			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed || trimmed.startsWith("#")) continue;
				const eq = trimmed.indexOf("=");
				if (eq > 0) {
					const key = trimmed.slice(0, eq);
					if (!(key in env)) {
						let val = trimmed.slice(eq + 1);
						// Strip surrounding quotes (single or double)
						if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
							val = val.slice(1, -1);
						}
						env[key] = val;
					}
				}
			}
			console.log(`${LOG} Loaded config from ${envPath}`);
			break;
		} catch {
			// try next candidate
		}
	}
	return env;
}

const env = loadEnv();
const API_KEY_ID = process.env.SENDBLUE_API_KEY_ID ?? env.SENDBLUE_API_KEY_ID ?? "";
const API_SECRET = process.env.SENDBLUE_API_SECRET_KEY ?? env.SENDBLUE_API_SECRET_KEY ?? "";
const OWN_NUMBER = process.env.SENDBLUE_OWN_NUMBER ?? env.SENDBLUE_OWN_NUMBER ?? "";
const WEBHOOK_PORT = parseInt(process.env.WEBHOOK_PORT ?? env.WEBHOOK_PORT ?? "3001", 10);
const WEBHOOK_HOST = process.env.WEBHOOK_HOST ?? env.WEBHOOK_HOST ?? "0.0.0.0";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? env.WEBHOOK_SECRET ?? "";

const ALLOWED_NUMBERS = new Set(
	(process.env.ALLOWED_NUMBERS ?? env.ALLOWED_NUMBERS ?? "")
		.split(",")
		.map((n) => n.trim())
		.filter(Boolean)
		.map(normalizeNumber),
);

const DATA_DIR = process.env.SENDBLUE_DATA_DIR ?? env.SENDBLUE_DATA_DIR ?? EXTENSION_DIR;

if (!API_KEY_ID || !API_SECRET) {
	console.error(`${LOG} SENDBLUE_API_KEY_ID and SENDBLUE_API_SECRET_KEY are required. See .env.example`);
}

const API_HEADERS: Record<string, string> = {
	"Content-Type": "application/json",
	"sb-api-key-id": API_KEY_ID,
	"sb-api-secret-key": API_SECRET,
};

// Headers for GET requests (no Content-Type needed)
const API_HEADERS_GET: Record<string, string> = {
	"sb-api-key-id": API_KEY_ID,
	"sb-api-secret-key": API_SECRET,
};

// -- Helpers --

function normalizeNumber(addr: string): string {
	// Preserve leading + for international numbers
	if (addr.startsWith("+")) {
		const digits = addr.slice(1).replace(/\D/g, "");
		return `+${digits}`;
	}
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
		throw new Error(`Sendblue API error ${res.status}: ${text}`);
	}
	return (await res.json()) as Record<string, unknown>;
}

async function fetchRecentHistory(limit = 50): Promise<string> {
	try {
		const url = new URL("https://api.sendblue.co/api/v2/messages");
		url.searchParams.set("limit", String(limit));
		const res = await fetch(url.toString(), { headers: API_HEADERS_GET });
		if (!res.ok) return "";
		const data = (await res.json()) as { data: Array<Record<string, unknown>> };
		return (data.data ?? [])
			.map((m) => {
				const dir = m.is_outbound ? "SENT" : "RECEIVED";
				const number = (m.number as string) ?? "unknown";
				const content = ((m.content as string) ?? "[media]").slice(0, 200);
				const date = (m.date_sent as string) ?? "";
				const handle = (m.message_handle as string) ?? "";
				return `[${dir}] ${date} | ${number} | "${content}" | handle: ${handle}`;
			})
			.join("\n");
	} catch (err) {
		console.error(`${LOG} Error fetching history:`, err);
		return "";
	}
}

function logMessage(entry: Record<string, unknown>): void {
	const logPath = join(DATA_DIR, "messages.jsonl");
	try {
		fs.appendFileSync(logPath, JSON.stringify(entry) + "\n", "utf-8");
	} catch (err) {
		console.error(`${LOG} Failed to write message log:`, err);
	}
}

function readBody(req: http.IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		let total = 0;
		req.on("data", (chunk: Buffer) => {
			total += chunk.length;
			if (total > MAX_BODY_SIZE) {
				req.destroy();
				reject(new Error("Body too large"));
				return;
			}
			chunks.push(chunk);
		});
		req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
		req.on("error", reject);
		// Timeout: abort if body not received within 10s
		req.setTimeout(10_000, () => {
			req.destroy();
			reject(new Error("Body read timeout"));
		});
	});
}

// ============================================================================
// Extension entry point
// ============================================================================

export default function sendblueExtension(pi: ExtensionAPI) {
	if (!API_KEY_ID || !API_SECRET) return;

	let server: http.Server | null = null;

	pi.on("session_start", async (_event, ctx) => {
		if (server) return;

		// Inject recent history as hidden context
		fetchRecentHistory(50)
			.then((history) => {
				if (history) {
					pi.sendMessage(
						{
							customType: "sendblue-history",
							content: `[Message History -- last 50]\n\n${history}`,
							display: false,
						},
						{ deliverAs: "nextTurn" },
					);
				}
			})
			.catch((err) => console.error(`${LOG} Failed to inject history:`, err));

		// -- Webhook server --
		server = http.createServer(async (req, res) => {
			if (req.method === "GET" && req.url === "/health") {
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ ok: true, channel: "sendblue", timestamp: new Date().toISOString() }));
				return;
			}

			if (req.method === "POST" && req.url === "/webhook") {
				// Authenticate if WEBHOOK_SECRET is configured
				if (WEBHOOK_SECRET) {
					const provided = req.headers["x-webhook-secret"] ?? req.headers["authorization"];
					if (provided !== WEBHOOK_SECRET && provided !== `Bearer ${WEBHOOK_SECRET}`) {
						res.writeHead(401);
						res.end(JSON.stringify({ error: "Unauthorized" }));
						return;
					}
				}

				let raw: string;
				let body: Record<string, unknown>;
				try {
					raw = await readBody(req);
					body = JSON.parse(raw) as Record<string, unknown>;
				} catch (err) {
					console.error(`${LOG} Webhook body error:`, err);
					res.writeHead(400);
					res.end(JSON.stringify({ error: "Bad request" }));
					return;
				}

				// Respond 200 after successful parse
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ received: true }));

				try {
					if (body.is_outbound === true) {
						console.log(`${LOG} Status: ${String(body.status)} for ${String(body.number ?? body.to_number)}`);
						return;
					}

					const sender = (body.from_number as string) ?? (body.number as string) ?? "";
					const content = (body.content as string) ?? "";
					const mediaUrl = (body.media_url as string) ?? null;
					const messageHandle = (body.message_handle as string) ?? "";
					const service = (body.service as string) ?? "iMessage";

					if (!sender || (!content && !mediaUrl)) return;
					if (!isAllowed(sender)) {
						console.warn(`${LOG} Dropped from non-allowed: ${sender}`);
						return;
					}

					console.log(`${LOG} Inbound from ${sender}: "${content.slice(0, 80)}"${mediaUrl ? " [+media]" : ""}`);

					logMessage({
						timestamp: (body.date_sent as string) || new Date().toISOString(),
						direction: "inbound",
						from: sender,
						to: OWN_NUMBER,
						content,
						media_url: mediaUrl,
						message_handle: messageHandle,
						service,
					});

					// Auto read receipt + typing (fire and forget)
					sendbluePost("/api/mark-read", { from_number: OWN_NUMBER, number: sender }).catch(() => {});
					sendbluePost("/api/send-typing-indicator", { from_number: OWN_NUMBER, number: sender }).catch(() => {});

					// Inject into Pi session
					const text = `[iMessage from ${sender} | handle: ${messageHandle} | service: ${service}]\n\n${content}${mediaUrl && mediaUrl !== "null" ? `\n\n[Attachment: ${mediaUrl}]` : ""}`;
					pi.sendUserMessage(text, { deliverAs: "steer" });
				} catch (err) {
					console.error(`${LOG} Webhook processing error:`, err);
				}
				return;
			}

			if (req.method === "POST" && req.url === "/webhook/typing") {
				res.writeHead(200);
				res.end(JSON.stringify({ received: true }));
				return;
			}

			res.writeHead(404);
			res.end(JSON.stringify({ error: "Not found" }));
		});

		server.unref();
		server.listen(WEBHOOK_PORT, WEBHOOK_HOST, () => {
			console.log(
				`${LOG} Webhook listening on ${WEBHOOK_HOST}:${WEBHOOK_PORT}${WEBHOOK_SECRET ? " (authenticated)" : " (WARNING: no WEBHOOK_SECRET set)"}`,
			);
		});
		server.on("error", (err: NodeJS.ErrnoException) => {
			if (err.code === "EADDRINUSE") {
				console.error(`${LOG} Port ${WEBHOOK_PORT} in use. Kill the other process or change WEBHOOK_PORT.`);
			} else {
				console.error(`${LOG} Server error:`, err);
			}
		});

		if (ctx.hasUI) {
			ctx.ui.setStatus("sendblue", `Sendblue active (${OWN_NUMBER}) on :${WEBHOOK_PORT}`);
		}
	});

	pi.on("session_shutdown", async () => {
		if (server) {
			server.close();
			server = null;
		}
	});

	// -- Tools --

	pi.registerTool({
		name: "sendblue_reply",
		label: "Send Message",
		description: "Send an iMessage/SMS reply via Sendblue.",
		promptSnippet: "Send an iMessage/SMS reply to a phone number",
		promptGuidelines: [
			"When you receive an iMessage (indicated by [iMessage from ...]), respond using sendblue_reply.",
			"Keep responses concise and conversational -- no markdown, plain text only.",
			"Include reply_to (message_handle) from the inbound message for threading when available.",
		],
		parameters: Type.Object({
			number: Type.String({ description: "Recipient phone number (E.164, e.g. +19723637754)" }),
			content: Type.String({ description: "Message text" }),
			reply_to: Type.Optional(Type.String({ description: "message_handle to reply to (for threading)" })),
		}),
		async execute(_toolCallId, params) {
			// Typing indicator (fire and forget — no blocking delay)
			sendbluePost("/api/send-typing-indicator", { from_number: OWN_NUMBER, number: params.number }).catch(() => {});

			const body: Record<string, unknown> = {
				number: params.number,
				content: params.content,
				from_number: OWN_NUMBER,
			};
			if (params.reply_to) body.reply_to_message_handle = params.reply_to;

			const result = await sendbluePost("/api/send-message", body);

			logMessage({
				timestamp: new Date().toISOString(),
				direction: "outbound",
				from: OWN_NUMBER,
				to: params.number,
				content: params.content,
				message_handle: (result as Record<string, unknown>).message_handle ?? "",
			});

			const preview = params.content.length > 80 ? params.content.slice(0, 80) + "..." : params.content;
			return {
				content: [{ type: "text" as const, text: `Sent to ${params.number}: "${preview}"` }],
				details: { result },
			};
		},
	});

	pi.registerTool({
		name: "sendblue_react",
		label: "React",
		description: "Send a tapback reaction to an iMessage.",
		promptSnippet: "Send a tapback reaction (love/like/laugh/emphasize/question)",
		parameters: Type.Object({
			number: Type.String({ description: "Recipient phone number" }),
			message_handle: Type.String({ description: "message_handle of message to react to" }),
			reaction: StringEnum(["love", "like", "dislike", "laugh", "emphasize", "question"], {
				description: "Reaction type",
			}),
		}),
		async execute(_toolCallId, params) {
			await sendbluePost("/api/send-reaction", {
				from_number: OWN_NUMBER,
				number: params.number,
				message_handle: params.message_handle,
				reaction: params.reaction,
			});
			return { content: [{ type: "text" as const, text: `${params.reaction} reaction sent` }], details: {} };
		},
	});

	pi.registerTool({
		name: "sendblue_history",
		label: "Message History",
		description: "Fetch recent message history from Sendblue.",
		promptSnippet: "Fetch recent iMessage/SMS conversation history",
		parameters: Type.Object({
			number: Type.Optional(Type.String({ description: "Phone number to filter by" })),
			limit: Type.Optional(Type.Number({ description: "Max messages (default 20)" })),
		}),
		async execute(_toolCallId, params) {
			const url = new URL("https://api.sendblue.co/api/v2/messages");
			if (params.limit != null) url.searchParams.set("limit", String(params.limit));
			if (params.number) url.searchParams.set("number", params.number);

			const res = await fetch(url.toString(), { headers: API_HEADERS_GET });
			if (!res.ok) throw new Error(`Sendblue API error ${res.status}`);
			const data = (await res.json()) as { data: Array<Record<string, unknown>> };

			const messages = (data.data ?? []).map((m) => {
				const dir = m.is_outbound ? "->" : "<-";
				const content = ((m.content as string) ?? "[media]").slice(0, 120);
				const date = (m.date_sent as string) ?? "";
				const handle = (m.message_handle as string) ?? "";
				return `${dir} ${date} | "${content}" | handle: ${handle}`;
			});

			return { content: [{ type: "text" as const, text: messages.join("\n") || "(no messages)" }], details: {} };
		},
	});

	pi.registerTool({
		name: "sendblue_mark_read",
		label: "Mark Read",
		description: "Send a read receipt for a conversation.",
		promptSnippet: "Send a read receipt to a phone number",
		parameters: Type.Object({
			number: Type.String({ description: "Phone number to send read receipt to" }),
		}),
		async execute(_toolCallId, params) {
			await sendbluePost("/api/mark-read", { from_number: OWN_NUMBER, number: params.number });
			return { content: [{ type: "text" as const, text: `Read receipt sent to ${params.number}` }], details: {} };
		},
	});

	pi.registerTool({
		name: "sendblue_typing",
		label: "Typing Indicator",
		description: "Show typing indicator in a conversation.",
		promptSnippet: "Show typing indicator to a phone number",
		parameters: Type.Object({
			number: Type.String({ description: "Phone number to show typing to" }),
		}),
		async execute(_toolCallId, params) {
			await sendbluePost("/api/send-typing-indicator", { from_number: OWN_NUMBER, number: params.number });
			return {
				content: [{ type: "text" as const, text: `Typing indicator sent to ${params.number}` }],
				details: {},
			};
		},
	});
}
