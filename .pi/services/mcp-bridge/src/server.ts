import { Hono } from "hono";
import { cors } from "hono/cors";
import servers from "../servers.json";
import { refreshAccessToken } from "./auth";
import { getAccessToken, getServerAuth } from "./store";

type ServerConfig = { url: string; name: string };
const serverMap = servers as Record<string, ServerConfig>;

const app = new Hono();

// CORS for all routes (webclaw on Vercel needs this)
app.use("*", cors({ origin: "*" }));

// Bearer token auth for remote access (skip for localhost)
const BRIDGE_TOKEN = process.env.MCP_BRIDGE_TOKEN;
app.use("/:server", async (c, next) => {
  // Trust localhost — no token needed
  const host = c.req.header("host") || "";
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
    return next();
  }
  // Remote requests require bearer token
  if (!BRIDGE_TOKEN) {
    return c.json({ error: "Bridge token not configured for remote access" }, 503);
  }
  const authHeader = c.req.header("authorization");
  if (!authHeader || authHeader !== `Bearer ${BRIDGE_TOKEN}`) {
    return c.json({ error: "Invalid or missing bridge token" }, 401);
  }
  return next();
});

// Health + status endpoint (no auth required)
app.get("/health", (c) => {
  const status: Record<string, { name: string; authenticated: boolean; url: string }> = {};
  for (const [id, config] of Object.entries(serverMap)) {
    status[id] = {
      name: config.name,
      authenticated: !!getAccessToken(id),
      url: `http://localhost:${c.env?.port || 3100}/${id}`,
    };
  }
  return c.json({ ok: true, servers: status });
});

// Hop-by-hop headers to strip when proxying
const HOP_HEADERS = new Set([
  "host",
  "authorization",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "te",
  "trailer",
  "upgrade",
]);

// MCP proxy — handles all methods (POST, GET, DELETE) for Streamable HTTP
app.all("/:server", async (c) => {
  const serverName = c.req.param("server");
  const config = serverMap[serverName];
  if (!config) {
    return c.json(
      { error: `Unknown server: ${serverName}`, available: Object.keys(serverMap) },
      404,
    );
  }

  // Get access token (returns null if expired)
  let accessToken = getAccessToken(serverName);

  // Try refresh if expired
  if (!accessToken) {
    const auth = getServerAuth(serverName);
    if (auth?.tokens?.refresh_token) {
      const refreshed = await refreshAccessToken(serverName);
      if (refreshed) {
        accessToken = refreshed.access_token;
      }
    }
  }

  if (!accessToken) {
    return c.json(
      {
        error: `Not authenticated for ${serverName}`,
        hint: `Run: cd ~/openclaw/tools/mcp-bridge && bun run auth ${serverName}`,
      },
      401,
    );
  }

  // Buffer request body so we can retry on 401
  const hasBody = !["GET", "HEAD", "DELETE"].includes(c.req.method);
  const body = hasBody ? await c.req.arrayBuffer() : undefined;

  // Build upstream headers
  const fwdHeaders = new Headers();
  for (const [key, value] of c.req.raw.headers.entries()) {
    if (!HOP_HEADERS.has(key.toLowerCase())) {
      fwdHeaders.set(key, value);
    }
  }
  fwdHeaders.set("Authorization", `Bearer ${accessToken}`);

  // Forward to upstream
  let response = await fetch(config.url, {
    method: c.req.method,
    headers: fwdHeaders,
    body,
  });

  // On 401: attempt token refresh and retry once
  if (response.status === 401) {
    const refreshed = await refreshAccessToken(serverName);
    if (refreshed) {
      fwdHeaders.set("Authorization", `Bearer ${refreshed.access_token}`);
      response = await fetch(config.url, {
        method: c.req.method,
        headers: fwdHeaders,
        body,
      });
    }
  }

  // Build response, stripping hop-by-hop headers
  const resHeaders = new Headers();
  for (const [key, value] of response.headers.entries()) {
    if (!HOP_HEADERS.has(key.toLowerCase())) {
      resHeaders.set(key, value);
    }
  }

  return new Response(response.body, {
    status: response.status,
    headers: resHeaders,
  });
});

export default app;
