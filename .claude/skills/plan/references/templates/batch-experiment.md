# Template: Batch Research / Experimentation

## Context
Running batch experiments across [N ITEMS: e.g., 20 skills, 15 prompts, 10 configs]. Goal: [IMPROVEMENT_TARGET: e.g., improve eval scores by 10pp]. Method: [APPROACH: e.g., autoresearch mutation loops, A/B testing, parameter sweeps].

## Scope
**In scope:** experiment design, baseline measurement, parallel execution waves, results aggregation
**NOT in scope:** production deployment of results (separate plan), new item creation

## User Stories

### US-001: Experiment Design
**Description:** Define the eval rubric, mutation categories, and success metrics for the batch.
**Acceptance Criteria:**
1. Eval rubric defined: [N] binary evals per item
2. Mutation categories defined (e.g., prompt rewording, structure change, example addition)
3. Success metric: [METRIC: e.g., ≥10pp average improvement, no regressions]
4. Per-item budget: [N] experiments max
5. Results schema defined (baseline, final, experiments kept/discarded)

### US-002: Baseline Measurement
**Description:** Score all items against the eval rubric before any mutations.
**Acceptance Criteria:**
1. Each item scored [N] times (e.g., 5 runs for statistical reliability)
2. Median score recorded per item
3. Total baseline: [EXPECTED: e.g., ~70% average pass rate]
4. Results saved to `results.tsv` per item
5. Baseline reproducible (re-run produces ±5pp same scores)

### US-003: Experimentation Waves
**Description:** Run parallel mutation experiments across items in waves of [WAVE_SIZE: e.g., 5].
**Acceptance Criteria:**
1. Wave 1: [N] items run in parallel via sub-agents
2. Each agent: read item → score baseline → run up to [N] mutations → keep best
3. Results saved: `results.json` + `changelog.md` per item
4. Wave completion verified before starting next wave
5. No regressions (final score ≥ baseline for all items)

### US-004: Results Aggregation
**Description:** Collect results from all waves, compute aggregate metrics, produce summary report.
**Acceptance Criteria:**
1. Per-item report: baseline → final score, experiments kept/discarded
2. Aggregate: average improvement, best/worst items, common successful mutations
3. Pattern identification: which mutation types worked most often
4. Summary report written to [OUTPUT_PATH]
5. All result files archived for audit trail

## Story Map
```
US-001 (design)  →  US-002 (baseline)  →  US-003 (waves, parallel)  →  US-004 (aggregate)
```

## Execution Strategy
**Wave-based parallel:** [WAVE_SIZE] sub-agents per wave, [TOTAL_WAVES] waves total.
Each sub-agent runs in worktree isolation. Orchestrator waits for wave completion.

## Testing & Validation
- Baseline: reproducibility check (5 runs, ±5pp)
- Mutations: no regressions (final ≥ baseline per item)
- Results: all items have `results.json` + `changelog.md`
- Aggregate: total items processed = total items planned

## Rollback
- Experiment results: saved in per-item directories (non-breaking)
- Mutations kept: committed to actual files (revert via git if needed)
- Results archive: can be deleted without impact
