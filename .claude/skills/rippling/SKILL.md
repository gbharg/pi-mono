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

## When to use the API vs Browser

Rippling exposes two distinct surfaces and **Personal API Tokens only reach
one of them**. Verified 2026-06-01 with a freshly minted Personal Token under
Gautam's super-admin user with every scope ticked.

| Goal                                  | Path        | How                                                                          |
|---------------------------------------|-------------|------------------------------------------------------------------------------|
| Get current user identity             | MCP API     | `rippling.get_me`                                                            |
| Create / approve / reject time entry  | MCP API     | `rippling.create_time_entry`, `get_time_entry`, `update_time_entry`, `approve_time_entry`, `reject_time_entry` |
| Compute payroll CSV from AMD visits   | MCP API     | `rippling.run_payroll_sync`, `rippling.stage_payroll` (pure computation; no Rippling call) |
| Look up employee by name / email      | Browser     | navigate `/people`, type into omnisearch, scrape dropdown                    |
| List departments / teams              | Browser     | `/admin/departments`, `/admin/teams`, scrape admin tables                    |
| Check leave balances                  | Browser     | `/time-off/balances/<employee>`, scrape                                      |
| Update employee field                 | Browser     | `/people/<id>/edit`, drive form                                              |
| Anything in Rippling Marketplace API  | Custom App  | Not self-serve — request via Rippling Partner program                        |

**Why the partition exists:** Marketplace Platform API endpoints
(`/employees`, `/departments`, `/teams`, `/custom_fields`, `/levels`,
`/work_locations`, `/leave_*`, `/companies/current`, `/company_activity`,
etc.) are reachable only by Custom Apps provisioned through Rippling's
Partner program. The misleading page subtitle "A token can only access what
its creator has permission to access" suggests this is a user-permission
problem; it isn't — even a fully-privileged super-admin Personal Token 403s
on every Marketplace endpoint. Adding more scopes to the token does not
help. Re-creating the token under a different user does not help. The fix
requires registering as a Rippling Partner. Until then, the browser
fallback at [`browser-fallback.md`](./browser-fallback.md) is the only
path.

**How the MCP signals this:** the Marketplace-only tools are still
registered in `tools/list`, but their descriptions are prefixed
`[BROWSER-ONLY — 403 under Personal API Token]` and calling one returns a
structured error pointing at `browser-fallback.md`. This keeps existing
prompts working (no `unknown_tool` errors) while steering the agent to the
right path.

## Credentials

Load from `tools/rippling-mcp/.env`:
- API Token: RPKEY01... (permanent, no expiry)
- API Version: 2024-08-01
- Base URL: https://api.rippling.com/platform/api (proxies to api.us1.rippling.com)
- Auth: Bearer token in Authorization header
- Worker ID: `69e2ba76cb21c0add92c59f3` (gautam@exulthealthcare.com)
- Company ID: `69e2ba75cb21c0add92c59d9` (Exult Healthcare)

## Token Scope Status (verified in-app 2026-06-01 — updates 2026-05-01)

The token in `tools/rippling-mcp/.env` is a **Personal API Token** (the kind any
super-admin can self-mint at `https://app.rippling.com/developer/api-tokens`).
On 2026-06-01 we minted a fresh token under Gautam's account with every
available scope ticked and re-ran the surface check:

- `/me` → **200** ✓
- `/employees` → **403**
- `/companies/current` → **403**
- `/departments`, `/teams`, `/custom_fields`, `/levels`, `/work_locations`,
  `/leave_*`, `/company_activity` → **403**
- All Marketplace Platform API endpoints → **403**

**Revised diagnosis (supersedes the 2026-05-01 "user-permission" theory):**
the limiting factor is **API surface**, not user permissions. Rippling has
two API surfaces:

1. **Marketplace Platform API** (`/employees`, `/departments`, etc.) —
   reachable only by **Custom Apps** registered via the Rippling Partner
   program. Personal Tokens 403 here regardless of scopes or user role.
2. **Personal API surface** (`/me`, `/time_entries`, `/shifts`) — reachable
   by any Personal API Token.

The page subtitle "A token can only access what its creator has permission
to access" is misleading; even a fully-privileged super-admin's Personal
Token 403s on the Marketplace surface. **Re-creating the token under a
different user does not help.** **Granting more scopes does not help.**

The only way to regain API access to the Marketplace surface is to register
Exult as a Rippling Partner and provision a Custom App. That's not
self-serve and is gated on Rippling BD approval.

Until that lands, use the [browser fallback](./browser-fallback.md) for any
operation that targets the Marketplace surface.

Today's effective API surface:
- **200** — `/me`, `/time_entries` CRUD, `/shifts` CRUD
- **403** — `/employees`, `/companies/current`, `/departments`, `/teams`,
  `/custom_fields`, `/levels`, `/work_locations`, `/leave_*`,
  `/company_activity`, and every other Marketplace endpoint
- **404** — `/shift-inputs/`, `/shiftassignments/`, `/workers` paths from
  older spec versions return 404 on this deployment. Ignore.
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

Response headers confirm these accept the expected verbs (`allow: GET, POST, HEAD, OPTIONS` on `/timecards`; `allow: GET, POST, PUT, PATCH, HEAD, OPTIONS` on `/time_tracking`). They are real endpoints, but they live on the **Marketplace surface** — reachable only via a Custom App registered through the Rippling Partner program. Personal API Tokens 403 on all four regardless of scopes or user role. Scope grants and user-role changes will not unblock them; only a Marketplace Custom App will.

Until Exult is registered as a Rippling Partner and a Custom App is provisioned, `tools/rippling-mcp/payroll-sync.ts` and `rippling-api.ts` (which call `/employees`, `/companies/current`, etc.) cannot run end-to-end against the Marketplace surface. Use the [browser fallback](./browser-fallback.md) in the meantime.

## Core Operations

### Documents templates

Use `children/documents/SKILL.md` for Rippling Documents template setup, DOC/DOCX imports, prefilled variables, employee/contractor recipient fields, signer fields, and publish validation. This child skill covers browser-editor document setup and is separate from payroll/timecard API operations.

### Identify self / discovery
```bash
curl -s "https://api.rippling.com/platform/api/me" \
  -H "Authorization: Bearer $RIPPLING_TOKEN"
# → {"id":"...","workEmail":"gautam@exulthealthcare.com","company":"..."}

curl -s "https://api.rippling.com/platform/api/" \
  -H "Authorization: Bearer $RIPPLING_TOKEN"
# → discovery doc with the four endpoints this token is provisioned for
```

### List Employees (Marketplace-only — 403 on Personal Tokens)
```bash
curl -s "https://api.rippling.com/platform/api/employees" \
  -H "Authorization: Bearer $RIPPLING_TOKEN" \
  -H "X-API-Version: 2024-08-01"
```

### Time Tracking dimensions / shift inputs (Marketplace-only — requires Custom App)
```bash
# discovery → dimensions URL
curl -s "https://api.rippling.com/payroll/api/time_tracking" \
  -H "Authorization: Bearer $RIPPLING_TOKEN" \
  -H "X-API-Version: 2024-08-01"
```

### Bulk time-entry upload (Marketplace-only — requires Custom App)
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

- **Personal API Tokens 403 on the Marketplace surface, period (verified 2026-06-01).** Re-tested with a freshly-minted token under Gautam's super-admin user with every scope ticked: still 403. The blocker is API surface (Marketplace vs Personal), not scopes and not user role. Fix is to register Exult as a Rippling Partner and get Custom App credentials, OR use the [browser fallback](./browser-fallback.md). See "Token Scope Status" above.
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
