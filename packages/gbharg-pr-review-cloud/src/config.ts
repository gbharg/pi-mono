import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { ReviewCloudConfig, WatchState } from "./types.js";

export const DEFAULT_CONFIG_PATH = ".pi/gbharg-pr-review-cloud.json";
export const DEFAULT_STATE_PATH = join(homedir(), ".pi", "gbharg-pr-review-cloud-state.json");

export function loadConfig(cwd: string, explicitPath?: string): ReviewCloudConfig {
	const path = explicitPath ?? process.env.PI_PR_REVIEW_CLOUD_CONFIG ?? join(cwd, DEFAULT_CONFIG_PATH);
	const raw = readFileSync(path, "utf-8");
	const parsed = JSON.parse(raw) as ReviewCloudConfig;
	parsed.commands ??= {};
	parsed.dispatchModes ??= {};
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
