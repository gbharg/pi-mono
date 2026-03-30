import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { ReviewCloudConfig, WatchState } from "./types.js";

export const DEFAULT_CONFIG_PATH = ".pi/gbharg-pr-review-cloud.json";
export const DEFAULT_STATE_PATH = join(homedir(), ".pi", "gbharg-pr-review-cloud-state.json");

export function loadConfig(cwd: string, explicitPath?: string): ReviewCloudConfig {
	const path = explicitPath ?? process.env.PI_PR_REVIEW_CLOUD_CONFIG ?? join(cwd, DEFAULT_CONFIG_PATH);
	const raw = readFileSync(path, "utf-8");
	const parsed = JSON.parse(raw) as unknown;
	assertReviewCloudConfig(parsed);
	parsed.commands ??= {};
	parsed.dispatchModes ??= {};
	parsed.ignorePathPrefixes ??= ["docs/", "plan/"];
	parsed.nonCodeExtensions ??= [".md", ".mdx", ".txt", ".rst", ".adoc", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf"];
	const hasCommands = Object.keys(parsed.commands).length > 0;
	const hasReviewerConfig = Boolean(parsed.githubReviewers?.length || Object.keys(parsed.reviewerHandles ?? {}).length > 0);
	if (!hasCommands && !hasReviewerConfig) {
		throw new Error("Review cloud config must define reviewer identities and/or reviewer commands");
	}
	return parsed;
}

export function loadWatchState(path = DEFAULT_STATE_PATH): WatchState {
	if (!existsSync(path)) return { pullRequests: {} };
	return JSON.parse(readFileSync(path, "utf-8")) as WatchState;
}

export function saveWatchState(state: WatchState, path = DEFAULT_STATE_PATH): void {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`, "utf-8");
}

function assertReviewCloudConfig(value: unknown): asserts value is ReviewCloudConfig {
	if (!isRecord(value)) throw new Error("Review cloud config must be a JSON object");

	assertOptionalFiniteNumber(value.minimumApprovals, "minimumApprovals");
	assertOptionalFiniteNumber(value.maxUsagePercent, "maxUsagePercent");
	assertOptionalFiniteNumber(value.pollIntervalMs, "pollIntervalMs");
	assertOptionalBoolean(value.requestReviewers, "requestReviewers");
	assertOptionalStringArray(value.githubReviewers, "githubReviewers");
	assertOptionalStringArray(value.ignorePathPrefixes, "ignorePathPrefixes");
	assertOptionalStringArray(value.nonCodeExtensions, "nonCodeExtensions");

	if (value.reviewerHandles !== undefined) {
		assertStringArrayRecord(value.reviewerHandles, "reviewerHandles");
	}
	if (value.dispatchModes !== undefined) {
		assertDispatchModes(value.dispatchModes);
	}
	if (value.commands !== undefined) {
		assertCommandRecord(value.commands, "commands");
	}
	if (value.usageCommands !== undefined) {
		assertCommandRecord(value.usageCommands, "usageCommands");
	}
}

function assertOptionalFiniteNumber(value: unknown, name: string): void {
	if (value === undefined) return;
	if (typeof value !== "number" || !Number.isFinite(value)) {
		throw new Error(`${name} must be a finite number`);
	}
}

function assertOptionalBoolean(value: unknown, name: string): void {
	if (value === undefined) return;
	if (typeof value !== "boolean") throw new Error(`${name} must be a boolean`);
}

function assertOptionalStringArray(value: unknown, name: string): void {
	if (value === undefined) return;
	if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
		throw new Error(`${name} must be an array of strings`);
	}
}

function assertStringArrayRecord(value: unknown, name: string): void {
	if (!isRecord(value)) throw new Error(`${name} must be an object of string arrays`);
	for (const [key, entries] of Object.entries(value)) {
		if (!Array.isArray(entries) || entries.some((entry) => typeof entry !== "string")) {
			throw new Error(`${name}.${key} must be an array of strings`);
		}
	}
}

function assertDispatchModes(value: unknown): void {
	if (!isRecord(value)) throw new Error("dispatchModes must be an object");
	for (const [key, mode] of Object.entries(value)) {
		if (mode !== "command" && mode !== "external" && mode !== "disabled") {
			throw new Error(`dispatchModes.${key} must be command, external, or disabled`);
		}
	}
}

function assertCommandRecord(value: unknown, name: string): void {
	if (!isRecord(value)) throw new Error(`${name} must be an object`);
	for (const [key, template] of Object.entries(value)) {
		if (!isRecord(template) || typeof template.command !== "string") {
			throw new Error(`${name}.${key}.command must be a string`);
		}
		if (template.args !== undefined && (!Array.isArray(template.args) || template.args.some((arg) => typeof arg !== "string"))) {
			throw new Error(`${name}.${key}.args must be an array of strings`);
		}
		if (template.env !== undefined && !isStringRecord(template.env)) {
			throw new Error(`${name}.${key}.env must be an object of strings`);
		}
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isStringRecord(value: unknown): value is Record<string, string> {
	return isRecord(value) && Object.values(value).every((entry) => typeof entry === "string");
}
