import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadWatchState, saveWatchState } from "../src/config.ts";

const tempDirs: string[] = [];

function tempStatePath(): string {
	const dir = mkdtempSync(join(tmpdir(), "pi-auto-review-config-test-"));
	tempDirs.push(dir);
	return join(dir, "state.json");
}

afterEach(() => {
	while (tempDirs.length > 0) {
		const dir = tempDirs.pop();
		if (dir) rmSync(dir, { recursive: true, force: true });
	}
});

describe("watch state", () => {
	it("returns an empty state when the file does not exist", () => {
		expect(loadWatchState(tempStatePath())).toEqual({ pullRequests: {} });
	});

	it("round-trips a valid state file", () => {
		const path = tempStatePath();
		const state = { pullRequests: { "42": "abc123" } };
		saveWatchState(state, path);
		expect(loadWatchState(path)).toEqual(state);
	});

	it("rejects malformed JSON", () => {
		const path = tempStatePath();
		writeFileSync(path, "{not-json", "utf-8");
		expect(() => loadWatchState(path)).toThrow(/not valid JSON/);
	});

	it("rejects invalid state shape", () => {
		const path = tempStatePath();
		writeFileSync(path, JSON.stringify({ pullRequests: { "42": 42 } }), "utf-8");
		expect(() => loadWatchState(path)).toThrow(/pullRequests property mapping PR numbers to string SHAs/);
	});

	it("rejects invalid state shape before saving", () => {
		const path = tempStatePath();
		const invalidState = { pullRequests: { "42": 42 } };
		expect(() => saveWatchState(invalidState as never, path)).toThrow(
			/pullRequests property mapping PR numbers to string SHAs/,
		);
	});
});
