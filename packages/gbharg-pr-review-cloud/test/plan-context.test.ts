import { describe, expect, it } from "vitest";
import { parsePlanContext, renderPlanContext, upsertPlanContext } from "../src/plan-context.js";
import type { PlanContext } from "../src/types.js";

const context: PlanContext = {
	version: 1,
	source: { kind: "file", value: ".claude/plans/codex:feature.md" },
	issue: "AI-123",
	summary: "Test plan context",
	acceptanceCriteria: ["ac-1", "ac-2"],
	functionalChecks: ["npm test"],
	codeQualityChecks: ["npm run check"],
	outOfScope: ["future work"],
};

describe("plan-context", () => {
	it("round-trips a rendered context block", () => {
		const rendered = renderPlanContext(context);
		expect(parsePlanContext(rendered)).toEqual(context);
	});

	it("upserts a missing block into a body", () => {
		const body = "PR summary";
		const next = upsertPlanContext(body, context);
		expect(next).toContain("PR summary");
		expect(parsePlanContext(next)).toEqual(context);
	});

	it("replaces an existing block", () => {
		const original = upsertPlanContext("PR summary", context);
		const updated = upsertPlanContext(original, {
			...context,
			summary: "Updated summary",
		});
		expect(parsePlanContext(updated)?.summary).toBe("Updated summary");
	});
});
