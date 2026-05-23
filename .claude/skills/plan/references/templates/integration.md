# Template: Third-Party Integration

## Context
Integrating with [SERVICE/API: e.g., Stripe, Linear, GitHub, Slack]. Purpose: [WHAT_IT_ENABLES]. Auth method: [OAuth/API key/webhook].

## Scope
**In scope:** API client, auth flow, data sync, error handling, tests
**NOT in scope:** UI for the integration (separate plan), billing changes

## User Stories

### US-001: Auth + Client Setup
**Description:** Set up authentication and a typed API client for the service.
**Acceptance Criteria:**
1. Auth credentials stored securely (env vars / secrets manager)
2. API client created with typed request/response interfaces
3. Rate limiting handled (retry with backoff)
4. Auth token refresh works (if OAuth)
5. Client works in dev + production environments
6. Typecheck passes

### US-002: Core Operations
**Description:** Implement the primary operations needed from the integration.
**Acceptance Criteria:**
1. [OPERATION_1: e.g., create issue] works end-to-end
2. [OPERATION_2: e.g., read status] returns correct data
3. [OPERATION_3: e.g., update record] persists changes
4. Error responses mapped to application error types
5. Typecheck passes

### US-003: Webhook / Sync Handler (if applicable)
**Description:** Handle inbound events from the service via webhooks or polling.
**Acceptance Criteria:**
1. Webhook endpoint registered and receiving events
2. Signature verification passes (reject tampered payloads)
3. Idempotency: duplicate events handled gracefully
4. Event processing doesn't block the response (async if needed)
5. Failed processing retried with dead-letter fallback
6. Typecheck passes

### US-004: Tests + Error Scenarios
**Description:** Test the integration including failure modes.
**Acceptance Criteria:**
1. Happy path tests with mocked API responses
2. Auth failure test (expired token → refresh → retry)
3. Rate limit test (429 → backoff → retry)
4. Network timeout test (graceful failure, not crash)
5. Webhook signature rejection test
6. All tests pass

## Testing & Validation
- Unit: mocked API responses for all operations
- Integration: real API calls in sandbox/staging (if available)
- Webhook: simulated inbound events with signature verification
- Error: forced failures for all error paths

## Rollback
- Disable integration via feature flag or config change
- Revoke API credentials if decommissioning
- No data migration (integration data is in external service)
