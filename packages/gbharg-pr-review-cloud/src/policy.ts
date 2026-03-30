import type { LatestReviewState, MergePolicyInput, MergePolicyResult } from "./types.js";

export function collapseLatestReviews(
	reviews: Array<LatestReviewState & { submittedAt?: string }>,
): LatestReviewState[] {
	const latest = new Map<string, LatestReviewState>();
	for (const review of reviews) {
		const existing = latest.get(review.reviewer);
		if (!existing) {
			latest.set(review.reviewer, review);
			continue;
		}
		const nextAt = review.submittedAt ? Date.parse(review.submittedAt) : 0;
		const currentAt = existing.submittedAt ? Date.parse(existing.submittedAt) : 0;
		if (nextAt >= currentAt) latest.set(review.reviewer, review);
	}
	return Array.from(latest.values());
}

export function evaluateMergePolicy(input: MergePolicyInput): MergePolicyResult {
	const reasons: string[] = [];
	if (!input.planContext) reasons.push("missing plan context");

	const approvals = input.reviews.filter((review) => review.state === "APPROVED").length;
	if (approvals < input.minimumApprovals) {
		reasons.push(`requires at least ${input.minimumApprovals} approvals (found ${approvals})`);
	}

	const blockingReviewers = input.reviews
		.filter((review) => review.state === "CHANGES_REQUESTED")
		.map((review) => review.reviewer);
	if (blockingReviewers.length > 0) {
		reasons.push(`blocking reviews from: ${blockingReviewers.join(", ")}`);
	}

	return {
		ok: reasons.length === 0,
		approvals,
		blockingReviewers,
		reasons,
	};
}
