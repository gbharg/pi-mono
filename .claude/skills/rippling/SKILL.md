---
description: "Use when querying Rippling employees, running payroll sync from AMD, managing pay types, or handling onboarding/offboarding."
allowed-tools:
  - Bash(curl *)
  - Bash(python3 *)
  - Read
  - Grep
  - Glob
---

# /rippling -- Rippling HR & Payroll Operations

## Credentials

Load from `tools/rippling-mcp/.env`:
- API Token: RPKEY01... (permanent, no expiry)
- API Version: 2024-08-01
- Base URL: https://api.rippling.com/platform/api (proxies to api.us1.rippling.com)
- Auth: Bearer token in Authorization header
- Worker ID: `69e2ba76cb21c0add92c59f3` (gautam@exulthealthcare.com)
- Company ID: `69e2ba75cb21c0add92c59d9` (Exult Healthcare)

## Token Scope Status (verified in-app 2026-05-01)

Token in `tools/rippling-mcp/.env` is now `RPKEY01UGFp…B2sa` (named **"Claude Agent"** in the Rippling UI; the older **"Exult Agent"** `…AZRW` is also still active). Both owned by Gautam Bhargava.

**Surprise finding from inspecting the token in-app at https://app.rippling.com/developer/api-tokens :** the token already has **72 API permissions granted**, including every scope this integration needs:

- ✓ `time-entries.read`, `time-entries.read-write`, `time-cards.read`
- ✓ `shift-inputs.read`, `shift-inputs.read-write`
- ✓ `shiftassignments.read`, `shiftassignments.read-write`, `unassignedshifts.read`
- ✓ `compensations.read`, `departments.read`, `departments.read-write`, `employment-types.read`, `legal-entities.read`, …

**But `/platform/api/employees`, `/departments`, `/timecards`, `/payroll/api/time_tracking`, etc. still return 403.** The page itself explains why, in the subtitle:

> *"A token can only access what its creator has permission to access."*

So 403 is not about token scopes (those are set). It's about the **token creator's underlying Rippling user permissions**. Gautam's Rippling user role evidently doesn't include the data-level access for those resources, even though the token claims the API scopes. Rippling enforces the intersection of `token_scopes ∩ creator_user_permissions`, and the user permissions side is the limiting factor.

**To unblock:** elevate Gautam's Rippling role in **Company settings → Permission Groups** so his user account has data-level access to the Employees / Departments / Time Tracking resources. Or have someone with broader role membership re-create the token under their account. Granting more API scopes won't help — they're already granted.

Today's effective surface:
- **200** — `/platform/api/me`, `/platform/api/` (discovery doc)
- **403** (token has scope, user doesn't) — `/employees`, `/companies/current`, `/departments`, `/teams`, `/custom_fields`, `/levels`, `/work_locations`, `/leave_*`, `/groups`, `/timecards`, `/time_entries_bulk_upload`, `/payroll/api/time_tracking`, `/payroll/api/accounting_job_code_choices`
- **404** — the Tier 2 spec's `/shift-inputs/`, `/time-entries/`, `/shiftassignments/`, `/workers` paths return 404 even though the token has scopes for them. **Those endpoints don't exist on this Rippling deployment** — the spec is wishful documentation, not the real integration surface. Ignore them.
- **500** — `/me/company` (server-side bug, not auth)

`GET /platform/api/` returns the discovery doc listing the four endpoints that ARE the real integration surface:

```json
{
  "dimensions":               "https://api.us1.rippling.com/payroll/api/time_tracking",
  "job_codes":                "https://api.us1.rippling.com/payroll/api/accounting_job_code_choices",
  "timecards":                "https://api.us1.rippling.com/platform/api/timecards",
  "time_entries_bulk_upload": "https://api.us1.rippling.com/platform/api/time_entries_bulk_upload"
}
```

Response headers confirm these accept the expected verbs (`allow: GET, POST, HEAD, OPTIONS` on `/timecards`; `allow: GET, POST, PUT, PATCH, HEAD, OPTIONS` on `/time_tracking`). They're real and ready — gated only by the user-permission layer described above.

Until the user-permission elevation lands, `tools/rippling-mcp/payroll-sync.ts` and `rippling-api.ts` (which call `/employees`, `/companies/current`, etc.) cannot run end-to-end.

## Core Operations

### Identify self / discovery
```bash
curl -s "https://api.rippling.com/platform/api/me" \
  -H "Authorization: Bearer $RIPPLING_TOKEN"
# → {"id":"...","workEmail":"gautam@exulthealthcare.com","company":"..."}

curl -s "https://api.rippling.com/platform/api/" \
  -H "Authorization: Bearer $RIPPLING_TOKEN"
# → discovery doc with the four endpoints this token is provisioned for
```

### List Employees (currently 403 — pending scope grant)
```bash
curl -s "https://api.rippling.com/platform/api/employees" \
  -H "Authorization: Bearer $RIPPLING_TOKEN" \
  -H "X-API-Version: 2024-08-01"
```

### Time Tracking dimensions / shift inputs (once granted)
```bash
# discovery → dimensions URL
curl -s "https://api.rippling.com/payroll/api/time_tracking" \
  -H "Authorization: Bearer $RIPPLING_TOKEN" \
  -H "X-API-Version: 2024-08-01"
```

### Bulk time-entry upload (once granted)
```bash
curl -X POST "https://api.rippling.com/platform/api/time_entries_bulk_upload" \
  -H "Authorization: Bearer $RIPPLING_TOKEN" \
  -H "X-API-Version: 2024-08-01" \
  -H "Content-Type: application/json" \
  -d '{ "time_entries": [ { "worker_id": "...", "start_date": "2026-04-30", ... } ] }'
```

## Payroll Pipeline

The payroll sync pipeline connects AMD appointment data to Rippling custom pay types. Two delivery modes coexist:

- **Biweekly CSV upload** (legacy, `payroll-sync.ts`) — generates a CSV grouped by employee × pay type for upload through the Rippling UI. Doesn't require time-tracking API scopes; depends on `/employees` and `/custom_fields` (currently 403, see scope status above).
- **Nightly bulk time entries** (planned) — POSTs daily per-provider time entries with shift-input quantities + a patient-roster comment via `time_entries_bulk_upload`. Runs at 7:30 PM via launchd. Requires the time-tracking + timecards + bulk-upload scopes to be granted first.

### Six Custom Pay Types
1. New Psychiatry Appointment (per-unit, qty-based)
2. Follow-Up Psychiatry Appointment
3. Psychiatry No-Show / Late Cancellation
4. New Therapy Appointment (also Tier 2 for tiered therapists)
5. Follow-Up Therapy Appointment (also Tier 1 for tiered therapists)
6. Therapy No-Show / Late Cancellation

### Provider Rate Matrix
| Provider | New Psych | F/U Psych | Psych NS | New Therapy | F/U Therapy | Therapy NS |
|---|---|---|---|---|---|---|
| Ngomeni Mbilikira | $65 | $50 | $50 | - | - | - |
| Vanajakshi Dattatreya | $65 | $45 | $0* | - | - | - |
| Bria Hawkins | - | - | - | $35 | $35 | $0 |
| Rhonda Emmons | - | - | - | $45 (T2) | $40 (T1) | $0 |
| Vivica | - | - | - | $40 (T2) | $35 (T1) | $0 |

*Vanajakshi no-show rate pending decision.

### Tier Logic (Rhonda & Vivica)
Per calendar week: clients 1-20 → F/U Therapy (Tier 1), clients 21+ → New Therapy (Tier 2). Sum across all weeks in the pay period.

### Pay Period
Biweekly, every other Friday, 7-day delay. Next: period ends May 1, paychecks May 8.

### Running Payroll
1. Pull AMD visits for the pay period date range via AMD MCP `get_visit_info_by_date`
2. Pass visits to `run_payroll_sync` or `stage_payroll` MCP tool
3. Review summary
4. Upload CSV to Rippling on approval

## AMD Appointment Type → Pay Type Mapping

Config: `config/rippling-pay-mapping.json`

### AMD AppStatus Codes
- 3 (checked out), 11 (checked in) → completed encounter
- 10 → no-show
- 1 (scheduled, not seen) → exclude

## Gotchas

- **Token has 72 scopes but 403s anyway (verified 2026-05-01).** The "Claude Agent" token in `/developer/api-tokens` shows ✓ for every relevant scope (time-entries, shift-inputs, shiftassignments, time-cards, departments, etc.), yet `/employees`, `/timecards`, `/payroll/api/time_tracking`, etc. all return 403. Per the page subtitle: *"A token can only access what its creator has permission to access."* The blocker is **Gautam's underlying Rippling user permissions**, not API scopes. Fix is in Company settings → Permission Groups, not Developer → API Tokens. Spec endpoints `/shift-inputs/`, `/time-entries/`, `/workers` return 404 — they don't exist on this deployment.
- **Rate limits.** Rippling enforces per-endpoint rate limits. Back off on 429 with Retry-After header.
- **API version header required.** Always send `X-API-Version: 2024-08-01` or responses may differ. Version doesn't affect 403 status — confirmed across 2024-01 through 2026-01.
- **Tiered therapists need weekly grouping.** Don't just count total visits — split by ISO week for tier calculation.
- **Kendra and Bianca are excluded.** They are salaried/hourly, not per-encounter contractors.
- **Vanajakshi no-show rate is $0.** Pending Gautam's decision on whether to match her $45 F/U rate.
- **Bulk upload changes the integration shape.** New `time_entries_bulk_upload` endpoint replaces per-record `POST /time-entries/` from the Tier 2 spec. Plan nightly AMD→Rippling sync as one bulk POST per day, not N individual POSTs.

## Subagent Guidelines

When spawned as a subagent for Rippling/payroll tasks:
- Report progress via SendMessage at: task start, after AMD data pull, after calculation, on completion.
- Include counts: visits processed, providers matched, unmapped types, total gross.
- Never upload to Rippling without explicit Gautam approval.
- Tiered therapists (Rhonda, Vivica) require weekly grouping — verify tier split in output.
