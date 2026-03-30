import { execFileText } from "./process.js";
import type { LatestReviewState, PullRequestFile, PullRequestMetadata, PullRequestReviewRequest, PullRequestStatusCheck } from "./types.js";

interface GhReview {
	state: string;
	author?: { login?: string };
	submittedAt?: string;
	commit?: { oid?: string };
}

interface GhReviewRequest {
	login?: string;
	slug?: string;
	requestedReviewer?: {
		login?: string;
		slug?: string;
	};
}

interface GhPrView {
	number: number;
	title: string;
	url: string;
	body: string;
	headRefName: string;
	headRefOid: string;
	isDraft?: boolean;
	reviews?: GhReview[];
	reviewRequests?: GhReviewRequest[];
	files?: Array<{ path?: string }>;
	statusCheckRollup?: GhStatusCheck[];
}

interface GhCheckRun {
	__typename?: "CheckRun";
	name?: string;
	status?: string;
	conclusion?: string;
	workflowName?: string;
}

interface GhStatusContext {
	__typename?: "StatusContext";
	context?: string;
	state?: string;
}

type GhStatusCheck = GhCheckRun | GhStatusContext;

export async function getCurrentPrNumber(cwd: string, repo?: string): Promise<number> {
	const args = ["pr", "view", "--json", "number"];
	if (repo) args.push("--repo", repo);
	const result = await execFileText("gh", args, cwd);
	if (result.code !== 0) throw new Error(result.stderr || "gh pr view failed");
	const parsed = JSON.parse(result.stdout) as { number: number };
	return parsed.number;
}

export async function fetchPullRequest(pr: number, repo: string, cwd?: string): Promise<PullRequestMetadata> {
	const result = await execFileText(
		"gh",
		[
			"pr",
			"view",
			String(pr),
			"--repo",
			repo,
			"--json",
			"number,title,url,body,headRefName,headRefOid,isDraft,reviews,reviewRequests,files,statusCheckRollup",
		],
		cwd,
	);
	if (result.code !== 0) throw new Error(result.stderr || `Failed to fetch PR #${pr}`);
	const parsed = JSON.parse(result.stdout) as GhPrView;
	return {
		number: parsed.number,
		title: parsed.title,
		url: parsed.url,
		body: parsed.body,
		headRefName: parsed.headRefName,
		headRefOid: parsed.headRefOid,
		isDraft: parsed.isDraft,
		reviews: normalizeLatestReviews(parsed.reviews),
		reviewRequests: normalizeReviewRequests(parsed.reviewRequests),
		files: normalizePullRequestFiles(parsed.files),
		statusChecks: normalizeStatusChecks(parsed.statusCheckRollup),
	};
}

export async function listOpenReviewablePullRequests(repo: string, cwd?: string): Promise<PullRequestMetadata[]> {
	const result = await execFileText(
		"gh",
		[
			"pr",
			"list",
			"--repo",
			repo,
			"--state",
			"open",
			"--json",
			"number,title,url,body,headRefName,headRefOid,isDraft",
			"--limit",
			"100",
		],
		cwd,
	);
	if (result.code !== 0) throw new Error(result.stderr || "Failed to list open PRs");
	const prs = JSON.parse(result.stdout) as Array<PullRequestMetadata & { isDraft?: boolean }>;
	return prs.filter((pr) => pr.isDraft !== true);
}

export function normalizeLatestReviews(reviews: GhReview[] | undefined): LatestReviewState[] {
	if (!reviews) return [];
	return reviews
		.map((review) => ({
			reviewer: review.author?.login ?? "unknown",
			state: normalizeReviewState(review.state),
			submittedAt: review.submittedAt,
			commitOid: review.commit?.oid,
		}))
		.filter((review) => review.reviewer !== "unknown");
}

export function normalizeReviewRequests(reviewRequests: GhReviewRequest[] | undefined): PullRequestReviewRequest[] {
	if (!reviewRequests) return [];
	return reviewRequests
		.map((request) => request.login ?? request.slug ?? request.requestedReviewer?.login ?? request.requestedReviewer?.slug)
		.filter((login): login is string => Boolean(login))
		.map((login) => ({ login }));
}

export function normalizePullRequestFiles(files: Array<{ path?: string }> | undefined): PullRequestFile[] {
	if (!files) return [];
	return files
		.map((file) => file.path)
		.filter((path): path is string => Boolean(path))
		.map((path) => ({ path }));
}

export function normalizeStatusChecks(statusChecks: GhStatusCheck[] | undefined): PullRequestStatusCheck[] {
	if (!statusChecks) return [];
	return statusChecks
		.map((statusCheck) => {
			if (isStatusContext(statusCheck)) {
				const name = statusCheck.context?.trim();
				const state = normalizeStatusContextState(statusCheck.state);
				return name && state ? { name, state } : null;
			}

			const checkName = statusCheck.name?.trim();
			const workflowName = statusCheck.workflowName?.trim();
			const name = workflowName ? `${workflowName} / ${checkName ?? "check"}` : checkName;
			const state = normalizeCheckRunState(statusCheck.status, statusCheck.conclusion);
			return name && state ? { name, state } : null;
		})
		.filter((statusCheck): statusCheck is PullRequestStatusCheck => statusCheck !== null);
}

function normalizeReviewState(state: string): LatestReviewState["state"] {
	switch (state) {
		case "APPROVED":
			return "APPROVED";
		case "CHANGES_REQUESTED":
			return "CHANGES_REQUESTED";
		case "DISMISSED":
			return "DISMISSED";
		case "COMMENTED":
			return "COMMENTED";
		default:
			return "PENDING";
	}
}

function normalizeStatusContextState(state: string | undefined): PullRequestStatusCheck["state"] | null {
	switch (state?.toUpperCase()) {
		case "SUCCESS":
			return "SUCCESS";
		case "EXPECTED":
			return "PENDING";
		case "ERROR":
		case "FAILURE":
			return "FAILURE";
		case "PENDING":
			return "PENDING";
		default:
			return null;
	}
}

function normalizeCheckRunState(
	status: string | undefined,
	conclusion: string | undefined,
): PullRequestStatusCheck["state"] | null {
	if (status && status.toUpperCase() !== "COMPLETED") return "PENDING";
	switch (conclusion?.toUpperCase()) {
		case "SUCCESS":
		case "NEUTRAL":
		case "SKIPPED":
			return "SUCCESS";
		case "ACTION_REQUIRED":
		case "CANCELLED":
		case "FAILURE":
		case "STALE":
		case "STARTUP_FAILURE":
		case "TIMED_OUT":
			return "FAILURE";
		case undefined:
			return status ? "PENDING" : null;
		default:
			return "PENDING";
	}
}

function isStatusContext(statusCheck: GhStatusCheck): statusCheck is GhStatusContext {
	return "context" in statusCheck;
}

export async function addReviewers(pr: number, repo: string, reviewers: string[], cwd?: string): Promise<void> {
	if (reviewers.length === 0) return;
	const args = ["pr", "edit", String(pr), "--repo", repo];
	for (const reviewer of reviewers) {
		args.push("--add-reviewer", reviewer);
	}
	const result = await execFileText("gh", args, cwd);
	if (result.code !== 0) throw new Error(result.stderr || `Failed to add reviewers to PR #${pr}`);
}
