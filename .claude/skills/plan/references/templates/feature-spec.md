# Template: Feature Spec

## Context
Building [FEATURE_NAME] for [PRODUCT/SERVICE]. Users need [USER_GOAL]. This is a multi-component feature spanning [SCOPE: backend + frontend / full-stack / cross-service].

## Scope
**In scope:** end-to-end feature delivery (schema, API, UI, tests, docs)
**NOT in scope:** [EXPLICITLY_DEFERRED_ITEMS]

## User Stories

### US-001: Data Model + Schema
**Description:** Define the data model, database schema, and migrations for the feature.
**Acceptance Criteria:**
1. Schema defined with all required fields, types, defaults, and constraints
2. Migration created and tested (up + down)
3. Indexes added for query patterns
4. Relations to existing models defined
5. Typecheck passes

### US-002: Backend / API Layer
**Description:** Implement API endpoints and business logic for the feature.
**Acceptance Criteria:**
1. Endpoints registered with correct HTTP methods and paths
2. Request validation rejects malformed input (400)
3. Auth middleware applied (existing patterns)
4. Business logic handles happy path + error cases
5. Correct status codes (200/201/204/400/404/409)
6. Typecheck passes

### US-003: Frontend / UI Layer
**Description:** Build the user-facing interface for the feature.
**Acceptance Criteria:**
1. Component renders with real data from API
2. Loading, empty, error, and success states all handled
3. Responsive: works on mobile (375px) and desktop (1280px)
4. Keyboard accessible (Tab, Enter, Escape)
5. Matches design system / DESIGN.md (if exists)
6. Typecheck passes

### US-004: Integration + Edge Cases
**Description:** Wire frontend to backend, handle edge cases and concurrent operations.
**Acceptance Criteria:**
1. End-to-end flow works (create → read → update → delete)
2. Concurrent operations don't corrupt data (optimistic locking if needed)
3. Large inputs handled gracefully (pagination, truncation, limits)
4. Offline/slow-network behavior defined
5. Typecheck passes

### US-005: Tests + Documentation
**Description:** Comprehensive test coverage and documentation for the feature.
**Acceptance Criteria:**
1. Unit tests for business logic (≥80% coverage)
2. Integration tests for API endpoints (all status codes)
3. Component tests for UI (render, interact, edge cases)
4. E2E test for critical path (create → verify)
5. README/docs updated with feature description
6. All tests pass

## Story Map
```
US-001 (schema)
  ↓
US-002 (API)  ──→  US-004 (integration)
  ↓                     ↓
US-003 (UI)   ──→  US-005 (tests + docs)
```

## Testing & Validation
- Unit: business logic with mocked deps
- Integration: full API request/response cycle
- Component: render + interaction + states
- E2E: complete user flow end-to-end

## Rollback
- Feature flag to disable without deploy (if applicable)
- Reverse migration for schema changes
- Remove route registration + component imports
