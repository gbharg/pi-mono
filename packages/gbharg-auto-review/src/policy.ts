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

	const deployChecks = selectDeployChecks(input.statusChecks ?? [], input.deployCheckPatterns ?? []);
	if (input.deployCheckPatterns?.length) {
		if (deployChecks.length === 0) {
			reasons.push(`missing successful deploy check matching: ${input.deployCheckPatterns.join(", ")}`);
		} else {
			const failingChecks = deployChecks.filter((check) => check.state === "FAILURE").map((check) => check.name);
			if (failingChecks.length > 0) {
				reasons.push(`failing deploy checks: ${failingChecks.join(", ")}`);
			}
			const pendingChecks = deployChecks.filter((check) => check.state === "PENDING").map((check) => check.name);
			if (pendingChecks.length > 0) {
				reasons.push(`pending deploy checks: ${pendingChecks.join(", ")}`);
			}
			if (!failingChecks.length && !pendingChecks.length && !deployChecks.some((check) => check.state === "SUCCESS")) {
				reasons.push(`missing successful deploy check matching: ${input.deployCheckPatterns.join(", ")}`);
			}
		}
	}

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

function selectDeployChecks(
	statusChecks: MergePolicyInput["statusChecks"],
	patterns: string[],
) {
	const checks = statusChecks ?? [];
	const normalizedPatterns = patterns.map((pattern) => pattern.toLowerCase());
	return checks.filter((check) => {
		const name = check.name.toLowerCase();
		return normalizedPatterns.some((pattern) => name.includes(pattern));
	});
}
