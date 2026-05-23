# Template: API Endpoint

## Context
Adding a new API endpoint to [SERVICE]. The endpoint handles [OPERATION] for [RESOURCE].

## Scope
**In scope:** endpoint implementation, validation, error handling, tests
**NOT in scope:** auth changes (use existing middleware), frontend integration

## User Stories

### US-001: Schema + Validation
**Description:** Define the request/response schema and input validation for the endpoint.
**Acceptance Criteria:**
1. Request schema defined with types for all fields
2. Response schema defined (success + error shapes)
3. Input validation rejects malformed requests with 400
4. Typecheck passes

### US-002: Endpoint Implementation
**Description:** Implement the route handler with business logic.
**Acceptance Criteria:**
1. Route registered at [METHOD] [PATH]
2. Auth middleware applied (existing)
3. Business logic handles happy path
4. Returns correct status codes (200/201/204)
5. Typecheck passes

### US-003: Error Handling + Edge Cases
**Description:** Handle error cases and edge conditions.
**Acceptance Criteria:**
1. 404 for missing resources
2. 409 for conflicts (if applicable)
3. 500 errors logged with context
4. Rate limiting applied (if applicable)
5. Typecheck passes

### US-004: Tests
**Description:** Unit and integration tests for the endpoint.
**Acceptance Criteria:**
1. Happy path test (valid request → expected response)
2. Validation test (invalid input → 400)
3. Auth test (no token → 401, wrong role → 403)
4. Edge case tests (empty body, missing fields, duplicate)
5. All tests pass

## Testing & Validation
- Unit: handler logic with mocked dependencies
- Integration: full request/response cycle
- Coverage: all status codes exercised

## Rollback
- Remove route registration
- Revert schema changes
- No data migration needed (additive only)
