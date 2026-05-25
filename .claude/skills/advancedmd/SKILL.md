---
name: advancedmd
description: "Use when handling patient data, looking up patients, managing appointments, checking visit status, or working with AdvancedMD."
allowed-tools:
  - Bash(curl *)
  - Bash(python3 *)
  - Read
  - Grep
  - Glob
---

# /advancedmd -- AdvancedMD Patient Operations

## Credentials

Load from `/Users/agent/.config/exult/advancedmd.json` (or `~/.config/exult/advancedmd.json`).
See [`INDEX.md`](../INDEX.md) for the canonical credential / data paths used across pi-mono.

- Office ID: 161112
- Auth: See credentials file for API key and session token flow

## Core Operations

### Patient Lookup
```bash
# Search by name
curl -s "$AMD_BASE/api/patients?lastName=Smith&firstName=John" \
  -H "Authorization: Bearer $AMD_TOKEN"

# Search by DOB
curl -s "$AMD_BASE/api/patients?dateOfBirth=1990-01-15" \
  -H "Authorization: Bearer $AMD_TOKEN"
```

Always verify the patient ID returned matches the intended patient before proceeding.

### Appointment Management

**Create appointment**: POST to scheduler endpoint with provider, patient, datetime, duration.

**Reschedule appointment**: There is no PATCH. You must DELETE the old appointment and POST a new one. Confirm with the user before deleting.

**Check visit status**: GET from visit status endpoint filtered by date range.

### Data Files

Local PHI data lives at `/Users/agent/pi-mono/.pi/services/amd/` (cached patient records, visit exports). Treat all contents as HIPAA-protected. The AMD API reference cache is at `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/`; the XMLRPC client is `/Users/agent/pi-mono/.pi/services/cohort_analysis/amd_xmlrpc_client.py`. See [`INDEX.md`](../INDEX.md) for the full set of canonical paths.

## Gotchas

- **Reschedule = DELETE + POST.** The AMD API has no PATCH for appointments. You must delete the existing appointment and create a new one. Always confirm with the user first.
- **Writes need Gautam approval.** Never create, modify, or delete patient data without explicit approval. Read operations are fine.
- **Always verify patient ID.** AMD can return multiple matches. Confirm the right patient before taking action.
- **API seat limit.** Only 2 API seats are provisioned. If you get auth failures, a seat may be in use. Wait and retry.
- **PHI handling.** Never log full patient records to console. Never write PHI to files outside `/Users/agent/pi-mono/.pi/services/amd/`.
- **Date format.** AMD uses MM/DD/YYYY in some endpoints and YYYY-MM-DD in others. Check the API reference for each endpoint.

## Reference Docs

See `references/advancedmd-api.json` for full API schema including endpoints, parameters, and response shapes.

## Subagent Guidelines

When spawned as a subagent for EHR tasks:
- HIPAA applies to ALL operations. Never log full patient records to console.
- Report progress via SendMessage at: task start, after each API call, and on completion.
- Include specifics in updates: patient name, appointment ID, visit count, dates.
- Write operations need explicit Gautam approval per request.
- Reschedule = DELETE + POST (no PATCH). Always confirm before deleting.
- After significant actions, run /verify to check intent match and PHI compliance.
- If you encounter auth failures, the AMD token may be expired -- request a fresh login.

## User Management (Playwright Required)

AMD has no REST API for user management. Use Playwright browser automation.

### Create User
1. Navigate to https://login.advancedmd.com/
2. Login: office key 161112, username GAUTAM, password from `/Users/agent/.config/exult/admin-logins.json`
3. Handle 2FA: code sent to gautambharg@gmail.com (check via Gmail MCP: search for "from:noreply@advancedmd.com" sorted by newest)
4. After login, navigate to: PM module > System Settings (gear icon) > Utilities > User Management
5. Click "Add" button on Users tab
6. Fill in the Create User form:
   - Username: as specified (e.g., TRISH)
   - Password: as specified
   - First/Last name
   - Email
   - Role: select appropriate role (MEDICAL ASSISTANT for clinical, BILLING for billing/AR, ADMIN for full access)
   - Department: OFFICE PROVIDERS (clinical) or as appropriate
   - User Type: check PM and/or EHR as needed
   - Administrator Type: NONE unless specified
7. Click Save
8. Verify success toast appears
9. Take screenshot as confirmation

### Common Roles
- MEDICAL ASSISTANT: clinical staff (PM + EHR)
- BILLING: full billing/AR access (PM + EHR)
- ADMIN / FULL ADMINISTRATOR: everything
- API FULL / API LIMITED: disabled in UI (only 2 seats, need AMD support)

### Past User Creations
- JERI (Jeri Holman): Medical Assistant, 2026-04-13
- TRISH (Trish, AAA Billing): Billing access, 2026-04-15
