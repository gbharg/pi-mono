import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { loadConfig } from "./config.js";
import { fetchPullRequest, getCurrentPrNumber } from "./github.js";
import { parsePlanContext } from "./plan-context.js";
import { collapseLatestReviews, evaluateMergePolicy } from "./policy.js";
import { inferGitHubRepo } from "./repo.js";
import { dispatchCloudReviews } from "./runner.js";
import { evaluateReviewScope } from "./scope.js";

const ArgsSchema = Type.Object({
	pr: Type.Optional(Type.Number({ description: "Pull request number" })),
	repo: Type.Optional(Type.String({ description: "Repository in owner/repo format" })),
});

export default function registerAutoReviewExtension(pi: ExtensionAPI) {
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
			let config;
			try {
				config = loadConfig(ctx.cwd);
			} catch (error) {
				ctx.ui.notify(formatConfigError(error), "error");
				return;
			}
			const evaluation = await evaluatePr(repo, pr, config.minimumApprovals ?? 3, config, ctx.cwd);
			if (evaluation.scope.ignored) {
				ctx.ui.notify(`Merge allowed: review automation ignored this PR (${evaluation.scope.reason})`, "info");
				return;
			}
			const summary = evaluation.policy.ok
				? `Merge allowed: ${evaluation.policy.approvals} approvals`
				: `Merge blocked: ${evaluation.policy.reasons.join("; ")}`;
			ctx.ui.notify(summary, evaluation.policy.ok ? "info" : "error");
		},
	});

	pi.registerCommand("dispatch-auto-review", {
		description: "Dispatch auto-review jobs for the current PR",
		handler: async (args, ctx) => {
			const parsed = parseArgs(args);
			const repo = parsed.repo ?? (await inferGitHubRepo(ctx.cwd));
			if (!repo) {
				ctx.ui.notify("Repository not found. Pass --repo owner/repo.", "error");
				return;
			}
			const prNumber = parsed.pr ?? (await getCurrentPrNumber(ctx.cwd, repo));
			let config;
			try {
				config = loadConfig(ctx.cwd);
			} catch (error) {
				ctx.ui.notify(formatConfigError(error), "error");
				return;
			}
			const pr = await fetchPullRequest(prNumber, repo, ctx.cwd);
			const scope = evaluateReviewScope(pr, config);
			if (scope.ignored) {
				ctx.ui.notify(`Skipped PR #${prNumber}: ${scope.reason}`, "info");
				return;
			}
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
		name: "auto_review_status",
		label: "Auto Review Status",
		description: "Return the current local merge-gate status for a pull request",
		parameters: ArgsSchema,
		execute: async (_toolCallId, params, _signal, _onUpdate, ctx) => {
			const repo = params.repo ?? (await inferGitHubRepo(ctx.cwd));
			if (!repo) throw new Error("Repository not found. Pass repo explicitly.");
			const pr = params.pr ?? (await getCurrentPrNumber(ctx.cwd, repo));
			const config = loadConfig(ctx.cwd);
			const evaluation = await evaluatePr(repo, pr, config.minimumApprovals ?? 3, config, ctx.cwd);
			return {
				content: [
					{
						type: "text",
						text: evaluation.scope.ignored
							? `ALLOW merge for PR #${pr} (review automation ignored: ${evaluation.scope.reason})`
							: evaluation.policy.ok
								? `ALLOW merge for PR #${pr} (${evaluation.policy.approvals} approvals)`
								: `BLOCK merge for PR #${pr}: ${evaluation.policy.reasons.join("; ")}`,
					},
				],
				details: evaluation,
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
		let config;
		try {
			config = loadConfig(ctx.cwd);
		} catch (error) {
			return {
				block: true,
				reason: formatConfigError(error),
			};
		}
		const evaluation = await evaluatePr(repo, pr, config.minimumApprovals ?? 3, config, ctx.cwd);
		if (evaluation.scope.ignored || evaluation.policy.ok) return;
		if (!evaluation.policy.ok) {
			return {
				block: true,
				reason: `Local merge gate blocked PR #${pr}: ${evaluation.policy.reasons.join("; ")}`,
			};
		}
	});
}

function parseArgs(raw: string): { pr?: number; repo?: string } {
	const parts = raw.split(/\s+/).filter(Boolean);
	const parsed: { pr?: number; repo?: string } = {};
	for (let i = 0; i < parts.length; i += 1) {
		if (parts[i] === "--pr" && parts[i + 1]) {
			parsed.pr = parsePositiveInteger(parts[i + 1], "--pr");
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

async function evaluatePr(
	repo: string,
	prNumber: number,
	minimumApprovals: number,
	config: ReturnType<typeof loadConfig>,
	cwd: string,
) {
	const pr = await fetchPullRequest(prNumber, repo, cwd);
	const scope = evaluateReviewScope(pr, config);
	if (scope.ignored) {
		return {
			scope,
			policy: evaluateMergePolicy({
				minimumApprovals,
				planContext: null,
				reviews: [],
				statusChecks: pr.statusChecks,
				deployCheckPatterns: config.deployCheckPatterns,
			}),
		};
	}
	return {
		scope,
		policy: evaluateMergePolicy({
			minimumApprovals,
			planContext: parsePlanContext(pr.body),
			reviews: collapseLatestReviews(pr.reviews ?? []),
			statusChecks: pr.statusChecks,
			deployCheckPatterns: config.deployCheckPatterns,
		}),
	};
}

function parsePositiveInteger(value: string, name: string): number {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new Error(`${name} must be a positive integer`);
	}
	return parsed;
}

function formatConfigError(error: unknown): string {
	const message = error instanceof Error ? error.message : String(error);
	return `Could not load auto-review config: ${message}`;
}
