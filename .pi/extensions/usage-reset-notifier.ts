/**
 * Pi Extension: Usage Reset Notifier
 * 
 * Monitors CodexBar API usage and sends SMS notifications via SendBlue when:
 * 1. Weekly usage limit resets (was >80%, now <20%)
 * 2. Usage approaches limit (hits 90%)
 * 
 * Checks usage every 30 minutes during active sessions.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// State file path
const STATE_DIR = "/tmp/pi-usage-notifier";
const STATE_FILE = join(STATE_DIR, "usage-state.json");

// Check interval (30 minutes)
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

// SendBlue API configuration
const SENDBLUE_API_URL = "https://api.sendblue.co/api/send-message";
const SENDBLUE_API_KEY_ID = process.env.SENDBLUE_API_KEY_ID;
const SENDBLUE_API_SECRET_KEY = process.env.SENDBLUE_API_SECRET_KEY;
const SENDBLUE_RECIPIENT = "+19723637754";
const SENDBLUE_FROM_NUMBER = process.env.SENDBLUE_OWN_NUMBER || "+16292925296";

interface UsageState {
  lastUsedPercent: number;
  lastCheckTimestamp: number;
  notifiedAt90: boolean;
}

interface CodexBarUsage {
  provider: string;
  source: string;
  usage: {
    primary?: {
      usedPercent: number;
      windowMinutes: number;
    };
    secondary?: {
      usedPercent: number;
      windowMinutes: number;
      resetsAt?: string;
    };
  };
}

export default function (pi: ExtensionAPI) {
  let checkInterval: NodeJS.Timeout | null = null;

  /**
   * Get current usage from CodexBar CLI
   */
  function getClaudeUsage(): number | null {
    try {
      const output = execSync("codexbar usage --provider claude --format json 2>/dev/null", {
        encoding: "utf8",
        timeout: 10000,
      });

      const data: CodexBarUsage[] = JSON.parse(output.trim());
      if (!data || data.length === 0) {
        return null;
      }

      // Get weekly usage (secondary field with windowMinutes: 10080)
      const weeklyUsage = data[0]?.usage?.secondary?.usedPercent;
      return weeklyUsage !== undefined ? weeklyUsage : null;
    } catch (error) {
      console.error("Failed to get CodexBar usage:", error);
      return null;
    }
  }

  /**
   * Load persisted state
   */
  function loadState(): UsageState | null {
    try {
      if (existsSync(STATE_FILE)) {
        const raw = readFileSync(STATE_FILE, "utf8");
        return JSON.parse(raw);
      }
    } catch (error) {
      console.error("Failed to load state:", error);
    }
    return null;
  }

  /**
   * Save state to disk
   */
  function saveState(state: UsageState): void {
    try {
      mkdirSync(STATE_DIR, { recursive: true });
      writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
    } catch (error) {
      console.error("Failed to save state:", error);
    }
  }

  /**
   * Send SMS notification via SendBlue
   */
  async function sendNotification(message: string): Promise<boolean> {
    if (!SENDBLUE_API_KEY_ID || !SENDBLUE_API_SECRET_KEY) {
      console.error("SendBlue credentials not configured");
      return false;
    }

    try {
      const response = await fetch(SENDBLUE_API_URL, {
        method: "POST",
        headers: {
          "sb-api-key-id": SENDBLUE_API_KEY_ID,
          "sb-api-secret-key": SENDBLUE_API_SECRET_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: SENDBLUE_RECIPIENT,
          content: message,
          from_number: SENDBLUE_FROM_NUMBER,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`SendBlue API error (${response.status}):`, errorText);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Failed to send notification:", error);
      return false;
    }
  }

  /**
   * Check usage and send notifications if needed
   */
  async function checkUsageAndNotify(): Promise<void> {
    const currentUsage = getClaudeUsage();
    if (currentUsage === null) {
      return; // Skip if we can't get usage
    }

    const state = loadState();
    const now = Date.now();

    // Initialize state if this is the first check
    if (!state) {
      saveState({
        lastUsedPercent: currentUsage,
        lastCheckTimestamp: now,
        notifiedAt90: currentUsage >= 90,
      });
      return;
    }

    // Detect reset: was >80%, now <20%
    if (state.lastUsedPercent > 80 && currentUsage < 20) {
      const message = `🔄 Claude API weekly usage has reset!\n\nPrevious: ${state.lastUsedPercent.toFixed(1)}%\nCurrent: ${currentUsage.toFixed(1)}%\n\nYou have a fresh weekly allowance.`;
      
      const sent = await sendNotification(message);
      if (sent) {
        console.log(`[Usage Notifier] Reset notification sent (${state.lastUsedPercent.toFixed(1)}% → ${currentUsage.toFixed(1)}%)`);
      }

      // Reset the 90% notification flag since we have a new week
      saveState({
        lastUsedPercent: currentUsage,
        lastCheckTimestamp: now,
        notifiedAt90: false,
      });
      return;
    }

    // Notify when hitting 90% (but only once per week)
    if (currentUsage >= 90 && !state.notifiedAt90) {
      const message = `⚠️ Claude API usage approaching limit!\n\nCurrent usage: ${currentUsage.toFixed(1)}%\n\nYou may experience rate limiting soon.`;
      
      const sent = await sendNotification(message);
      if (sent) {
        console.log(`[Usage Notifier] 90% threshold notification sent`);
      }

      saveState({
        lastUsedPercent: currentUsage,
        lastCheckTimestamp: now,
        notifiedAt90: true,
      });
      return;
    }

    // Update state with current usage
    saveState({
      lastUsedPercent: currentUsage,
      lastCheckTimestamp: now,
      notifiedAt90: state.notifiedAt90,
    });
  }

  /**
   * Start periodic usage monitoring
   */
  function startMonitoring(): void {
    // Stop any existing interval
    if (checkInterval) {
      clearInterval(checkInterval);
    }

    // Initial check
    checkUsageAndNotify().catch((error) => {
      console.error("[Usage Notifier] Initial check failed:", error);
    });

    // Set up periodic checks
    checkInterval = setInterval(() => {
      checkUsageAndNotify().catch((error) => {
        console.error("[Usage Notifier] Periodic check failed:", error);
      });
    }, CHECK_INTERVAL_MS);

    console.log("[Usage Notifier] Monitoring started (checks every 30 minutes)");
  }

  /**
   * Stop periodic monitoring
   */
  function stopMonitoring(): void {
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
      console.log("[Usage Notifier] Monitoring stopped");
    }
  }

  // Start monitoring when session starts
  pi.on("session_start", async (_event, ctx) => {
    startMonitoring();
    
    // Show current usage on startup
    const currentUsage = getClaudeUsage();
    if (currentUsage !== null) {
      ctx.ui.notify(
        `Usage monitor active. Current: ${currentUsage.toFixed(1)}%`,
        "info"
      );
    }
  });

  // Clean up on shutdown
  pi.on("session_shutdown", async (_event, _ctx) => {
    stopMonitoring();
  });

  // Add a command to manually check usage
  pi.registerCommand("usage-check", {
    description: "Check current CodexBar usage and notification status",
    handler: async (_args, ctx) => {
      const currentUsage = getClaudeUsage();
      const state = loadState();

      if (currentUsage === null) {
        ctx.ui.notify("Failed to get usage from CodexBar", "error");
        return;
      }

      const lines: string[] = [
        `Current weekly usage: ${currentUsage.toFixed(1)}%`,
      ];

      if (state) {
        lines.push(`Last check: ${new Date(state.lastCheckTimestamp).toLocaleString()}`);
        lines.push(`Previous usage: ${state.lastUsedPercent.toFixed(1)}%`);
        lines.push(`90% notification sent: ${state.notifiedAt90 ? "yes" : "no"}`);
      }

      ctx.ui.notify(lines.join("\n"), "info");
    },
  });

  // Add a command to manually test notification
  pi.registerCommand("usage-test-notify", {
    description: "Send a test notification via SendBlue",
    handler: async (_args, ctx) => {
      const currentUsage = getClaudeUsage();
      const message = `🧪 Test notification from Pi Usage Monitor\n\nCurrent usage: ${currentUsage !== null ? currentUsage.toFixed(1) + "%" : "unknown"}`;
      
      const sent = await sendNotification(message);
      if (sent) {
        ctx.ui.notify("Test notification sent successfully", "success");
      } else {
        ctx.ui.notify("Failed to send test notification", "error");
      }
    },
  });
}
