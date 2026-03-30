import type { PlanContext } from "./types.js";

export const PLAN_CONTEXT_START = "<!-- pi-review:plan-context";
export const PLAN_CONTEXT_END = "-->";

export function parsePlanContext(body: string): PlanContext | null {
	const start = body.indexOf(PLAN_CONTEXT_START);
	if (start === -1) return null;
	const afterStart = start + PLAN_CONTEXT_START.length;
	const end = body.indexOf(PLAN_CONTEXT_END, afterStart);
	if (end === -1) return null;
	const raw = body.slice(afterStart, end).trim();
	if (!raw) return null;

	const parsed = JSON.parse(raw) as Partial<PlanContext>;
	if (parsed.version !== 1) throw new Error("Unsupported plan context version");
	if (!parsed.source?.kind || !parsed.source.value) throw new Error("Plan context source is required");
	if (!Array.isArray(parsed.acceptanceCriteria)) throw new Error("Plan context acceptanceCriteria must be an array");
	if (!Array.isArray(parsed.functionalChecks)) throw new Error("Plan context functionalChecks must be an array");
	if (!Array.isArray(parsed.codeQualityChecks)) throw new Error("Plan context codeQualityChecks must be an array");

	return {
		version: 1,
		source: parsed.source,
		issue: parsed.issue,
		summary: parsed.summary,
		acceptanceCriteria: parsed.acceptanceCriteria,
		functionalChecks: parsed.functionalChecks,
		codeQualityChecks: parsed.codeQualityChecks,
		outOfScope: parsed.outOfScope ?? [],
	};
}

export function renderPlanContext(context: PlanContext): string {
	return `${PLAN_CONTEXT_START}\n${JSON.stringify(context, null, 2)}\n${PLAN_CONTEXT_END}`;
}

export function upsertPlanContext(body: string, context: PlanContext): string {
	const rendered = renderPlanContext(context);
	const start = body.indexOf(PLAN_CONTEXT_START);
	if (start === -1) {
		const trimmed = body.trimEnd();
		return trimmed ? `${trimmed}\n\n${rendered}\n` : `${rendered}\n`;
	}

	const end = body.indexOf(PLAN_CONTEXT_END, start + PLAN_CONTEXT_START.length);
	if (end === -1) {
		throw new Error("Found start of plan context block without closing marker");
	}
	const suffixStart = end + PLAN_CONTEXT_END.length;
	return `${body.slice(0, start).trimEnd()}\n\n${rendered}${body.slice(suffixStart)}`;
}
