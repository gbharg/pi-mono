import { describe, expect, it } from "vitest";
import { evaluateReviewScope } from "../src/scope.js";

describe("review scope", () => {
	it("ignores PRs that only change ignored directories", () => {
		expect(
			evaluateReviewScope(
				{
					files: [{ path: "docs/guide.md" }, { path: "plan/launch-checklist.md" }],
				},
				{},
			),
		).toEqual({
			ignored: true,
			reason: "all changed files are under ignored paths (docs/, plan/)",
		});
	});

	it("ignores PRs that only change non-code files", () => {
		expect(
			evaluateReviewScope(
				{
					files: [{ path: "README.md" }, { path: "assets/diagram.png" }],
				},
				{},
			),
		).toEqual({
			ignored: true,
			reason: "all changed files are non-code or documentation assets",
		});
	});

	it("does not ignore PRs with code changes", () => {
		expect(
			evaluateReviewScope(
				{
					files: [{ path: "README.md" }, { path: "src/index.ts" }],
				},
				{},
			),
		).toEqual({ ignored: false });
	});
});
