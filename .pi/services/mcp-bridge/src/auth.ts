import { randomBytes, createHash } from "crypto";
import {
  getServerAuth,
  saveServerAuth,
  type OAuthClient,
  type OAuthMetadata,
  type OAuthTokens,
  type ServerAuth,
} from "./store";

const CALLBACK_PORT = 3101;
const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}/callback`;

// PKCE: generate code verifier + challenge
function generatePKCE() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

// Discover OAuth metadata using MCP spec discovery chain:
// 1. Path-aware: <origin>/.well-known/oauth-authorization-server<path>
// 2. Standard:   <origin>/.well-known/oauth-authorization-server
// 3. Resource:   401 → WWW-Authenticate → resource_metadata → authorization_servers
async function discoverMetadata(serverUrl: string): Promise<OAuthMetadata> {
  const parsed = new URL(serverUrl);
  const origin = parsed.origin;
  const path = parsed.pathname;

  // 1. Path-aware discovery
  const pathAwareUrl = `${origin}/.well-known/oauth-authorization-server${path}`;
  let res = await fetch(pathAwareUrl);
  if (res.ok) {
    return res.json();
  }

  // 2. Standard discovery
  const standardUrl = `${origin}/.well-known/oauth-authorization-server`;
  res = await fetch(standardUrl);
  if (res.ok) {
    return res.json();
  }

  // 3. Resource metadata discovery via WWW-Authenticate header
  const probeRes = await fetch(serverUrl);
  if (probeRes.status === 401) {
    const wwwAuth = probeRes.headers.get("www-authenticate") || "";
    const rmMatch = wwwAuth.match(/resource_metadata="([^"]+)"/);
    if (rmMatch) {
      const rmRes = await fetch(rmMatch[1]);
      if (rmRes.ok) {
        const rm = (await rmRes.json()) as { authorization_servers?: string[] };
        if (rm.authorization_servers?.[0]) {
          // Fetch the authorization server metadata
          const asUrl = `${new URL(rm.authorization_servers[0]).origin}/.well-known/oauth-authorization-server${new URL(rm.authorization_servers[0]).pathname}`;
          res = await fetch(asUrl);
          if (res.ok) {
            return res.json();
          }
        }
      }
    }
  }

  throw new Error(
    `OAuth discovery failed for ${serverUrl}. Tried:\n` +
      `  ${pathAwareUrl}\n  ${standardUrl}\n  WWW-Authenticate header`,
  );
}

// Dynamic client registration (RFC 7591)
async function registerClient(metadata: OAuthMetadata): Promise<OAuthClient> {
  if (!metadata.registration_endpoint) {
    throw new Error(
      "Server does not support dynamic client registration. " +
        "You may need to register manually and add client_id to the auth file.",
    );
  }
  const res = await fetch(metadata.registration_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "Pi Agent MCP Bridge",
      redirect_uris: [REDIRECT_URI],
      token_endpoint_auth_method:
        metadata.token_endpoint_auth_methods_supported?.[0] || "client_secret_post",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Client registration failed: ${res.status} — ${body}`);
  }
  return res.json();
}

// Exchange authorization code for tokens
async function exchangeCode(
  metadata: OAuthMetadata,
  client: OAuthClient,
  code: string,
  codeVerifier: string,
): Promise<OAuthTokens> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: client.client_id,
    code_verifier: codeVerifier,
  });
  if (client.client_secret) {
    params.set("client_secret", client.client_secret);
  }

  const res = await fetch(metadata.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed: ${res.status} — ${body}`);
  }
  const tokens: OAuthTokens = await res.json();
  if (tokens.expires_in) {
    tokens.expires_at = Date.now() + tokens.expires_in * 1000;
  }
  return tokens;
}

// Refresh an expired access token
export async function refreshAccessToken(serverName: string): Promise<OAuthTokens | null> {
  const auth = getServerAuth(serverName);
  if (!auth?.tokens?.refresh_token || !auth.metadata || !auth.client) {
    return null;
  }

  try {
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: auth.tokens.refresh_token,
      client_id: auth.client.client_id,
    });
    if (auth.client.client_secret) {
      params.set("client_secret", auth.client.client_secret);
    }

    const res = await fetch(auth.metadata.token_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    if (!res.ok) {
      return null;
    }

    const tokens: OAuthTokens = await res.json();
    if (tokens.expires_in) {
      tokens.expires_at = Date.now() + tokens.expires_in * 1000;
    }
    // Preserve refresh_token if server didn't return a new one
    if (!tokens.refresh_token && auth.tokens.refresh_token) {
      tokens.refresh_token = auth.tokens.refresh_token;
    }
    auth.tokens = tokens;
    saveServerAuth(serverName, auth);
    return tokens;
  } catch (err) {
    console.error(`Token refresh failed for ${serverName}:`, err);
    return null;
  }
}

// Open browser, wait for OAuth callback, return authorization code
function waitForCallback(authUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = Bun.serve({
      port: CALLBACK_PORT,
      fetch(req) {
        const url = new URL(req.url);
        if (url.pathname === "/callback") {
          const error = url.searchParams.get("error");
          if (error) {
            const desc = url.searchParams.get("error_description") || error;
            reject(new Error(`OAuth denied: ${desc}`));
            setTimeout(() => server.stop(), 200);
            return new Response(
              `<html><body><h2>Authorization failed</h2><p>${desc}</p><p>You can close this tab.</p></body></html>`,
              { headers: { "Content-Type": "text/html" } },
            );
          }

          const code = url.searchParams.get("code");
          if (code) {
            resolve(code);
            setTimeout(() => server.stop(), 200);
            return new Response(
              "<html><body><h2>Authorized!</h2><p>You can close this tab.</p></body></html>",
              { headers: { "Content-Type": "text/html" } },
            );
          }
        }
        return new Response("Not found", { status: 404 });
      },
    });

    console.log("Opening browser for authorization...");
    Bun.spawn(["open", authUrl]);

    // Timeout after 2 minutes
    setTimeout(() => {
      void server.stop();
      reject(new Error("Authorization timed out (2 min)"));
    }, 120_000);
  });
}

// Full interactive OAuth authorization flow
export async function authorize(serverName: string, serverUrl: string): Promise<void> {
  console.log(`\nAuthenticating ${serverName}...`);
  console.log(`  Server: ${serverUrl}`);

  // 1. Discover OAuth metadata
  console.log("  Discovering OAuth metadata...");
  const metadata = await discoverMetadata(serverUrl);
  console.log(`  Auth endpoint: ${metadata.authorization_endpoint}`);
  console.log(`  Token endpoint: ${metadata.token_endpoint}`);

  // 2. Register client (or reuse existing)
  let auth: ServerAuth = getServerAuth(serverName) || {};
  let client = auth.client;

  if (!client) {
    console.log("  Registering OAuth client...");
    client = await registerClient(metadata);
    console.log(`  Client ID: ${client.client_id}`);
  } else {
    console.log(`  Reusing client: ${client.client_id}`);
  }

  // 3. Build authorization URL with PKCE
  const pkce = generatePKCE();
  const state = randomBytes(16).toString("hex");

  const authUrl = new URL(metadata.authorization_endpoint);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", client.client_id);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("code_challenge", pkce.challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("state", state);
  if (metadata.scopes_supported?.length) {
    authUrl.searchParams.set("scope", metadata.scopes_supported.join(" "));
  }

  // 4. Open browser and wait for callback
  const code = await waitForCallback(authUrl.toString());

  // 5. Exchange code for tokens
  console.log("  Exchanging code for tokens...");
  const tokens = await exchangeCode(metadata, client, code, pkce.verifier);
  console.log("  Access token received");

  // 6. Persist
  saveServerAuth(serverName, { client, tokens, metadata });
  console.log(`\n  ${serverName} authenticated successfully!\n`);
}
