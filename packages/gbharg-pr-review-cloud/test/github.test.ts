import { describe, expect, it } from "vitest";
import { normalizePullRequestFiles, normalizeReviewRequests } from "../src/github.js";

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
});
