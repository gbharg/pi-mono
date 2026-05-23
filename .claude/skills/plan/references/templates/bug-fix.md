# Template: Bug Fix

## Context
Bug: [SYMPTOM]. Expected: [EXPECTED_BEHAVIOR]. Actual: [ACTUAL_BEHAVIOR]. Reported via [SOURCE].

## Scope
**In scope:** root cause fix, regression test, related edge cases
**NOT in scope:** refactoring surrounding code, adding features

## User Stories

### US-001: Reproduce + Root Cause
**Description:** Reproduce the bug reliably and identify the root cause.
**Acceptance Criteria:**
1. Bug reproduced with specific steps
2. Root cause identified (file:line + explanation)
3. Failing test written that demonstrates the bug
4. Test fails on current code (confirms reproduction)

### US-002: Fix + Regression Test
**Description:** Fix the root cause and verify with a regression test.
**Acceptance Criteria:**
1. Root cause fixed (minimal change, no side effects)
2. Failing test from US-001 now passes
3. No existing tests broken
4. Edge cases near the fix also tested
5. Typecheck passes

## Testing & Validation
- Regression test: the exact scenario that triggered the bug
- Edge cases: similar inputs near the boundary
- Existing suite: full pass (no regressions)

## Rollback
- Git revert the fix commit
- Re-open Linear issue if reverted
