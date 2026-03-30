#!/usr/bin/env node

import { loadConfig, loadWatchState, saveWatchState } from "./config.js";
import { addReviewers, fetchPullRequest, listOpenReviewablePullRequests } from "./github.js";
import { parsePlanContext } from "./plan-context.js";
import { collapseLatestReviews, evaluateMergePolicy } from "./policy.js";
import { dispatchCloudReviews, resolveDispatchMode } from "./runner.js";

type Command = "check" | "dispatch" | "watch";

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const command = (args[0] ?? "check") as Command;
	const cwd = process.cwd();
	const options = parseFlags(args.slice(1));
	const config = loadConfig(cwd, options.configPath);
	const repo = options.repo ?? config.repo;
	if (!repo) throw new Error("Repository is required. Pass --repo or set repo in .pi/gbharg-pr-review-cloud.json");

	switch (command) {
		case "check":
			await runCheck(repo, options.pr ? Number(options.pr) : undefined, config.minimumApprovals ?? 3, cwd);
			return;
		case "dispatch":
			await runDispatch(repo, NumberRequired(options.pr, "--pr"), config, cwd);
			return;
		case "watch":
			await runWatch(repo, config, cwd);
			return;
		default:
			throw new Error(`Unknown command: ${command}`);
	}
}

async function runCheck(repo: string, prNumber: number | undefined, minimumApprovals: number, cwd: string): Promise<void> {
	const pr = await fetchPullRequest(NumberRequired(prNumber, "--pr"), repo, cwd);
	const planContext = parsePlanContext(pr.body);
	const latestReviews = collapseLatestReviews(pr.reviews ?? []);
	const result = evaluateMergePolicy({
		minimumApprovals,
		planContext,
		reviews: latestReviews,
	});

	if (!result.ok) {
		console.error(`BLOCK merge for PR #${pr.number}`);
		for (const reason of result.reasons) console.error(`- ${reason}`);
		process.exitCode = 1;
		return;
	}

	console.log(`ALLOW merge for PR #${pr.number} (${result.approvals} approvals)`);
}

async function runDispatch(repo: string, prNumber: number, config: ReturnType<typeof loadConfig>, cwd: string): Promise<void> {
	const pr = await fetchPullRequest(prNumber, repo, cwd);
	const planContext = parsePlanContext(pr.body);
	if (!planContext) throw new Error(`PR #${pr.number} is missing plan context`);

	if (config.requestReviewers === true && config.githubReviewers?.length) {
		const requestableReviewers = config.githubReviewers.filter((reviewer) => {
			const model = resolveModelForReviewer(reviewer, config);
			if (!model) return false;
			return resolveDispatchMode(model, config) === "command";
		});
		const existingActors = new Set([
			...(pr.reviewRequests ?? []).map((request) => request.login.toLowerCase()),
			...(pr.reviews ?? []).map((review) => review.reviewer.toLowerCase()),
		]);
		const missingReviewers = requestableReviewers.filter((reviewer) => !existingActors.has(reviewer.toLowerCase()));
		if (missingReviewers.length > 0) {
			await addReviewers(pr.number, repo, missingReviewers, cwd);
		}
	}

	const results = await dispatchCloudReviews(config, pr, repo, planContext, cwd);
	for (const result of results) {
		if (result.skipped) {
			console.log(`${result.model}: skipped${result.reason ? ` (${result.reason})` : ""}`);
			continue;
		}
		console.log(`${result.model}: exit ${result.exitCode}`);
	}
}

async function runWatch(repo: string, config: ReturnType<typeof loadConfig>, cwd: string): Promise<void> {
	const intervalMs = config.pollIntervalMs ?? 30_000;
	for (;;) {
		const state = loadWatchState();
		const prs = await listOpenReviewablePullRequests(repo, cwd);
		for (const pr of prs) {
			const previousHead = state.pullRequests[String(pr.number)];
			if (previousHead === pr.headRefOid) continue;
			await runDispatch(repo, pr.number, config, cwd);
			state.pullRequests[String(pr.number)] = pr.headRefOid;
			saveWatchState(state);
		}
		await new Promise((resolve) => setTimeout(resolve, intervalMs));
	}
}

function parseFlags(args: string[]): Record<string, string> {
	const flags: Record<string, string> = {};
	for (let i = 0; i < args.length; i += 1) {
		const current = args[i];
		if (!current.startsWith("--")) continue;
		const key = current.slice(2);
		const value = args[i + 1];
		if (!value || value.startsWith("--")) throw new Error(`Missing value for --${key}`);
		flags[key] = value;
		i += 1;
	}
	return flags;
}

function NumberRequired(value: string | number | undefined, name: string): number {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.length > 0) return Number(value);
	throw new Error(`${name} is required`);
}

function resolveModelForReviewer(
	reviewer: string,
	config: ReturnType<typeof loadConfig>,
): "codex" | "claude" | "gemini" | undefined {
	const normalized = reviewer.toLowerCase();
	for (const model of ["codex", "claude", "gemini"] as const) {
		const handles = config.reviewerHandles?.[model] ?? [];
		if (handles.some((handle) => handle.toLowerCase() === normalized)) return model;
	}
	for (const model of ["codex", "claude", "gemini"] as const) {
		if (normalized.includes(model)) return model;
	}
	return undefined;
}

void main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});
