# Connect API — Partner XML-RPC + REST (CRUD)

The Connect API is AdvancedMD's proprietary partner integration surface. Unlike the FHIR APIs (regulatory, read-only, public OAuth) the Connect API:

- Is **write-capable** (full CRUD on PM + EHR)
- Requires a **Certified API Developer Agreement** (paid licensing + support fees)
- Is **gated** — no self-serve sign-up. Onboard via https://www.advancedmd.com/api-connection-request/
- Has two transports: **XML-RPC** (legacy, dominant) and **REST** (newer)
- Documentation is delivered as a packet (PMSXML.pdf, EHRXML.pdf) on contract execution
- Has a separate sandbox `OfficeKey` issued during onboarding

## Onboarding Process (publicly documented)

1. Submit interest at https://www.advancedmd.com/api-connection-request/
2. Sign Certified API Developer Agreement (NDA + licensing terms)
3. AMD InterOps issues:
   - Sandbox `OfficeKey` (demo office for testing)
   - API username + password
   - Documentation packet (PMSXML, EHRXML schemas)
   - Sandbox endpoint URL
4. Build + test in sandbox
5. Go-live requires AMD certification of your app

Typical SLA: credentials and docs within 24 hours of agreement execution (per Healthjump support docs).

## Authentication

Each XML-RPC call includes:

```xml
<ppmdmsg action="..." class="..." username="..." password="..." officekey="...">
  <!-- body -->
</ppmdmsg>
```

| Field | Notes |
|-------|-------|
| `username` | API user (not EHR/Portal user) |
| `password` | API user password |
| `officekey` | Tenant identifier (integer); patient-portal users use the same key |
| `action` | Operation name (e.g., `getpatients`, `addappointment`) |
| `class` | API module (e.g., `pat`, `sched`, `chrg`) |

For REST flavors, AMD issues OAuth 2.0 Bearer tokens; the token endpoint is provided post-contract.

## Transport

### XML-RPC

```http
POST {sandbox-endpoint-url}
Content-Type: text/xml
```

Request body:
```xml
<?xml version="1.0"?>
<methodCall>
  <methodName>ProcessRequest</methodName>
  <params>
    <param><value><string>{xml-encoded ppmdmsg envelope}</string></value></param>
  </params>
</methodCall>
```

The XML-RPC `ProcessRequest` method wraps a stringified `<ppmdmsg>` XML envelope that contains the actual operation. This is the same pattern used by other practice-management systems built on a SOAP-era core.

### REST (newer)

Per-operation paths under a tenant-scoped base (provided after contract). Authentication is `Authorization: Bearer {token}`. Bodies and responses are JSON.

## Operation Surface (~50 operations)

The Connect API surface is documented in `data/pm-operations.json` — derived from confirmed production integration tools (Keragon's AdvancedMD MCP, which exposes 49 distinct AMD operations as MCP tools, each with full JSON Schema parameter definitions).

Operations grouped by area:

### Patients (12 ops)
- `findPatient` — lookup by name, chart, DOB, phone, SSN, visit number; supports `exactmatch`
- `getPatient` — fetch full patient record by ID
- `getPatientDemographic` — fetch demographic-only payload
- `getPatients` — list patients (paged, default 500)
- `getPatientPreferences` — communication prefs (email/text reminders, language, timezone)
- `getPatientPaymentPlan` — active payment plan
- `getPatientTransactionHistory` — transaction history by responsible-party ID
- `createPatient` — create new patient (requires `chart`, `profile`; many optional demographics)
- `updatePatientPreferences` — modify reminder/notification preferences
- `getNewAndModifiedPatients` — delta sync by date
- `getNewAndModifiedPatientNotes` — delta sync of notes by date + template
- `createPatientNote` — add free-text note linked to patient + provider + note type

### Documents (4 ops)
- `getFiles` — list files for a patient by file type
- `getPatientDocument` — metadata for a document
- `uploadPatientDocument` — upload a file (URL or text content)
- `downloadPatientDocument` — fetch binary content

### Appointments (8 ops)
- `getAppointments` — list by patient + column + start date
- `getAppointment` — fetch single appointment with optional detail
- `getOpenings` — find open slots given column(s), days-of-week, duration, time range
- `getAppointmentInstructions` — list available appointment instructions
- `getAppointmentTypes` — list appointment types
- `createAppointment` — book an appointment
- `updateAppointment` — actions: `checkin`, `checkout`, `move`, `cancel`, `noshow`, `uncheckin`, `uncheckout`
- `createBlockHold` — create a scheduler block or hold (type 1 = block, type 2 = hold)

### Scheduler Setup (4 ops)
- `getSchedulerSetupColumns` — provider columns in the scheduler
- `getSchedulerSetupProfiles` — provider profiles (visit-type groupings)
- `getReasons` — block reasons (type 1) or hold reasons (type 2)
- `getFacilities` — list of facilities

### Billing & Charges (6 ops)
- `createCharge` — create a charge (proccode, diagcodes, modcodes, units, facility, patient, visit)
- `getChargeDetails` — fetch a charge by ID
- `applyPaymentToCharge` — apply patient or insurance payment to a charge
- `getPaymentsByCode` — find payments by code
- `getClaimStatus` — claim status by visit + carrier
- `getVisits` — list visits per patient

### Insurance (3 ops)
- `getCarriers` — list insurance carriers (filter by name + exactmatch)
- `getFinancialClasses` — financial-class master list
- `createInsurance` — attach an insurance plan to a patient

### Referrals (3 ops)
- `addInboundReferral` — create inbound referral with authorization details
- `getReferringProviders` — list referring providers
- `getReferralStatuses` — list valid statuses

### Codes (4 ops)
- `getDiagnosisCodes` — ICD-10/9 code lookup (filter by code)
- `getProcedureCodes` — CPT/HCPCS lookup (filter by code)
- `getModifierCodes` — modifier code lookup
- `getNoteTemplates` — list note templates

### Providers (1 op)
- `getProviders` — list providers (returns ID, name)

### Intake (2 ops)
- `getIntakeRecords` — list intake records by date range + status (confirmed/declined)
- `createIntakeRecord` — register an intake (web form submission)

### Sync / Delta (3 ops — re-listing the delta-capable ops for discoverability)

The first two also appear under **Patients** above; this grouping is the recipe for incremental sync.

- `getNewAndModifiedPatients` — patients modified after a date (also in Patients group)
- `getNewAndModifiedPatientNotes` — notes modified after a date for a template (also in Patients group)
- `getNewAndModifiedVisits` — visits modified after a date

## ID Prefix Convention

AMD entity IDs in the Connect API responses are **prefixed**:

| Prefix | Entity | Example |
|--------|--------|---------|
| `pat` | Patient | `pat1234` |
| `prov` | Provider | `prov4567` |
| `rprov` | Referring Provider | `rprov12` |
| `mprov` | Provider profile | `mprov1234` |
| `prof` | Profile | `prof890` |
| `col` | Scheduler column | `col42` |
| `fac` | Facility | `fac3` |
| `car` | Carrier | `car199` |
| `pcode` | Procedure code | `pcode4501` |
| `dcode` | Diagnosis code | `dcode2310` |
| `ap_type` | Appointment type | `ap_type15` |
| `ap_instr` | Appointment instruction | `ap_instr3` |
| `stat` | Referral status | `stat2` |
| `note` | Note type | `note1234` |

When passing IDs back to AMD as integers (e.g., in newer REST endpoints), **strip the prefix** and convert to int. When passing as strings, include the prefix.

## Sex / Title / Relationship Enums

| Field | Values |
|-------|--------|
| `sex` | `M`, `F`, `U` |
| `title` | `MR`, `MRS`, `MS`, `MISS`, `DR`, `JR`, `SR`, `II`, `I` |
| `intakeRecordStatus` | `1653` (new), `1654` (approved), `1655` (declined) |
| `paySource` | `1` (Patient), `2` (Insurance) |
| `recurrence.type` | enum from `getRecurrenceType` (system master) |

## Date / Time Formats

- Dates: `MM/DD/YYYY` (e.g., `02/01/2026`) on most fields
- ISO datetimes: `YYYY-MM-DDTHH:MM:SS` (e.g., `2023-07-27T08:00:00`) on appointment fields
- ISO timestamps with TZ: `2021-08-19T13:43:16.904Z` on intake `submittedDate`

**Quirk**: AMD inconsistently uses `MM/DD/YYYY` for `dob` and ISO for `startdatetime`. Check each operation.

## Pagination

- `getPatients` accepts `maxItems` (default 500)
- Most list ops have no explicit pagination — AMD returns the full set
- For delta sync, use `datechanged` (date string, format varies — see per-op)

## Soft Constraints

- **Duplicate detection**: `createPatient` checks Name+DOB, SSN, Chart#. Pass `force: true` to bypass.
- **Chart auto-assign**: `createPatient` accepts `chart: "AUTO"` to let AMD assign a chart number.
- **Force flag**: many write ops accept a `force` boolean to override safety checks. Use sparingly.
- **`hipaarelationship` depends on `relationship`**: dynamic enum — fetch the valid list with `getHippaRelationships` after picking a relationship.

## Practical Recipe — Book an Appointment

1. `getProviders` → pick a provider, note the profile ID
2. `getSchedulerSetupColumns` → pick a column
3. `getAppointmentTypes` → pick a type
4. `getAppointmentInstructions` → pick instructions (optional, array)
5. `getOpenings` with column ID, days-of-week, duration, time range → find slots
6. `findPatient` or `createPatient` → get patient ID
7. `createAppointment` with `patientid`, `columnid`, `startdatetime`, `duration`, `profileid`, `type` (array)

## Practical Recipe — Bill a Visit

1. `getVisits` for the patient → identify the visit
2. `getProcedureCodes` → pick CPT
3. `getDiagnosisCodes` → pick ICD-10
4. `getModifierCodes` → optional modifiers
5. `createCharge` with `patient_id`, `visit_id`, `facility_id`, `charges: [{ proccode, diagcodes, modcodes, units }]`
6. (Optional) `applyPaymentToCharge` for a copay or up-front payment

## Practical Recipe — Delta Sync to Your DB

Run on a cron (e.g., every 5 minutes), tracking the last-seen timestamp per stream:

```
patients     → getNewAndModifiedPatients(datechanged=lastSync)
visits       → getNewAndModifiedVisits(datechanged=lastSync)
notes        → getNewAndModifiedPatientNotes(templateId=X, datechanged=lastSync)
```

## Limitations vs FHIR

- Connect API is **non-standard** — no FHIR resource shape parity. Patient is a flat record, not a FHIR `Patient` with `name[]`, `identifier[]`, etc.
- No webhooks. Use delta-sync polling.
- No bulk export equivalent. Export by repeated paged calls.
- Schemas vary by deployment — fields you see in sandbox may not exist for all clients.

## See Also

- Full enumerated operation list with parameter shapes: `data/pm-operations.json`
- ID prefix decoder reference: this doc above
- Errors and envelope shapes: `references/errors.md`
- Worked examples: `references/examples.md`
