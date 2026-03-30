import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import type { PlanContext, PullRequestMetadata, ReviewCloudConfig, RunnerCommandTemplate, UsageCheckResult } from "./types.js";
import { execFileText, spawnAndWait } from "./process.js";

const MODELS = ["codex", "claude", "gemini"] as const;
type ModelName = (typeof MODELS)[number];
const HOME_LOCAL_BIN = join(process.env.HOME ?? "", ".local", "bin");
const DEFAULT_USAGE_COMMANDS: Record<ModelName, RunnerCommandTemplate> = {
	codex: {
		command: "codexbar",
		args: ["usage", "--provider", "codex", "--source", "cli", "--format", "json"],
	},
	claude: {
		command: "codexbar",
		args: ["usage", "--provider", "claude", "--source", "cli", "--format", "json"],
	},
	gemini: {
		command: "codexbar",
		args: ["usage", "--provider", "gemini", "--source", "cli", "--format", "json"],
	},
};

export interface DispatchSummary {
	model: ModelName;
	exitCode: number;
	skipped?: boolean;
	reason?: string;
	usagePercent?: number | null;
}

export function interpolateRunnerArgs(
	template: RunnerCommandTemplate,
	pr: PullRequestMetadata,
	planContextFile: string,
	repo: string,
): { command: string; args: string[]; env: NodeJS.ProcessEnv } {
	const replace = (value: string): string =>
		value
			.replaceAll("{repo}", repo)
			.replaceAll("{pr}", String(pr.number))
			.replaceAll("{url}", pr.url)
			.replaceAll("{title}", pr.title)
			.replaceAll("{headRef}", pr.headRefName)
			.replaceAll("{headSha}", pr.headRefOid)
			.replaceAll("{planContextFile}", planContextFile);

	return {
		command: replace(template.command),
		args: (template.args ?? []).map(replace),
		env: Object.fromEntries(Object.entries(template.env ?? {}).map(([key, value]) => [key, replace(value)])),
	};
}

export async function dispatchCloudReviews(
	config: ReviewCloudConfig,
	pr: PullRequestMetadata,
	repo: string,
	planContext: PlanContext,
	cwd?: string,
): Promise<DispatchSummary[]> {
	const tmpDir = mkdtempSync(join(tmpdir(), "pi-pr-review-"));
	const planContextFile = join(tmpDir, "plan-context.json");
	writeFileSync(planContextFile, `${JSON.stringify(planContext, null, 2)}\n`, "utf-8");

	try {
		const summaries: DispatchSummary[] = [];
		for (const model of MODELS) {
			const template = config.commands[model];
			if (!template) continue;
			const duplicateReason = findDuplicateReviewReason(model, config, pr);
			if (duplicateReason) {
				summaries.push({
					model,
					exitCode: 0,
					skipped: true,
					reason: duplicateReason,
					usagePercent: null,
				});
				continue;
			}
			const usageCheck = await checkUsageLimit(model, config, pr, repo, planContextFile, cwd);
			if (usageCheck.skipped) {
				summaries.push({
					model,
					exitCode: 0,
					skipped: true,
					reason: usageCheck.reason,
					usagePercent: usageCheck.usagePercent,
				});
				continue;
			}
			const command = interpolateRunnerArgs(template, pr, planContextFile, repo);
			const exitCode = await spawnAndWait(
				command.command,
				command.args,
				cwd,
				{
					...process.env,
					...command.env,
				},
			);
			summaries.push({ model, exitCode, usagePercent: usageCheck.usagePercent });
		}
		return summaries;
	} finally {
		rmSync(tmpDir, { recursive: true, force: true });
	}
}

async function checkUsageLimit(
	model: ModelName,
	config: ReviewCloudConfig,
	pr: PullRequestMetadata,
	repo: string,
	planContextFile: string,
	cwd?: string,
): Promise<UsageCheckResult> {
	const limit = config.maxUsagePercent ?? 90;
	const template = config.usageCommands?.[model] ?? DEFAULT_USAGE_COMMANDS[model];

	const command = interpolateRunnerArgs(template, pr, planContextFile, repo);
	const env = buildUsageCheckEnv(command, {
		...process.env,
		...command.env,
	});
	const result = await execFileText(
		command.command,
		command.args,
		cwd,
		env,
	);
	if (result.code !== 0) {
		return {
			model,
			usagePercent: null,
			skipped: true,
			reason: `usage check failed for ${model}: ${result.stderr.trim() || `exit ${result.code}`}`,
		};
	}

	const usagePercent = parseUsagePercent(result.stdout);
	if (usagePercent === null) {
		return {
			model,
			usagePercent: null,
			skipped: true,
			reason: `usage check for ${model} did not return a numeric percent`,
		};
	}

	if (usagePercent >= limit) {
		return {
			model,
			usagePercent,
			skipped: true,
			reason: `${model} usage at ${usagePercent}% reached the ${limit}% stop limit`,
		};
	}

	return { model, usagePercent, skipped: false };
}

export function parseUsagePercent(stdout: string): number | null {
	const jsonPercent = parseCodexBarUsagePercent(stdout);
	if (jsonPercent !== null) return jsonPercent;
	if (containsJsonPayload(stdout)) return null;

	const trimmed = stdout.trim();
	const numeric = trimmed.match(/(\d+(?:\.\d+)?)/);
	if (!numeric) return null;
	const value = Number(numeric[1]);
	if (!Number.isFinite(value)) return null;
	return value;
}

export function findDuplicateReviewReason(
	model: ModelName,
	config: ReviewCloudConfig,
	pr: Pick<PullRequestMetadata, "headRefOid" | "reviews" | "reviewRequests">,
): string | null {
	const identities = resolveReviewerIdentities(model, config);
	if (identities.length === 0) return null;

	const requested = new Set((pr.reviewRequests ?? []).map((request) => request.login.toLowerCase()));
	for (const identity of identities) {
		if (requested.has(identity)) {
			return `${identity} is already requested on this PR`;
		}
	}

	for (const review of pr.reviews ?? []) {
		if (!review.commitOid || review.commitOid !== pr.headRefOid) continue;
		if (identities.includes(review.reviewer.toLowerCase())) {
			return `${review.reviewer} already reviewed commit ${pr.headRefOid.slice(0, 7)}`;
		}
	}

	return null;
}

function resolveReviewerIdentities(model: ModelName, config: ReviewCloudConfig): string[] {
	const explicit = config.reviewerHandles?.[model] ?? [];
	if (explicit.length > 0) {
		return explicit.map((identity) => identity.toLowerCase());
	}

	return (config.githubReviewers ?? [])
		.filter((reviewer) => reviewer.toLowerCase().includes(model))
		.map((reviewer) => reviewer.toLowerCase());
}

function buildUsageCheckEnv(
	command: { command: string; args: string[]; env: NodeJS.ProcessEnv },
	env: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
	if (command.command !== "codexbar") return env;
	return {
		...env,
		PATH: removePathSegment(env.PATH, HOME_LOCAL_BIN),
	};
}

function removePathSegment(pathValue: string | undefined, segment: string): string | undefined {
	if (!pathValue) return pathValue;
	const normalizedSegment = segment.replace(/\/+$/, "");
	return pathValue
		.split(delimiter)
		.filter((entry) => entry.replace(/\/+$/, "") !== normalizedSegment)
		.join(delimiter);
}

function parseCodexBarUsagePercent(stdout: string): number | null {
	for (const line of stdout.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) continue;
		try {
			const parsed = JSON.parse(trimmed) as unknown;
			const usagePercent = extractUsagePercent(parsed);
			if (usagePercent !== null) return usagePercent;
		} catch {
			// Ignore non-JSON lines from the CLI and continue scanning.
		}
	}
	return null;
}

function containsJsonPayload(stdout: string): boolean {
	return stdout
		.split(/\r?\n/)
		.some((line) => {
			const trimmed = line.trim();
			return trimmed.startsWith("{") || trimmed.startsWith("[");
		});
}

function extractUsagePercent(value: unknown): number | null {
	if (!value) return null;
	if (Array.isArray(value)) {
		for (const entry of value) {
			const usagePercent = extractUsagePercent(entry);
			if (usagePercent !== null) return usagePercent;
		}
		return null;
	}
	if (typeof value !== "object") return null;

	const record = value as Record<string, unknown>;
	const usage = asRecord(record.usage);
	if (usage) {
		const windows = [asRecord(usage.primary), asRecord(usage.secondary)];
		const percents = windows
			.flatMap((window) => (window ? [readPercent(window)] : []))
			.filter((percent): percent is number => percent !== null);
		if (percents.length > 0) return Math.max(...percents);
	}

	return readPercent(record);
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readPercent(value: Record<string, unknown>): number | null {
	const candidates = [
		value.usedPercent,
		value.used_percent,
		value.usagePercent,
		value.percent,
	];
	for (const candidate of candidates) {
		const parsed = parsePercentValue(candidate);
		if (parsed !== null) return parsed;
	}
	return null;
}

function parsePercentValue(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string") {
		const trimmed = value.trim().replace(/%$/, "");
		if (trimmed.length === 0) return null;
		const parsed = Number(trimmed);
		if (Number.isFinite(parsed)) return parsed;
	}
	return null;
}
