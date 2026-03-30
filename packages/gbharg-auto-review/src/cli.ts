#!/usr/bin/env node

import { loadConfig, loadWatchState, saveWatchState } from "./config.js";
import { addReviewers, fetchPullRequest, getCurrentPrNumber, listOpenReviewablePullRequests } from "./github.js";
import { parsePlanContext } from "./plan-context.js";
import { collapseLatestReviews, evaluateMergePolicy } from "./policy.js";
import { dispatchCloudReviews, resolveDispatchMode } from "./runner.js";
import { evaluateReviewScope } from "./scope.js";

type Command = "check" | "dispatch" | "watch";

async function main(): Promise<void> {
	const { command, flagArgs } = parseCommandArgs(process.argv.slice(2));
	const cwd = process.cwd();
	const options = parseFlags(flagArgs);
	const config = loadConfig(cwd, options.configPath);
	const repo = options.repo ?? config.repo;
	if (!repo) throw new Error("Repository is required. Pass --repo or set repo in .pi/auto-review.json");

	switch (command) {
		case "check":
			await runCheck(repo, options.pr ? parseRequiredInteger(options.pr, "--pr") : undefined, config, cwd);
			return;
		case "dispatch":
			await runDispatch(repo, parseRequiredInteger(options.pr, "--pr"), config, cwd);
			return;
		case "watch":
			await runWatch(repo, config, cwd);
			return;
		default:
			throw new Error(`Unknown command: ${command}`);
	}
}

async function runCheck(repo: string, prNumber: number | undefined, config: ReturnType<typeof loadConfig>, cwd: string): Promise<void> {
	const resolvedPrNumber = prNumber ?? (await getCurrentPrNumber(cwd, repo));
	const pr = await fetchPullRequest(resolvedPrNumber, repo, cwd);
	const scope = evaluateReviewScope(pr, config);
	if (scope.ignored) {
		console.log(`ALLOW merge for PR #${pr.number} (review automation ignored: ${scope.reason})`);
		return;
	}
	const planContext = parsePlanContext(pr.body);
	const latestReviews = collapseLatestReviews(pr.reviews ?? []);
	const result = evaluateMergePolicy({
		minimumApprovals: config.minimumApprovals ?? 3,
		planContext,
		reviews: latestReviews,
		statusChecks: pr.statusChecks,
		deployCheckPatterns: config.deployCheckPatterns,
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
	const scope = evaluateReviewScope(pr, config);
	if (scope.ignored) {
		console.log(`skip dispatch for PR #${pr.number}: ${scope.reason}`);
		return;
	}
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
		let prs;
		try {
			prs = await listOpenReviewablePullRequests(repo, cwd);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error(`watch: failed to list PRs: ${message}`);
			await new Promise((resolve) => setTimeout(resolve, intervalMs));
			continue;
		}
		const activePrNumbers = new Set(prs.map((pr) => String(pr.number)));
		const nextSeenHeads = Object.fromEntries(
			Object.entries(state.pullRequests).filter(([prNumber]) => activePrNumbers.has(prNumber)),
		);
		let changed = Object.keys(nextSeenHeads).length !== Object.keys(state.pullRequests).length;
		state.pullRequests = nextSeenHeads;
		for (const pr of prs) {
			const previousHead = state.pullRequests[String(pr.number)];
			if (previousHead === pr.headRefOid) continue;
			try {
				await runDispatch(repo, pr.number, config, cwd);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(`watch: failed to dispatch PR #${pr.number}: ${message}`);
				// Mark the failing head as seen so one malformed PR body does not trigger endless re-review attempts.
				state.pullRequests[String(pr.number)] = pr.headRefOid;
				changed = true;
				continue;
			}
			state.pullRequests[String(pr.number)] = pr.headRefOid;
			changed = true;
		}
		if (changed) saveWatchState(state);
		await new Promise((resolve) => setTimeout(resolve, intervalMs));
	}
}

function parseCommandArgs(args: string[]): { command: Command; flagArgs: string[] } {
	const first = args[0];
	if (!first || first.startsWith("--")) {
		return {
			command: "check",
			flagArgs: args,
		};
	}
	if (!isCommand(first)) {
		throw new Error(`Unknown command: ${first}`);
	}
	return {
		command: first,
		flagArgs: args.slice(1),
	};
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

function parseRequiredInteger(value: string | number | undefined, name: string): number {
	if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
	if (typeof value === "string" && value.length > 0) {
		const parsed = Number(value);
		if (Number.isInteger(parsed) && parsed > 0) return parsed;
		throw new Error(`${name} must be a positive integer`);
	}
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

function isCommand(value: string): value is Command {
	return value === "check" || value === "dispatch" || value === "watch";
}

void main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});
