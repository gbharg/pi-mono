# Template: Refactor

## Context
Refactoring [TARGET] because [REASON]. Current code has [PROBLEM]. Goal: [IMPROVEMENT] without changing external behavior.

## Scope
**In scope:** restructure code, update internal APIs, update tests
**NOT in scope:** new features, behavior changes, public API changes

## User Stories

### US-001: Prepare (tests + safety)
**Description:** Ensure test coverage exists for current behavior before changing anything.
**Acceptance Criteria:**
1. Existing tests pass (baseline established)
2. Add missing tests for any untested behavior that will be touched
3. Document current behavior (comments or test descriptions)
4. Typecheck passes

### US-002: Refactor (structural change)
**Description:** Apply the structural change while maintaining identical behavior.
**Acceptance Criteria:**
1. [SPECIFIC STRUCTURAL CHANGE DESCRIBED]
2. No public API changes (same inputs → same outputs)
3. All existing tests still pass (no behavior change)
4. New code follows project conventions
5. Typecheck passes

### US-003: Verify + Clean Up
**Description:** Verify the refactor didn't introduce regressions, clean up dead code.
**Acceptance Criteria:**
1. All tests pass (same as pre-refactor)
2. Dead code removed (no unused imports, functions, types)
3. No TODO/FIXME left without Linear issue reference
4. Typecheck passes

## Testing & Validation
- Pre-refactor: run full test suite, record results
- Post-refactor: run same suite, compare results (must be identical)
- Manual: verify key user flows unchanged

## Rollback
- Git revert (single commit preferred for clean revert)
- No data migration involved
- External behavior unchanged = safe to revert anytime
