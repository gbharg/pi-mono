import { execFile, spawn } from "node:child_process";

export interface ExecResult {
	code: number;
	stdout: string;
	stderr: string;
}

export function execFileText(command: string, args: string[], cwd?: string, env?: NodeJS.ProcessEnv): Promise<ExecResult> {
	return new Promise((resolve, reject) => {
		execFile(command, args, { cwd, env }, (error, stdout, stderr) => {
			if (error && typeof (error as NodeJS.ErrnoException).code !== "number") {
				reject(error);
				return;
			}
			resolve({
				code: typeof (error as NodeJS.ErrnoException | null)?.code === "number" ? Number((error as NodeJS.ErrnoException).code) : 0,
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
