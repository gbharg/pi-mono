import { execFileText } from "./process.js";

export async function inferGitHubRepo(cwd: string): Promise<string | undefined> {
	const envRepo = process.env.GITHUB_REPOSITORY;
	if (envRepo && envRepo.includes("/")) return envRepo;

	const remote = await execFileText("git", ["remote", "get-url", "origin"], cwd);
	if (remote.code !== 0) return undefined;
	return parseGitHubRepo(remote.stdout.trim());
}

export function parseGitHubRepo(remoteUrl: string): string | undefined {
	const match = remoteUrl.match(/github\.com[:/](.+?)\/(.+?)(?:\.git)?$/);
	if (!match) return undefined;
	return `${match[1]}/${match[2]}`;
}
