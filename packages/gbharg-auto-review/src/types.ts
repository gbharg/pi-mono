export interface PlanContextSource {
	kind: "file" | "url" | "inline";
	value: string;
}

export interface PlanContext {
	version: 1;
	source: PlanContextSource;
	issue?: string;
	summary?: string;
	acceptanceCriteria: string[];
	functionalChecks: string[];
	codeQualityChecks: string[];
	outOfScope?: string[];
}

export interface LatestReviewState {
	reviewer: string;
	state: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "DISMISSED" | "PENDING";
	submittedAt?: string;
	commitOid?: string;
}

export interface PullRequestReviewRequest {
	login: string;
}

export interface PullRequestFile {
	path: string;
}

export interface PullRequestStatusCheck {
	name: string;
	state: "SUCCESS" | "FAILURE" | "PENDING";
}

export interface MergePolicyInput {
	minimumApprovals: number;
	planContext: PlanContext | null;
	reviews: LatestReviewState[];
	statusChecks?: PullRequestStatusCheck[];
	deployCheckPatterns?: string[];
}

export interface MergePolicyResult {
	ok: boolean;
	approvals: number;
	blockingReviewers: string[];
	reasons: string[];
}

export interface PullRequestMetadata {
	number: number;
	title: string;
	url: string;
	body: string;
	headRefName: string;
	headRefOid: string;
	isDraft?: boolean;
	reviews?: LatestReviewState[];
	reviewRequests?: PullRequestReviewRequest[];
	files?: PullRequestFile[];
	statusChecks?: PullRequestStatusCheck[];
}

export interface RunnerCommandTemplate {
	command: string;
	args?: string[];
	env?: Record<string, string>;
}

export type ReviewModel = "codex" | "claude" | "gemini";
export type ReviewDispatchMode = "command" | "external" | "disabled";

export interface ReviewCloudConfig {
	repo?: string;
	minimumApprovals?: number;
	maxUsagePercent?: number;
	pollIntervalMs?: number;
	requestReviewers?: boolean;
	githubReviewers?: string[];
	ignorePathPrefixes?: string[];
	nonCodeExtensions?: string[];
	deployCheckPatterns?: string[];
	reviewerHandles?: Partial<Record<ReviewModel, string[]>>;
	dispatchModes?: Partial<Record<ReviewModel, ReviewDispatchMode>>;
	usageCommands?: Partial<Record<ReviewModel, RunnerCommandTemplate>>;
	commands?: Partial<Record<ReviewModel, RunnerCommandTemplate>>;
}

export interface WatchState {
	pullRequests: Record<string, string>;
}

export interface UsageCheckResult {
	model: "codex" | "claude" | "gemini";
	usagePercent: number | null;
	skipped: boolean;
	reason?: string;
}
