import { execFile, spawn } from "node:child_process";

export interface ExecResult {
	code: number;
	stdout: string;
	stderr: string;
}

export function execFileText(command: string, args: string[], cwd?: string, env?: NodeJS.ProcessEnv): Promise<ExecResult> {
	return new Promise((resolve, reject) => {
		execFile(command, args, { cwd, env }, (error, stdout, stderr) => {
			const exitCode = extractExecExitCode(error);
			if (error && exitCode === null) {
				reject(error);
				return;
			}
			resolve({
				code: exitCode ?? 0,
				stdout,
				stderr,
			});
		});
	});
}

export function spawnAndWait(command: string, args: string[], cwd?: string, env?: NodeJS.ProcessEnv): Promise<number> {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd,
			env,
			stdio: "inherit",
		});
		child.on("error", reject);
		child.on("close", (code) => resolve(code ?? 1));
	});
}

function extractExecExitCode(error: unknown): number | null {
	if (typeof error !== "object" || error === null || !("code" in error)) return null;
	return typeof error.code === "number" ? error.code : null;
}
