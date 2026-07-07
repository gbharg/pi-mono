/**
 * iMac Codex — self-contained Microsoft Teams bot responder.
 *
 * A deliberately compact, dependency-free Bun server that:
 *   - receives Bot Framework activities at POST /api/messages
 *   - verifies the inbound JWT (RS256, Bot Framework JWKS, audience check)
 *   - generates a reply with the local `claude -p` CLI running TOOL-LESS
 *     (team members get conversation only — no PHI / clinic / financial tools)
 *   - posts the reply back via the Bot Framework REST API
 *
 * Isolated from the production "Exult Agent" bot: separate App ID, separate
 * port, separate process. Nothing here touches the exult stack.
 *
 * Env (see .env):
 *   MSTEAMS_APP_ID, MSTEAMS_APP_PASSWORD, MSTEAMS_TENANT_ID, MSTEAMS_WEBHOOK_PORT
 */

import { execFile } from "node:child_process";

const APP_ID = process.env.MSTEAMS_APP_ID ?? "";
const APP_PASSWORD = process.env.MSTEAMS_APP_PASSWORD ?? "";
const TENANT_ID = process.env.MSTEAMS_TENANT_ID ?? "botframework.com";
const PORT = Number(process.env.MSTEAMS_WEBHOOK_PORT ?? "3979");
const AUDIT = "/tmp/imac-teams-audit.log";

if (!APP_ID || !APP_PASSWORD) {
  console.error("iMac Codex: MSTEAMS_APP_ID and MSTEAMS_APP_PASSWORD are required");
  process.exit(1);
}

// --- audit -----------------------------------------------------------------
function audit(dir: string, who: string, text: string) {
  const line = `[${new Date().toISOString()}] [${dir}] [${who}] ${text.replace(/\s+/g, " ").slice(0, 500)}\n`;
  try {
    require("node:fs").appendFileSync(AUDIT, line);
  } catch {}
  console.log(line.trim());
}

// --- inbound JWT verification (RS256 against Bot Framework JWKS) ------------
type Jwk = { kid: string; n: string; e: string; kty: string };
let jwksCache: { keys: Jwk[]; at: number } | null = null;

function b64urlToBuf(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function getJwks(): Promise<Jwk[]> {
  if (jwksCache && Date.now() - jwksCache.at < 24 * 3600 * 1000) return jwksCache.keys;
  const cfg = await fetch(
    "https://login.botframework.com/v1/.well-known/openidconfiguration",
  ).then((r) => r.json());
  const keys = (await fetch(cfg.jwks_uri).then((r) => r.json())).keys as Jwk[];
  jwksCache = { keys, at: Date.now() };
  return keys;
}

async function verifyInbound(authHeader: string | null): Promise<boolean> {
  try {
    if (!authHeader?.startsWith("Bearer ")) return false;
    const jwt = authHeader.slice(7);
    const [h, p, s] = jwt.split(".");
    if (!h || !p || !s) return false;
    const header = JSON.parse(new TextDecoder().decode(b64urlToBuf(h)));
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBuf(p)));
    // Claims: audience must be our bot, token not expired.
    if (payload.aud !== APP_ID) return false;
    if (typeof payload.exp === "number" && Date.now() / 1000 > payload.exp + 300) return false;
    // Signature: RS256 against the matching Bot Framework key.
    const jwk = (await getJwks()).find((k) => k.kid === header.kid);
    if (!jwk) return false;
    const key = await crypto.subtle.importKey(
      "jwk",
      { kty: "RSA", n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const data = new TextEncoder().encode(`${h}.${p}`);
    return await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlToBuf(s), data);
  } catch (e) {
    audit("ERR", "jwt", String(e));
    return false;
  }
}

// --- outbound Bot Framework token ------------------------------------------
let tokenCache: { token: string; exp: number } | null = null;
async function getBotToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.exp - 60000) return tokenCache.token;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: APP_ID,
    client_secret: APP_PASSWORD,
    scope: "https://api.botframework.com/.default",
  });
  const res = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`token ${res.status}: ${await res.text()}`);
  const j = await res.json();
  tokenCache = { token: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return j.access_token;
}

async function botPost(serviceUrl: string, path: string, body: unknown) {
  const token = await getBotToken();
  const res = await fetch(`${serviceUrl.replace(/\/+$/, "")}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) audit("ERR", "send", `${res.status}: ${await res.text().catch(() => "")}`);
}

async function sendText(serviceUrl: string, conversationId: string, text: string) {
  await botPost(serviceUrl, `/v3/conversations/${encodeURIComponent(conversationId)}/activities`, {
    type: "message",
    text,
  });
}

async function sendTyping(serviceUrl: string, conversationId: string) {
  await botPost(serviceUrl, `/v3/conversations/${encodeURIComponent(conversationId)}/activities`, {
    type: "typing",
  });
}

// --- reply engine: local claude CLI, TOOL-LESS -----------------------------
const SYSTEM = `You are "iMac Codex", a friendly assistant for the Exult Healthcare team, chatting inside Microsoft Teams. This is a permission-limited team-facing demo.
Rules:
- Be concise, warm, and helpful. Keep replies under ~6 sentences unless asked for more.
- You have NO access to patient data (PHI), scheduling, RingCentral, billing, or any internal tools in this chat. Do not claim otherwise.
- If asked to perform clinic operations (look up a patient, change a schedule, pull call logs, process a payment), explain those require the operator's approval and are not enabled for team chat yet — offer to note the request.
- Never invent patient or financial data. Never run commands.
- You can answer general questions, explain what the agent will eventually do, and help the team understand the system.`;

function generateReply(userText: string, sender: string): Promise<string> {
  const prompt = `${SYSTEM}\n\nTeam member ${sender} says: ${userText}\n\nReply:`;
  return new Promise((resolve) => {
    execFile(
      "claude",
      ["-p", prompt, "--output-format", "text"],
      { cwd: "/tmp", timeout: 90000, maxBuffer: 1024 * 1024 },
      (err, stdout) => {
        if (err || !stdout?.trim()) {
          audit("ERR", "reply", String(err));
          resolve("Sorry — I hit a snag generating a reply. Try again in a moment.");
        } else {
          resolve(stdout.trim().slice(0, 3500));
        }
      },
    );
  });
}

// --- HTTP server -----------------------------------------------------------
Bun.serve({
  port: PORT,
  hostname: "127.0.0.1",
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === "GET" && url.pathname === "/health") {
      return Response.json({ ok: true, bot: "iMac Codex", appId: APP_ID });
    }
    if (req.method === "POST" && url.pathname === "/api/messages") {
      const ok = await verifyInbound(req.headers.get("authorization"));
      if (!ok) return new Response("Unauthorized", { status: 401 });
      let activity: any;
      try {
        activity = await req.json();
      } catch {
        return new Response("Bad Request", { status: 400 });
      }
      // Respond 200 immediately; process asynchronously.
      queueMicrotask(async () => {
        try {
          if (activity.type !== "message") return;
          const serviceUrl = String(activity.serviceUrl ?? "");
          const convId = String(activity.conversation?.id ?? "");
          const sender = String(activity.from?.name ?? "teammate");
          const text = String(activity.text ?? "").replace(/<[^>]+>/g, "").trim();
          if (!serviceUrl || !convId || !text) return;
          audit("IN", sender, text);
          await sendTyping(serviceUrl, convId).catch(() => {});
          const reply = await generateReply(text, sender);
          await sendText(serviceUrl, convId, reply);
          audit("OUT", "iMac Codex", reply);
        } catch (e) {
          audit("ERR", "handler", String(e));
        }
      });
      return Response.json({ type: "message" });
    }
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`iMac Codex bot listening on 127.0.0.1:${PORT} (appId ${APP_ID})`);
audit("SYS", "boot", `listening on ${PORT}`);
