import type { PullRequestMetadata, ReviewCloudConfig } from "./types.js";

const DEFAULT_IGNORED_PATH_PREFIXES = ["docs/", "plan/"];
const DEFAULT_NON_CODE_EXTENSIONS = [".md", ".mdx", ".txt", ".rst", ".adoc", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf"];

export interface ReviewScopeDecision {
	ignored: boolean;
	reason?: string;
}

export function evaluateReviewScope(
	pr: Pick<PullRequestMetadata, "files">,
	config: Pick<ReviewCloudConfig, "ignorePathPrefixes" | "nonCodeExtensions">,
): ReviewScopeDecision {
	const files = pr.files ?? [];
	if (files.length === 0) return { ignored: false };

	const ignoredPathPrefixes = config.ignorePathPrefixes ?? DEFAULT_IGNORED_PATH_PREFIXES;
	const nonCodeExtensions = (config.nonCodeExtensions ?? DEFAULT_NON_CODE_EXTENSIONS).map((extension) => extension.toLowerCase());

	const onlyIgnored = files.every((file) => {
		const path = file.path.toLowerCase();
		return matchesIgnoredPath(path, ignoredPathPrefixes) || matchesNonCodeExtension(path, nonCodeExtensions);
	});
	if (!onlyIgnored) return { ignored: false };

	const reason = files.every((file) => matchesIgnoredPath(file.path.toLowerCase(), ignoredPathPrefixes))
		? `all changed files are under ignored paths (${ignoredPathPrefixes.join(", ")})`
		: "all changed files are non-code or documentation assets";
	return {
		ignored: true,
		reason,
	};
}

function matchesIgnoredPath(path: string, prefixes: string[]): boolean {
	return prefixes.some((prefix) => path.startsWith(prefix.toLowerCase()));
}

function matchesNonCodeExtension(path: string, extensions: string[]): boolean {
	return extensions.some((extension) => path.endsWith(extension));
}
