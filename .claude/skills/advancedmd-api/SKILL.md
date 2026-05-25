---
name: advancedmd-api
description: "Reverse-engineered AdvancedMD API reference. Use when interacting with the AdvancedMD practice management system (PM/EHR) — FHIR R4 single + bulk export endpoints, OAuth 2.0 / SMART on FHIR authorization, OpenAPI v6.1.0 spec (22 FHIR resources, 50+ endpoints), and the partner Connect API surface (~50 PM operations: patients, appointments, charges, insurance, referrals, scheduling, claims). Triggers: advancedmd, AMD api, amd-, advancedmd-, AdvancedMD, practice management API, FHIR practice management, Apigee FHIR, providerapi.advancedmd.com."
user-invocable: true
version: v1.0.0
license: MIT
---

# AdvancedMD API

Talk to AdvancedMD (PM + EHR + Patient Portal) programmatically — across all three public surfaces: the **regulatory FHIR API** (R4, US Core 6.1.0, ONC §170.315(g)(10) certified, read-only), the **Bulk FHIR Export** (SMART Backend Services with JWT), and the **partner Connect API** (proprietary XML-RPC + REST, full CRUD for PM/EHR).

AdvancedMD is a cloud-based medical office platform used by 70,000+ providers (HIPAA-regulated). The product is split into AdvancedPM (practice management), AdvancedEHR (EHR/charting), Advanced Patient (patient portal).

## When to Use

- "Pull a patient's clinical data from AdvancedMD" → FHIR Single API
- "Export an entire population from AdvancedMD for analytics" → FHIR Bulk API
- "Create/update a patient, appointment, charge, insurance, referral" → Connect API
- "Look up AMD endpoints, fields, OAuth flow, certification scope, base URLs"
- "Integrate AdvancedMD into a workflow / build an MCP server / write a typed client"
- Any agent that needs to read or write AdvancedMD data

## Architecture (one-line)

**Apigee Edge** (`providerapi.advancedmd.com`) fronts **two regulatory FHIR surfaces** (Single Patient + Bulk) certified to ONC §170.315(g)(10), plus a separate **partner Connect API** (XML-RPC + REST) gated by a Certified API Developer Agreement that exposes full CRUD on PM/EHR. FHIR is **read-only** by mandate; write traffic must go through the Connect API.

```
                    +-----------------------------+
                    |    Apigee API Gateway       |
                    |  providerapi.advancedmd.com |
                    +--------------+--------------+
                                   |
       +---------------------------+---------------------------+
       |                           |                           |
+------v------+            +-------v-------+           +-------v-------+
| FHIR Single |            |   FHIR Bulk   |           |  Connect API  |
|  R4 6.1.0   |            |    Export     |           |  XML-RPC+REST |
| (3-legged   |            | (SMART backnd |           |   (partner    |
|  SMART OAuth|            |  JWT/JWKS)    |           |   agreement)  |
+-------------+            +---------------+           +---------------+
       |                           |                           |
   read-only                  read-only                    full CRUD
   per-user PHI               groups, NDJSON               PM + EHR
```

## Reference Docs

Open the file that matches the task:

- Auth + OAuth/SMART flows (single, bulk, PKCE, EHR launch): `~/pi-mono/.claude/skills/advancedmd-api/references/auth.md`
- FHIR Single API (US Core 6.1.0, 22 resources, ~50 endpoints): `~/pi-mono/.claude/skills/advancedmd-api/references/fhir-single-api.md`
- FHIR Bulk Export (Group-scoped, JWT client_credentials, polling): `~/pi-mono/.claude/skills/advancedmd-api/references/fhir-bulk-api.md`
- Connect API (XML-RPC + REST partner API, full CRUD, ~50 PM ops): `~/pi-mono/.claude/skills/advancedmd-api/references/connect-api.md`
- Schemas (FHIR resource types, PM entity models, enums, ID prefixes): `~/pi-mono/.claude/skills/advancedmd-api/references/schemas.md`
- Errors per surface (FHIR OperationOutcome, OAuth, Connect ppmdresult, Apigee faults): `~/pi-mono/.claude/skills/advancedmd-api/references/errors.md`
- Worked examples (curl + TypeScript for Single, Bulk, Connect): `~/pi-mono/.claude/skills/advancedmd-api/references/examples.md`
- Quirks, gotchas, undocumented behavior (per-surface): `~/pi-mono/.claude/skills/advancedmd-api/references/quirks.md`
- Webhooks (and why AMD doesn't expose any — polling patterns instead): `~/pi-mono/.claude/skills/advancedmd-api/references/webhooks.md`
- Versioning, deprecation, USCDI version policy: `~/pi-mono/.claude/skills/advancedmd-api/references/versioning.md`
- Service map, sandbox + production URLs, support contacts: `~/pi-mono/.claude/skills/advancedmd-api/references/services.md`
- Enumerated Connect/PM operation surface (49 ops, structured JSON): `~/pi-mono/.claude/skills/advancedmd-api/data/pm-operations.json`

**Not bundled (license-restricted):** The full OpenAPI 3.0.1 YAML specs for FHIR Single (243 KB) and FHIR Bulk are available from the AdvancedMD developer portal at https://fhir.advancedmd.com after app registration. The portal at developer.advancedmd.com was under maintenance during this skill's authoring — request the specs directly from AMD InterOps if needed.

## Quick Start — FHIR Single (read-only patient data)

1. **Register your app** at https://fhir.advancedmd.com → Sign In → Apps → New App → request **FHIR Single Patient API** product.
2. **Get InterOps approval** by filing a ticket at https://www.advancedmd.com/support/interoperability/ ("Have a FHIR Question") referencing your app name.
3. Receive `client_id` + `client_secret` on the app dashboard.
4. Run the SMART App Launch flow:
   - Authorize: `GET https://providerapi.advancedmd.com/v1/oauth2/authorize?response_type=code&client_id=...&redirect_uri=...&scope=openid+fhirUser+offline_access+patient/*.read&state=...&aud=https://providerapi.advancedmd.com/v1/r4/{org_id}`
   - Token: `POST https://providerapi.advancedmd.com/v1/oauth2/token` with `grant_type=authorization_code`, `code=...`, `redirect_uri=...`, `Authorization: Basic base64(client_id:client_secret)`
5. Call FHIR: `GET https://providerapi.advancedmd.com/v1/r4/{org_id}/Patient/{id}` with `Authorization: Bearer <access_token>`.
6. Test patients live in the sandbox — see `references/services.md` for credentials (Test Key 1 = John Doe, Jane Doe, Anderson family).

## Quick Start — FHIR Bulk Export

1. Register at https://fhir.advancedmd.com → New App → request **FHIR Bulk API** product (DO NOT also request Single — one product per app).
2. Generate an RSA keypair and host your JWKS (public keys) at a static URL. Send the URL to AdvancedMD InterOps.
3. Get a JWT-bearer access token:
   ```
   POST /v1/oauth2/token
   grant_type=client_credentials
   client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer
   client_assertion=<signed JWT>
   scope=system/*.read
   ```
4. Kick off export: `GET /v1/r4/Group/{groupId}/$export` with `OfficeKey: <int>` + `prefer: respond-async` → returns 202 + jobId.
5. Poll status: `GET /v1/fhir-bulk/status?groupId={id}&jobId={id}` until 200 with output URLs.
6. Download NDJSON files: `GET /v1/fhir-bulk/fhir-resource/{batchId}/{fhirEntity}`.
7. Test Group IDs in sandbox: `991900`, `991901`.

## Quick Start — Connect API (write-capable PM/EHR)

The Connect API (proprietary XML-RPC + REST) is **gated by a paid Certified API Developer Agreement** — there is no self-serve sandbox. Once approved you receive credentials + a sandbox `OfficeKey` and full documentation. The public dev portal at `developer.advancedmd.com` and `devportal.advancedmd.com` is currently under maintenance — file an InterOps ticket to start.

Surface (derived from confirmed production integrations — Keragon, etc.):
- **Patients** — find, get, create, demographics, preferences, payment plan, transaction history, notes, documents (upload/download)
- **Appointments** — create, update (move/cancel/no-show/check-in/check-out), get, list, openings, types, instructions
- **Scheduling** — block/hold creation, columns, profiles, reasons, waitlist
- **Charges + Billing** — create charge, apply payment, get details, payment plans, transaction history, claim status, payments by code
- **Insurance** — create insurance, carriers, financial classes, eligibility
- **Referrals** — inbound referrals, referring providers, referral statuses
- **Codes** — diagnosis, procedure, modifier, note templates, reasons
- **Providers + Facilities** — get providers, get facilities
- **Intake** — get/create intake records (web forms)
- **Sync** — new + modified patients, visits, patient notes (delta sync by date)

See `references/connect-api.md` for the enumerated catalog grouped by area, and `data/pm-operations.json` for the same surface as structured JSON (parameter shapes + return types + enums).

## Auth Cheat Sheet

| API | Method | Endpoint |
|-----|--------|----------|
| FHIR Single | 3-legged OAuth (auth code, PKCE optional) | `/v1/oauth2/authorize` → `/v1/oauth2/token` |
| FHIR Bulk | SMART Backend Services (`client_credentials` + JWT) | `/v1/oauth2/token` |
| Connect API | Username/password + OfficeKey (per-tenant) over XML-RPC `ProcessRequest` | Per-environment endpoint URL provided after partner agreement |

**Note**: AdvancedMD does **not** support 2-legged OAuth for FHIR (no system-to-system FHIR without bulk/JWT). System-to-system writes must use the Connect API.

## Versioning + Compliance

- FHIR version: **R4** (4.0.1)
- US Core IG: **STU 6.1.0**
- USCDI: **v3**
- AdvancedMD product version: **v25**
- Certification: **Drummond Group / ONC §170.315(g)(10)**
- SMART App Launch: **v2.2** (planned upgrade to v2.0 spec by end-of-2025 — note: AMD's numbering)
- OAuth: **2.0**, OpenID Connect supported, PKCE supported (S256)
- TLS: **1.2+** required; TLS 1.0, 1.1, SSL 2.0/3.0 denied

## Gotchas

- **FHIR is read-only.** Cures Act §170.315(g)(10) mandates GET-only. To write, use the Connect API.
- **One product per FHIR app.** When registering an app you may pick exactly one: FHIR Single OR FHIR Bulk. Do not request multiple — InterOps will reject.
- **Three-legged OAuth only** for FHIR Single. Patient-facing and provider-facing apps both require the user to log in.
- **User scope `user/*.read` is fixed-patient-context.** The access token always has a patient ID baked in. To query a *different* patient, include the `_id` query param explicitly — and the EHR will enforce permissions.
- **The dev portal at `developer.advancedmd.com` is currently under maintenance** (returns "Site under maintenance"). Use https://fhir.advancedmd.com for FHIR docs; file an InterOps ticket for Connect API access.
- **Apigee fronts everything.** Rate limits, throttling, and auth enforcement live in Apigee — 429s come from there, not from upstream services.
- **`OfficeKey` is a per-tenant integer.** Bulk API requires it as a header on every call. It's the same key patients use to log into the Patient Portal.
- **EHR Launch flow encrypts patientId in a context token.** Apigee validates the token, extracts patientId, then issues tokens — your app receives only the access token + scoped patient ID.
- **HIPAA-regulated.** Do not log message bodies or PHI. Default to redacting patient identifiers when summarizing for users.
- **AdvancedMD doesn't publish official SDKs** (only three iOS forks on github.com/AdvancedMD, unrelated). Use a generic XML-RPC client (`xmlrpc` on npm) + fetch for REST.

## Source

Reverse-engineered 2026-05-23 from:
- https://fhir.advancedmd.com (public FHIR developer portal — Getting Started, APIs, Launch & Authorization, FAQs, Test Data)
- OpenAPI 3.0.1 spec for FHIR Single (`prodr4`, 243 KB YAML)
- OpenAPI 3.0.1 spec for FHIR Bulk (`bulkprodr4`)
- Confirmed Connect/PM API operation surface from Keragon's production AdvancedMD MCP (49 distinct operations with parameter schemas)
- AdvancedMD marketing + support docs at https://www.advancedmd.com (Patient API, API Partner Requirements, InterOps Support)
- Public Datavant / Healthjump / BillingParadise integration notes

Last updated: 2026-05-23. AdvancedMD's developer portal was under maintenance during reverse engineering — the FHIR portal at fhir.advancedmd.com remained operational and is the canonical public source. For the most current Connect API documentation, contact AdvancedMD InterOps Support.
