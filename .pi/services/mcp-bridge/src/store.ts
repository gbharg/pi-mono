import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const BRIDGE_DIR = join(homedir(), ".mcp-bridge");

export interface OAuthClient {
  client_id: string;
  client_secret?: string;
  redirect_uris: string[];
}

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
  expires_at?: number;
  scope?: string;
}

export interface OAuthMetadata {
  issuer?: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  code_challenge_methods_supported?: string[];
}

export interface ServerAuth {
  client?: OAuthClient;
  tokens?: OAuthTokens;
  metadata?: OAuthMetadata;
  authenticated_at?: string;
}

function ensureDir() {
  if (!existsSync(BRIDGE_DIR)) {
    mkdirSync(BRIDGE_DIR, { recursive: true, mode: 0o700 });
  }
}

export function getServerAuth(serverName: string): ServerAuth | null {
  const path = join(BRIDGE_DIR, `${serverName}.json`);
  if (!existsSync(path)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

export function saveServerAuth(serverName: string, auth: ServerAuth) {
  ensureDir();
  auth.authenticated_at = new Date().toISOString();
  writeFileSync(join(BRIDGE_DIR, `${serverName}.json`), JSON.stringify(auth, null, 2), {
    mode: 0o600,
  });
}

export function getAccessToken(serverName: string): string | null {
  const auth = getServerAuth(serverName);
  if (!auth?.tokens?.access_token) {
    return null;
  }
  // Check expiry (with 60s buffer)
  if (auth.tokens.expires_at && Date.now() > auth.tokens.expires_at - 60_000) {
    return null;
  }
  return auth.tokens.access_token;
}

export function listAuthenticatedServers(): string[] {
  ensureDir();
  return readdirSync(BRIDGE_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""));
}
