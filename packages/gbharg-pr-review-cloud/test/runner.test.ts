import { describe, expect, it } from "vitest";
import { findDuplicateReviewReason, interpolateRunnerArgs, parseUsagePercent } from "../src/runner.js";
import type { PullRequestMetadata, ReviewCloudConfig, RunnerCommandTemplate } from "../src/types.js";

const pr: PullRequestMetadata = {
	number: 42,
	title: "feat: add cloud review",
	url: "https://github.com/acme/repo/pull/42",
	body: "body",
	headRefName: "feat/cloud-review",
	headRefOid: "abc123",
};

describe("runner interpolation", () => {
	it("replaces placeholders in commands, args, and env", () => {
		const template: RunnerCommandTemplate = {
			command: "ssh",
			args: ["runner", "codex", "--pr", "{pr}", "--repo", "{repo}", "--plan", "{planContextFile}"],
			env: {
				PR_URL: "{url}",
				PR_SHA: "{headSha}",
			},
		};
		const result = interpolateRunnerArgs(template, pr, "/tmp/plan.json", "acme/repo");
		expect(result.command).toBe("ssh");
		expect(result.args).toEqual(["runner", "codex", "--pr", "42", "--repo", "acme/repo", "--plan", "/tmp/plan.json"]);
		expect(result.env.PR_URL).toBe("https://github.com/acme/repo/pull/42");
		expect(result.env.PR_SHA).toBe("abc123");
	});

	it("parses numeric quota output", () => {
		expect(parseUsagePercent("89")).toBe(89);
		expect(parseUsagePercent("usage=90.5%")).toBe(90.5);
		expect(parseUsagePercent("no data")).toBeNull();
	});

	it("parses codexbar usage json and prefers the highest window percent", () => {
		const stdout = JSON.stringify([
			{
				provider: "codex",
				usage: {
					primary: { usedPercent: 42.2 },
					secondary: { usedPercent: 91.4 },
				},
			},
		]);
		expect(parseUsagePercent(stdout)).toBe(91.4);
	});

	it("returns null for codexbar error payloads", () => {
		const stdout = JSON.stringify([
			{
				error: {
					message: "Could not find Gemini CLI OAuth configuration",
					code: 1,
				},
				provider: "gemini",
			},
		]);
		expect(parseUsagePercent(stdout)).toBeNull();
	});
});

describe("runner de-duplication", () => {
	const config: ReviewCloudConfig = {
		githubReviewers: ["gautam-codex", "gautam-claude", "gautam-gemini"],
		reviewerHandles: {
			codex: ["gautam-codex"],
			claude: ["gautam-claude"],
			gemini: ["gautam-gemini"],
		},
		commands: {},
	};

	it("skips a model when its reviewer already reviewed the current head", () => {
		const reason = findDuplicateReviewReason("gemini", config, {
			headRefOid: "abc123",
			reviews: [
				{
					reviewer: "gautam-gemini",
					state: "COMMENTED",
					commitOid: "abc123",
				},
			],
			reviewRequests: [],
		});
		expect(reason).toContain("already reviewed commit");
	});

	it("skips a model when its reviewer is already requested on the pr", () => {
		const reason = findDuplicateReviewReason("claude", config, {
			headRefOid: "abc123",
			reviews: [],
			reviewRequests: [{ login: "gautam-claude" }],
		});
		expect(reason).toBe("gautam-claude is already requested on this PR");
	});

	it("does not skip when the review is on an older commit", () => {
		const reason = findDuplicateReviewReason("codex", config, {
			headRefOid: "newsha",
			reviews: [
				{
					reviewer: "gautam-codex",
					state: "APPROVED",
					commitOid: "oldsha",
				},
			],
			reviewRequests: [],
		});
		expect(reason).toBeNull();
	});

	it("treats external reviewers as non-command-managed in config", async () => {
		const externalOnlyConfig: ReviewCloudConfig = {
			reviewerHandles: {
				codex: ["gautam-codex"],
			},
			dispatchModes: {
				codex: "external",
			},
		};
		expect(
			findDuplicateReviewReason("codex", externalOnlyConfig, {
				headRefOid: "sha",
				reviews: [],
				reviewRequests: [],
			}),
		).toBeNull();
	});
});
