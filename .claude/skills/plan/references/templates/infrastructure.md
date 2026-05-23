# Template: Infrastructure Change

## Context
Modifying [INFRASTRUCTURE: service/deployment/CI/config/monitoring]. Current setup: [CURRENT_STATE]. Need: [CHANGE_REASON].

## Scope
**In scope:** infra changes, config updates, deployment pipeline, monitoring
**NOT in scope:** application logic changes, new features, UI changes

## User Stories

### US-001: Research + Design
**Description:** Research the infrastructure change, document the current state, and design the target architecture.
**Acceptance Criteria:**
1. Current architecture documented (ASCII diagram)
2. Target architecture documented (ASCII diagram showing delta)
3. Risk assessment: what can go wrong, blast radius, mitigation
4. Rollback procedure documented before any changes
5. Dependencies identified (services, configs, secrets)

### US-002: Implementation
**Description:** Apply the infrastructure change with safety checks.
**Acceptance Criteria:**
1. Config/deployment changes applied
2. Secrets managed properly (no plaintext, use vault/env vars)
3. Health checks pass after change
4. Monitoring/alerts updated for new state
5. No existing services disrupted during change

### US-003: Validation + Smoke Test
**Description:** Verify the infrastructure change works end-to-end.
**Acceptance Criteria:**
1. Health endpoint returns 200
2. Dependent services still connect (upstream + downstream)
3. Logs show normal operation (no error spike)
4. Performance baseline maintained (latency, throughput)
5. Monitoring dashboard reflects new state

### US-004: Documentation + Runbook
**Description:** Update operational docs and create/update runbooks.
**Acceptance Criteria:**
1. Architecture docs updated with new state
2. Runbook created: how to debug, restart, rollback
3. On-call notes updated (if applicable)
4. README/CLAUDE.md updated with new paths/config
5. Infrastructure memory file updated

## Story Map
```
US-001 (research)  →  US-002 (implement)  →  US-003 (validate)  →  US-004 (docs)
   [sequential — each step gates the next]
```

## Testing & Validation
- Health checks: all endpoints return expected status
- Integration: dependent services communicate correctly
- Load: baseline performance maintained under normal load
- Monitoring: alerts fire correctly on simulated failure

## Rollback
1. [SPECIFIC ROLLBACK STEPS — config revert, service restart, etc.]
2. Verify health checks pass after rollback
3. Notify team if rollback executed
4. Post-incident review if rollback was needed
