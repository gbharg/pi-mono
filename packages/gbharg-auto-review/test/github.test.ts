import { describe, expect, it } from "vitest";
import { normalizePullRequestFiles, normalizeReviewRequests, normalizeStatusChecks } from "../src/github.js";

describe("github normalization", () => {
	it("normalizes review requests across gh payload shapes", () => {
		expect(
			normalizeReviewRequests([
				{ login: "flat-login" },
				{ slug: "flat-slug" },
				{ requestedReviewer: { login: "nested-login" } },
				{ requestedReviewer: { slug: "nested-slug" } },
				{},
			]),
		).toEqual([
			{ login: "flat-login" },
			{ login: "flat-slug" },
			{ login: "nested-login" },
			{ login: "nested-slug" },
		]);
	});

	it("normalizes file paths and drops empty entries", () => {
		expect(normalizePullRequestFiles([{ path: "docs/guide.md" }, {}, { path: "src/index.ts" }])).toEqual([
			{ path: "docs/guide.md" },
			{ path: "src/index.ts" },
		]);
	});

	it("normalizes status contexts and check runs", () => {
		expect(
			normalizeStatusChecks([
				{ context: "Deploy Preview", state: "EXPECTED" },
				{ context: "Vercel Preview", state: "SUCCESS" },
				{ name: "deploy", workflowName: "CI", status: "COMPLETED", conclusion: "SUCCESS" },
				{ name: "preview", status: "IN_PROGRESS" },
				{ name: "broken", status: "COMPLETED", conclusion: "FAILURE" },
			]),
		).toEqual([
			{ name: "Deploy Preview", state: "PENDING" },
			{ name: "Vercel Preview", state: "SUCCESS" },
			{ name: "CI / deploy", state: "SUCCESS" },
			{ name: "preview", state: "PENDING" },
			{ name: "broken", state: "FAILURE" },
		]);
	});
});
