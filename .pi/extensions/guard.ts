/**
 * Guard Extension — Block execution tools from the Pi orchestrator session.
 *
 * Pi's role is orchestration: plan, scope, delegate via subagent, and
 * communicate via iMessage. It should NOT directly execute bash commands,
 * edit files, or write files. Those actions belong to sub-agents.
 *
 * Blocked tools: bash, edit, write
 * Allowed: read, grep, find, ls, subagent, imessage_reply, imessage_react,
 *          imessage_history, and any other non-execution tools.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const BLOCKED_TOOLS = new Set(["bash", "edit", "write"]);

export default function (pi: ExtensionAPI) {
	pi.on("tool_call", async (event) => {
		if (BLOCKED_TOOLS.has(event.toolName)) {
			return {
				block: true,
				reason: `Tool "${event.toolName}" is blocked in the orchestrator session. Delegate execution work to a sub-agent instead.`,
			};
		}
	});
}
