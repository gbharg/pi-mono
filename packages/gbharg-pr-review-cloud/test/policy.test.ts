import { describe, expect, it } from "vitest";
import { collapseLatestReviews, evaluateMergePolicy } from "../src/policy.js";
import type { LatestReviewState, PlanContext } from "../src/types.js";

const planContext: PlanContext = {
	version: 1,
	source: { kind: "file", value: ".claude/plans/codex:feature.md" },
	acceptanceCriteria: ["criterion"],
	functionalChecks: ["npm test"],
	codeQualityChecks: ["npm run check"],
};

describe("policy", () => {
	it("collapses to the latest review per reviewer", () => {
		const reviews: LatestReviewState[] = collapseLatestReviews([
			{ reviewer: "codex", state: "CHANGES_REQUESTED", submittedAt: "2026-03-30T10:00:00Z" },
			{ reviewer: "codex", state: "APPROVED", submittedAt: "2026-03-30T11:00:00Z" },
			{ reviewer: "claude", state: "APPROVED", submittedAt: "2026-03-30T11:30:00Z" },
		]);
		expect(reviews).toEqual([
			{ reviewer: "codex", state: "APPROVED", submittedAt: "2026-03-30T11:00:00Z" },
			{ reviewer: "claude", state: "APPROVED", submittedAt: "2026-03-30T11:30:00Z" },
		]);
	});

	it("blocks merges without plan context or enough approvals", () => {
		const result = evaluateMergePolicy({
			minimumApprovals: 3,
			planContext: null,
			reviews: [{ reviewer: "codex", state: "APPROVED" }],
		});
		expect(result.ok).toBe(false);
		expect(result.reasons).toContain("missing plan context");
		expect(result.reasons).toContain("requires at least 3 approvals (found 1)");
	});

	it("blocks merges with active changes requested", () => {
		const result = evaluateMergePolicy({
			minimumApprovals: 3,
			planContext,
			reviews: [
				{ reviewer: "codex", state: "APPROVED" },
				{ reviewer: "claude", state: "APPROVED" },
				{ reviewer: "gemini", state: "CHANGES_REQUESTED" },
				{ reviewer: "human", state: "APPROVED" },
			],
		});
		expect(result.ok).toBe(false);
		expect(result.blockingReviewers).toEqual(["gemini"]);
	});

	it("allows merges with plan context and three approvals", () => {
		const result = evaluateMergePolicy({
			minimumApprovals: 3,
			planContext,
			reviews: [
				{ reviewer: "codex", state: "APPROVED" },
				{ reviewer: "claude", state: "APPROVED" },
				{ reviewer: "gemini", state: "APPROVED" },
			],
		});
		expect(result.ok).toBe(true);
		expect(result.reasons).toEqual([]);
	});
});
