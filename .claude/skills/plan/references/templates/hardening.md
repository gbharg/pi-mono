# Template: System Hardening / Quality Gates

## Context
Improving quality gates for [SYSTEM]. Current state: [N PASS / N WARN / N FAIL]. Target: [TARGET_STATE]. Triggered by [AUDIT_RESULT / INCIDENT / REVIEW].

## Scope
**In scope:** fix failing checks, adjust thresholds, add defensive logic, improve eval coverage
**NOT in scope:** new features, architecture changes, performance optimization

## User Stories

### US-001: Fix Blockers (prerequisite)
**Description:** Remove external interference or fix blockers that prevent other stories from landing.
**Acceptance Criteria:**
1. [BLOCKER] resolved (e.g., sync conflict, permission issue, missing dependency)
2. All subsequent stories can proceed without this blocker
3. Verified: re-run audit/eval, blocker no longer appears

### US-002: Fix Failing Checks
**Description:** Address each FAIL in the current audit/eval output.
**Acceptance Criteria:**
1. Each FAIL identified with root cause
2. Fix applied (not suppressed or threshold-adjusted)
3. Re-run shows PASS for previously failing checks
4. No existing PASS checks regressed to WARN or FAIL

### US-003: Adjust Thresholds
**Description:** Calibrate WARN thresholds that are too strict or too lenient based on architectural decisions.
**Acceptance Criteria:**
1. Each threshold adjustment justified with rationale
2. Adjustments documented in eval config comments
3. Re-run shows correct PASS/WARN/FAIL distribution
4. No false positives (WARN on intentional design decisions)

### US-004: Defensive Hardening
**Description:** Add fallback logic, edge case handling, and validation for discovered gaps.
**Acceptance Criteria:**
1. Edge cases identified and handled (null, empty, malformed input)
2. Error messages are actionable (not just "failed")
3. Fallback behavior documented
4. Typecheck/lint passes

## Story Map
```
US-001 (blockers)  →  US-002 (fix fails)  →  US-003 (thresholds)  →  US-004 (hardening)
   [strict sequential — each gates the next]
```

## Testing & Validation
- Before: run full audit/eval, record baseline (N PASS / N WARN / N FAIL)
- After each story: re-run, verify improvement
- Final: all checks PASS or justified WARN, zero FAIL
- Regression: no previously-passing checks broken

## Rollback
- Threshold changes: revert eval config
- Hardening: revert defensive code additions
- Blocker fixes: revert file/config changes
