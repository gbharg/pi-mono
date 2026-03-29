/**
 * Linear Webhook Server
 * 
 * Receives Linear webhook events and writes them to the inbox
 * for Pi to process on next session start or turn.
 * 
 * Events: issue state changes, comments, project updates
 * Port: 3002
 */

import express from "express";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import crypto from "node:crypto";

const PORT = 3002;
const INBOX_DIR = join(homedir(), ".pi", "linear-inbox");
const ENV_PATH = join(homedir(), "pi-mono", ".pi", ".env");

mkdirSync(INBOX_DIR, { recursive: true });

// Load env
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const lines = readFileSync(ENV_PATH, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq > 0) env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
    }
  } catch {}
  return env;
}

const env = loadEnv();

const app = express();
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "linear-webhook", timestamp: new Date().toISOString() });
});

// Linear webhook endpoint
app.post("/webhook", (req, res) => {
  res.status(200).json({ received: true });

  const body = req.body as Record<string, unknown>;
  const action = body.action as string;
  const type = body.type as string;
  const data = body.data as Record<string, unknown> | undefined;

  if (!action || !type) return;

  console.log(`[${new Date().toISOString()}] Linear webhook: ${type} ${action}`);

  // Write to inbox for Pi to process
  const ts = Date.now();
  const filename = `${ts}-${type}-${action}.json`;
  try {
    writeFileSync(
      join(INBOX_DIR, filename),
      JSON.stringify({
        timestamp: new Date().toISOString(),
        type,
        action,
        data,
        url: body.url,
      }, null, 2) + "\n",
    );
  } catch (err) {
    console.error(`Failed to write inbox file: ${err}`);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[${new Date().toISOString()}] Linear webhook server listening on :${PORT}`);
});
