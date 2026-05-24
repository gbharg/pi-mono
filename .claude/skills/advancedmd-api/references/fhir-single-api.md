# FHIR Single Patient API — US Core 6.1.0

Reverse-engineered from the public OpenAPI 3.0.1 spec (243 KB YAML, `data/openapi-single-r4.yaml`).

- **Spec title**: FHIR Single API - US Core 6.1.0
- **OpenAPI version**: 3.0.1
- **FHIR version**: R4 (4.0.1)
- **US Core IG**: STU 6.1.0 (https://hl7.org/fhir/us/core/STU6.1/)
- **Base URL**: `https://providerapi.advancedmd.com/v1/r4`
- **Org-scoped paths**: `/{org_id}/{Resource}` (the `org_id` is the AdvancedMD office number; the Patient API returns it during auth)
- **Auth**: 3-legged OAuth 2.0 (SMART App Launch), PKCE optional
- **Capability statement**: `GET /v1/r4/{org_id}/metadata` → FHIR `CapabilityStatement`

## Resource Tags (21 listed in the v1 OpenAPI spec; 23 in USCDI v3 incl. scope-only)

```
AllergyIntolerance, CarePlan, CareTeam, Condition, Coverage, Device,
DiagnosticReport, DocumentReference, Encounter, Goal, Immunization,
Location, MedicationDispense, MedicationRequest, Observation, Organization,
Patient, Practitioner, Procedure, Provenance, RelatedPerson
```

US Core 6.1.0 also lists `ServiceRequest` and `Specimen` as USCDI v3 resources — they appear in AMD's OAuth scope catalog (you can request `patient/ServiceRequest.read`, `patient/Specimen.read`) but were not yet exposed as searchable endpoints in the v1 OpenAPI spec we mirrored. Verify the live set with `GET /v1/r4/{org_id}/metadata`.

## All Endpoints (50+)

Each FHIR resource exposes a search (`GET`), an id-bound read (`GET /{Resource}/{id}`), and most also support `POST /_search` (form-encoded body).

| Resource | GET /Resource | GET /Resource/{id} | POST /Resource/_search | Other |
|----------|---------------|--------------------|------------------------|-------|
| AllergyIntolerance | ✅ | ✅ | ✅ | |
| CarePlan | ✅ | ✅ | ✅ | |
| CareTeam | ✅ | ✅ | ✅ | |
| Condition | ✅ | ✅ | ✅ | |
| Coverage | ✅ | ✅ | ✅ | |
| Device | ✅ | ✅ | ✅ | |
| DiagnosticReport | ✅ | ✅ | ✅ | |
| DocumentReference | ✅ | ✅ | ✅ | `GET /DocumentReference/$docref` (operation) |
| Encounter | ✅ | ✅ | — | |
| Goal | ✅ | ✅ | ✅ | |
| Immunization | ✅ | ✅ | ✅ | |
| Location | ✅ | ✅ | — | |
| MedicationDispense | ✅ | ✅ | ✅ | |
| MedicationRequest | ✅ | ✅ | ✅ | |
| Observation | ✅ | ✅ | ✅ | |
| Organization | ✅ | ✅ | — | |
| Patient | ✅ | ✅ | ✅ | |
| Practitioner | ✅ | ✅ | — | |
| Procedure | ✅ | ✅ | ✅ | |
| Provenance | — | ✅ | — | |
| RelatedPerson | ✅ | ✅ | ✅ | |

`POST /{Resource}/_search` accepts `application/x-www-form-urlencoded` (per FHIR spec); responses are FHIR Bundles.

## Authorization Behavior (per endpoint)

Every endpoint honors three access rules based on the bound scope:

- **Patients** (`patient/*.read`) — can only access their own resources. Practitioner attempts to query a different patient via `_id` are rejected.
- **Practitioners** (`patient/*.read`) — can access only the one assigned patient that the launch context bound them to.
- **Practitioners** (`user/*.read`) — must explicitly pass `_id` (or include `patient` in `_search` body) to query a patient other than the one in the access token's default context. The EHR then enforces practitioner-level ACL.

## Example — GET /Patient

```http
GET /v1/r4/174/Patient?_id=6077169
Authorization: Bearer eyJhbGc...
Accept: application/fhir+json
```

Query parameters:

| Name | Type | Description |
|------|------|-------------|
| `_id` | integer | Logical Patient resource ID. Required for practitioners using `user/*.read` to query others. |
| `identifier` | string | Business identifier like MRN or MPI. Use token syntax `{system}|{value}` (e.g., `http://hospital.smarthealthit.org\|90332213`) or just the value when the server can infer system. |
| `name` | string | Text search against patient name. **Quirk**: primarily matches family names across all `Patient.name` entries (`official`, `old`); may not return results for given-name-only input. Example: `Jones`. |
| `birthdate` | string (date) | `YYYY-MM-DD`. Use with `name` for precision. |
| `gender` | string | `male`, `female`, `other`, `unknown`. Use with `name` for precision. |

Responses:

| Status | Body |
|--------|------|
| 200 | `array<Patient>` (FHIR Bundle of Patient resources) |
| 401 | `OperationOutcome` / `Error` (Unauthorized) |
| 403 | `OperationOutcome` / `Error` (Forbidden — scope/ACL) |

Response Content-Type: `application/fhir+json;charset=utf-8`.

## Example — POST /Patient/_search

```http
POST /v1/r4/174/Patient/_search
Authorization: Bearer eyJhbGc...
Content-Type: application/x-www-form-urlencoded

_id=6077169&name=Smith&birthdate=1990-07-04&gender=female
```

Same parameter shape as GET, body-encoded. Use this for queries that exceed URL length limits or to avoid leaking PHI in browser history / proxy logs.

## Common Search Parameters (across resources)

| Param | Meaning |
|-------|---------|
| `_id` | Logical resource ID |
| `patient` | Filter resources by Patient reference (when scoped via `user/*.read`) |
| `_lastUpdated` | Resources modified since/before a timestamp (`gt2024-01-01`, `lt2024-12-31`) |
| `_count` | Page size (FHIR default 10, max varies per resource) |
| `_sort` | Sort key (`-date` for descending date) |
| `_include` | Include referenced resources (e.g., `Encounter:patient`) |
| `_revinclude` | Reverse include |

Per-resource search params follow the US Core 6.1.0 IG. See https://hl7.org/fhir/us/core/STU6.1/.

## DocumentReference $docref Operation

`GET /v1/r4/{org_id}/DocumentReference/$docref?patient={id}&start={date}&end={date}&type={LOINC}`

Returns a Bundle of DocumentReferences for the requested patient within an optional date range. This is the US Core required operation for fetching the **most recent CCDA** for a patient.

| Param | Required | Notes |
|-------|----------|-------|
| `patient` | yes | Patient reference (e.g., `Patient/6077169`) |
| `start` | no | Lower date bound |
| `end` | no | Upper date bound |
| `type` | no | LOINC code (default behavior: most recent CCDA) |
| `on-demand` | no | If `true`, generate a fresh CCDA snapshot |
| `profile` | no | Restrict to a specific profile URL |

## Pagination

FHIR Bundle responses include a `link` array with `relation: "next"`, `relation: "previous"`, `relation: "self"`. Follow the `next` link URL verbatim — do not construct your own paging params. Bundle.total is provided when known.

## Schema Components

The OpenAPI spec defines schemas for every FHIR R4 resource plus their nested types. See `references/schemas.md` for the full list. Key top-level schemas:

```
Patient, AllergyIntolerance, CarePlan, CareTeam, Condition, Coverage,
Device, DiagnosticReport, DocumentReference, Encounter, Goal,
Immunization, Location, MedicationDispense, MedicationRequest,
Observation, Organization, Practitioner, Procedure, Provenance,
RelatedPerson, Error
```

Plus nested types like `Account_coverage`, `Account_meta`, `Account_text`, `Account_type_coding`, `ActivityDefinition_telecom`, `Appointment_basedOn`, `CarePlan_identifier`, `Location_address`, `Location_position`, etc.

The full machine-readable spec is at `data/openapi-single-r4.yaml` (5500+ lines, 248 KB).

## Live Endpoint Reference

Each endpoint has its own detail page on the dev portal under:
`https://fhir.advancedmd.com/docs/prodr4/1/routes/{Resource}/{method}` (e.g., `https://fhir.advancedmd.com/docs/prodr4/1/routes/Patient/_search/post`).

The spec download (auth-free) is at:
`https://fhir.advancedmd.com/portals/api/sites/prj-prod-apigeex-advancedmdfhirportal/liveportal/apis/prodr4/download_spec`
(returns `prodr4.yaml`, content-disposition `attachment`).

## Sandbox Test Data

See `references/services.md`. Test patient credentials match Patient Portal credentials (email + password + OfficeKey). Provider credentials match AdvancedEHR logins.
