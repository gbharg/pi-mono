# AdvancedMD — Versioning, USCDI & Deprecation

AdvancedMD juggles **four independent version axes**: the FHIR R4 spec itself, the US Core IG, the USCDI dataset, and AMD's own product version (currently v25). Each evolves on its own clock.

## Current versions (as of 2026-05-23)

| Axis | Version | Source |
|------|---------|--------|
| FHIR | **R4** (`4.0.1`) | HL7 |
| US Core IG | **STU 6.1.0** | https://hl7.org/fhir/us/core/STU6.1/ |
| USCDI dataset | **v3** | https://www.healthit.gov/isa/uscdi |
| SMART App Launch | **2.0.0** | http://hl7.org/fhir/smart-app-launch/STU2/ |
| AdvancedMD product | **v25** | AMD release notes |
| ONC certification | **§170.315(g)(10)** | Drummond Group |
| OpenAPI (Single) | **3.0.1** | AMD-published spec |
| OpenAPI (Bulk) | **3.0.1** | AMD-published spec |
| OAuth | **2.0** | RFC 6749 + 6750 |
| OpenID Connect | **1.0** | Specs |
| PKCE | **S256 only** | RFC 7636 (plain not accepted) |
| TLS minimum | **1.2** | AMD policy |

## ONC §170.315(g)(10) — what it means

The "API access — patient selection" criterion of the 21st Century Cures Act mandates:

- **Read-only**, **token-secured**, **standards-based** API for patient and population access.
- Must implement FHIR R4 + US Core IG.
- Must support both **patient/*.read** (single-patient app) and **system/*.read** with Bulk Export (population app).
- Must enforce SMART App Launch authorization (3-legged for patient/user, client_credentials+JWT for system).
- Public docs and free developer access required.
- No fees for the API access itself (AMD doesn't charge for FHIR Single + Bulk).

This is **why FHIR is read-only at AMD** — the Cures Act §170.315(g)(10) criterion only required read.

## USCDI v3 — the 23 resources

These are the 23 FHIR resources AMD must support under USCDI v3 / US Core 6.1.0:

```
AllergyIntolerance, CarePlan, CareTeam, Condition, Coverage, Device,
DiagnosticReport, DocumentReference, Encounter, Goal, Immunization,
Location, MedicationDispense, MedicationRequest, Observation,
Organization, Patient, Practitioner, Procedure, Provenance,
RelatedPerson, ServiceRequest, Specimen
```

`ServiceRequest` and `Specimen` are listed in the OAuth scope catalog but were not yet in the v1 OpenAPI spec as of the 6.1.0 release — confirm with `GET /v1/r4/{org_id}/metadata` before relying on them.

## Roadmap commitments (publicly stated)

| Capability | Target |
|------------|--------|
| Generic `user/*.read` scope (multi-patient access) | "End of 2025" per AMD docs |
| SMART App Launch v2.2 support | End-of-2025 (note: 2.2 is AMD's labeling — the spec is technically still STU2 at v2.0) |
| USCDI v4 + US Core 7.x | TBD (likely 2026 — tied to ONC adoption schedule) |

## Deprecation policy

AMD's stated approach (per the FHIR portal FAQ + InterOps email):

1. **Major FHIR version upgrades** (R4 → R5) require ~12-month notice via InterOps.
2. **US Core / USCDI minor version bumps** are coordinated with ONC's certification window — typically 6 months from rule publication.
3. **OpenAPI spec breaking changes** are communicated by email to all registered developers and archived in the dev portal (when not under maintenance).
4. **Connect API** changes follow a separate, slower cadence — typically annual releases delivered as updated PMSXML/EHRXML packets. Old versions remain accessible for at least 18 months after the new version ships.
5. **OAuth/SMART** updates follow HL7's release cadence with a 6-month tail.

## How to detect breaking changes

| Surface | Mechanism |
|---------|-----------|
| FHIR Single | `GET /v1/r4/{org_id}/metadata` — diff CapabilityStatement weekly. AMD bumps `software.version` on each release. |
| FHIR Bulk | OpenAPI YAML at the dev portal has a `info.version` (semver). Diff after AMD release notes. |
| Connect API | Watch InterOps email for packet updates. No public changelog. |
| OAuth/SMART | `GET /.well-known/smart-configuration` — supported scopes + grant types. |

## Pinning recommendation

In your client:

```ts
const FHIR_VERSION = "R4";
const US_CORE = "6.1.0";
const SMART_VERSION = "2.0.0";
const AMD_PRODUCT = "v25";
```

Send these in your User-Agent and log on requests; when AMD bumps, you'll see traffic patterns shift and can correlate.

## Behavior on unsupported versions

- **Request to a deprecated FHIR endpoint** → 410 Gone with OperationOutcome describing replacement.
- **`Accept: application/fhir+xml`** with an XML-only resource → 406 Not Acceptable. AMD does **not** advertise XML support — always use `application/fhir+json` or `application/json`.
- **`MIME Accept-Patch: application/json-patch+json`** → 405 Method Not Allowed. AMD does not accept FHIR PATCH (FHIR is read-only here).
- **Bulk export with an unknown `_outputFormat`** → 400. Only `application/fhir+ndjson` is supported.

## See Also

- Auth scopes (current): `references/auth.md`
- Versioning examples in error envelopes: `references/errors.md`
