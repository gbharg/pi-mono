import servers from "../servers.json";
import { authorize } from "./auth";
import app from "./server";
import { getAccessToken, getServerAuth } from "./store";

type ServerConfig = { url: string; name: string };
const serverMap = servers as Record<string, ServerConfig>;

const command = Bun.argv[2];
const PORT = parseInt(process.env.MCP_BRIDGE_PORT || "3100");

switch (command) {
  case "serve": {
    console.log(`MCP Bridge v1.0.0 — port ${PORT}\n`);

    for (const [id, config] of Object.entries(serverMap)) {
      const token = getAccessToken(id);
      console.log(
        `  ${token ? "✓" : "✗"} ${config.name.padEnd(12)} → http://localhost:${PORT}/${id}`,
      );
    }

    Bun.serve({ port: PORT, fetch: app.fetch });
    console.log(`\nListening on http://localhost:${PORT}`);
    break;
  }

  case "auth": {
    const serverName = Bun.argv[3];
    if (!serverName) {
      console.error("Usage: bun run src/cli.ts auth <server>");
      console.error(`\nAvailable servers: ${Object.keys(serverMap).join(", ")}`);
      process.exit(1);
    }
    const config = serverMap[serverName];
    if (!config) {
      console.error(`Unknown server: ${serverName}`);
      console.error(`Available: ${Object.keys(serverMap).join(", ")}`);
      process.exit(1);
    }
    try {
      await authorize(serverName, config.url);
    } catch (err) {
      console.error(`\nAuth failed:`, (err as Error).message);
      process.exit(1);
    }
    break;
  }

  case "status": {
    console.log("MCP Bridge Status\n");
    for (const [id, config] of Object.entries(serverMap)) {
      const auth = getServerAuth(id);
      const validToken = getAccessToken(id);
      const hasRefresh = !!auth?.tokens?.refresh_token;
      const expiry = auth?.tokens?.expires_at
        ? new Date(auth.tokens.expires_at).toLocaleString()
        : "—";
      const authedAt = auth?.authenticated_at
        ? new Date(auth.authenticated_at).toLocaleString()
        : "—";

      let status = "✗ not authenticated";
      if (validToken) {
        status = "✓ valid";
      } else if (auth?.tokens && hasRefresh) {
        status = "↻ expired (has refresh token)";
      } else if (auth?.tokens) {
        status = "✗ expired (no refresh token)";
      }

      console.log(`${config.name} (${id}):`);
      console.log(`  Upstream:  ${config.url}`);
      console.log(`  Proxy:     http://localhost:${PORT}/${id}`);
      console.log(`  Status:    ${status}`);
      console.log(`  Expires:   ${expiry}`);
      console.log(`  Auth date: ${authedAt}`);
      console.log();
    }
    break;
  }

  default: {
    console.log(`MCP Bridge — centralized OAuth proxy for MCP servers

Usage:
  bun run src/cli.ts serve              Start the proxy server
  bun run src/cli.ts auth <server>      Authenticate with an MCP server
  bun run src/cli.ts status             Show authentication status

Servers: ${Object.keys(serverMap).join(", ")}

Once running, point your tools to http://localhost:${PORT}/<server> instead of
the remote MCP URL. The bridge handles OAuth tokens transparently.`);
  }
}
