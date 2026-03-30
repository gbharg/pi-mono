import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { loadConfig } from "./config.js";
import { fetchPullRequest, getCurrentPrNumber } from "./github.js";
import { parsePlanContext } from "./plan-context.js";
import { collapseLatestReviews, evaluateMergePolicy } from "./policy.js";
import { inferGitHubRepo } from "./repo.js";
import { dispatchCloudReviews } from "./runner.js";

const ArgsSchema = Type.Object({
	pr: Type.Optional(Type.Number({ description: "Pull request number" })),
	repo: Type.Optional(Type.String({ description: "Repository in owner/repo format" })),
});

export default function registerPrReviewCloudExtension(pi: ExtensionAPI) {
	pi.registerCommand("merge-gate", {
		description: "Check whether the current PR satisfies the local merge policy",
		handler: async (args, ctx) => {
			const parsed = parseArgs(args);
			const repo = parsed.repo ?? (await inferGitHubRepo(ctx.cwd));
			if (!repo) {
				ctx.ui.notify("Repository not found. Pass --repo owner/repo.", "error");
				return;
			}
			const pr = parsed.pr ?? (await getCurrentPrNumber(ctx.cwd, repo));
			const config = loadConfig(ctx.cwd);
			const result = await evaluatePr(repo, pr, config.minimumApprovals ?? 3, ctx.cwd);
			const summary = result.ok
				? `Merge allowed: ${result.approvals} approvals`
				: `Merge blocked: ${result.reasons.join("; ")}`;
			ctx.ui.notify(summary, result.ok ? "info" : "error");
		},
	});

	pi.registerCommand("dispatch-pr-review", {
		description: "Dispatch cloud PR reviews for the current PR",
		handler: async (args, ctx) => {
			const parsed = parseArgs(args);
			const repo = parsed.repo ?? (await inferGitHubRepo(ctx.cwd));
			if (!repo) {
				ctx.ui.notify("Repository not found. Pass --repo owner/repo.", "error");
				return;
			}
			const prNumber = parsed.pr ?? (await getCurrentPrNumber(ctx.cwd, repo));
			const config = loadConfig(ctx.cwd);
			const pr = await fetchPullRequest(prNumber, repo, ctx.cwd);
			const planContext = parsePlanContext(pr.body);
			if (!planContext) {
				ctx.ui.notify(`PR #${prNumber} is missing plan context`, "error");
				return;
			}
			const results = await dispatchCloudReviews(config, pr, repo, planContext, ctx.cwd);
			const stopped = results.filter((result) => result.skipped);
			ctx.ui.notify(
				results.length > 0
					? stopped.length > 0
						? `Dispatched ${results.length - stopped.length}/${results.length} review jobs for PR #${prNumber}; stopped ${stopped.length} at usage limit`
						: `Dispatched ${results.length} review jobs for PR #${prNumber}`
					: `No review commands configured for PR #${prNumber}`,
				"info",
			);
		},
	});

	pi.registerTool({
		name: "review_policy_status",
		label: "Review Policy Status",
		description: "Return the current local merge-gate status for a pull request",
		parameters: ArgsSchema,
		execute: async (_toolCallId, params, _signal, _onUpdate, ctx) => {
			const repo = params.repo ?? (await inferGitHubRepo(ctx.cwd));
			if (!repo) throw new Error("Repository not found. Pass repo explicitly.");
			const pr = params.pr ?? (await getCurrentPrNumber(ctx.cwd, repo));
			const config = loadConfig(ctx.cwd);
			const result = await evaluatePr(repo, pr, config.minimumApprovals ?? 3, ctx.cwd);
			return {
				content: [
					{
						type: "text",
						text: result.ok
							? `ALLOW merge for PR #${pr} (${result.approvals} approvals)`
							: `BLOCK merge for PR #${pr}: ${result.reasons.join("; ")}`,
					},
				],
				details: result,
			};
		},
	});

	pi.on("tool_call", async (event, ctx) => {
		if (event.toolName !== "bash" || typeof event.input.command !== "string") return;
		if (!/\bgh\s+pr\s+merge\b/.test(event.input.command)) return;

		const repo = await inferGitHubRepo(ctx.cwd);
		if (!repo) return { block: true, reason: "Cannot infer owner/repo for gh pr merge." };

		const prMatch = event.input.command.match(/\bgh\s+pr\s+merge\s+(\d+)\b/);
		const pr = prMatch ? Number(prMatch[1]) : await getCurrentPrNumber(ctx.cwd, repo);
		const config = loadConfig(ctx.cwd);
		const result = await evaluatePr(repo, pr, config.minimumApprovals ?? 3, ctx.cwd);
		if (!result.ok) {
			return {
				block: true,
				reason: `Local merge gate blocked PR #${pr}: ${result.reasons.join("; ")}`,
			};
		}
	});
}

function parseArgs(raw: string): { pr?: number; repo?: string } {
	const parts = raw.split(/\s+/).filter(Boolean);
	const parsed: { pr?: number; repo?: string } = {};
	for (let i = 0; i < parts.length; i += 1) {
		if (parts[i] === "--pr" && parts[i + 1]) {
			parsed.pr = Number(parts[i + 1]);
			i += 1;
			continue;
		}
		if (parts[i] === "--repo" && parts[i + 1]) {
			parsed.repo = parts[i + 1];
			i += 1;
		}
	}
	return parsed;
}

async function evaluatePr(repo: string, prNumber: number, minimumApprovals: number, cwd: string) {
	const pr = await fetchPullRequest(prNumber, repo, cwd);
	return evaluateMergePolicy({
		minimumApprovals,
		planContext: parsePlanContext(pr.body),
		reviews: collapseLatestReviews(pr.reviews ?? []),
	});
}
