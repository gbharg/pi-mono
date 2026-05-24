# AdvancedMD — Entity Schemas

The shape of the common entities exchanged across the three APIs. FHIR resources follow the standard US Core 6.1.0 profile; Connect API entities follow AMD's proprietary flat-XML model.

## FHIR Resources — US Core 6.1.0 (Single + Bulk)

The 22 USCDI v3 resources AMD exposes. Each links to the US Core profile that AMD claims conformance to.

| Resource | US Core Profile | Required Search Params |
|----------|-----------------|------------------------|
| `Patient` | https://hl7.org/fhir/us/core/STU6.1/StructureDefinition-us-core-patient | `_id`, `identifier`, `name`, `birthdate`, `gender` |
| `Practitioner` | us-core-practitioner | `_id`, `name`, `identifier` |
| `Organization` | us-core-organization | `_id`, `name`, `identifier` |
| `Location` | us-core-location | `_id`, `name`, `address` |
| `Encounter` | us-core-encounter | `_id`, `patient`, `date`, `class`, `status`, `type` |
| `Condition` | us-core-condition-encounter-diagnosis, us-core-condition-problems-health-concerns | `_id`, `patient`, `category`, `clinical-status` |
| `Procedure` | us-core-procedure | `_id`, `patient`, `date`, `status` |
| `Observation` | us-core-observation-lab, us-core-vital-signs (sub-profiles per VS) | `_id`, `patient`, `category`, `code`, `date` |
| `DiagnosticReport` | us-core-diagnosticreport-lab, us-core-diagnosticreport-note | `_id`, `patient`, `category`, `code`, `date`, `status` |
| `MedicationRequest` | us-core-medicationrequest | `_id`, `patient`, `intent`, `status` |
| `MedicationDispense` | us-core-medicationdispense | `_id`, `patient`, `status` |
| `Immunization` | us-core-immunization | `_id`, `patient`, `date` |
| `AllergyIntolerance` | us-core-allergyintolerance | `_id`, `patient`, `clinical-status` |
| `CarePlan` | us-core-careplan | `_id`, `patient`, `category`, `status`, `date` |
| `CareTeam` | us-core-careteam | `_id`, `patient`, `status` |
| `Coverage` | us-core-coverage | `_id`, `patient`, `status` |
| `Goal` | us-core-goal | `_id`, `patient`, `lifecycle-status` |
| `Device` | us-core-implantable-device | `_id`, `patient`, `type` |
| `DocumentReference` | us-core-documentreference | `_id`, `patient`, `category`, `type`, `period`, `status` |
| `Provenance` | us-core-provenance | `_id`, `target` |
| `RelatedPerson` | us-core-relatedperson | `_id`, `patient`, `name` |
| `ServiceRequest` | us-core-servicerequest | `_id`, `patient`, `status`, `category` (scopes only in 6.1.0 — verify metadata) |
| `Specimen` | us-core-specimen | (scopes only in 6.1.0 — verify metadata) |

### Minimum required fields per US Core 6.1.0

Each profile has "Must Support" elements. AMD enforces these on read responses:

- **Patient**: `identifier`, `name`, `gender`, `birthDate`, `address`, `telecom`, `communication`, `extension[race]`, `extension[ethnicity]`, `extension[birthsex]`
- **Encounter**: `status`, `class`, `type`, `subject`, `participant`, `period`, `location`
- **Condition**: `clinicalStatus`, `verificationStatus`, `category`, `code`, `subject`, `recordedDate`
- **Observation (Lab)**: `status`, `category=laboratory`, `code`, `subject`, `effective[x]`, `value[x]` or `dataAbsentReason`
- **MedicationRequest**: `status`, `intent`, `medication[x]`, `subject`, `authoredOn`, `requester`
- **DocumentReference**: `status`, `type`, `category`, `subject`, `date`, `content.attachment`

See https://hl7.org/fhir/us/core/STU6.1/profiles.html for the full Must-Support matrix.

## Connect API — Patient

AMD's flat patient record (XML; field set varies slightly by `getpatient` vs `findpatient`).

```xml
<patientinfo
  id="pat1234"
  chart="ABC123"
  first="John"
  middle="Q"
  last="Doe"
  title="MR"
  suffix="Jr"
  dob="01/15/1980"
  sex="M"
  ssn="123-45-6789"
  email="john@example.com"
  phone1="2145551212"
  phone1type="HOME"
  phone2="2145551313"
  phone2type="CELL"
  addr1="123 Main St"
  addr2="Suite 4"
  city="Dallas"
  state="TX"
  zip="75201"
  country="US"
  language="EN"
  ethnicity="HISP"
  race="WHITE"
  maritalstatus="M"
  preferredfacility="fac1"
  primaryprov="prov4567"
  refsource="WEB"
  responsibleparty="self"
  responsiblepartyid="pat1234"
  active="true"
  inactivereason=""
  patiencreatedt="2024-01-01"
  comm_prefs="EMAIL,SMS"
/>
```

Many of these fields are `null` on minimal records — only `first`, `last`, `dob`, `chart` are guaranteed.

## Connect API — Appointment

```xml
<appointment
  id="apt12345"
  patientid="pat1234"
  columnid="col42"
  facilityid="fac1"
  profileid="mprov1234"
  type="ap_type15"
  startdatetime="2026-06-15T14:00:00"
  duration="30"
  status="SCHEDULED"
  reason="Annual Physical"
  notes="Prefers Dr. Smith"
  confirmed="true"
  checkin=""
  checkout=""
  noshow="false"
  cancelreason=""
  createddt="2026-05-23T10:30:00"
  modifieddt="2026-05-23T10:30:00"
/>
```

`status` enum: `SCHEDULED, CHECKEDIN, COMPLETED, NOSHOW, CANCELLED`.

## Connect API — Charge

```xml
<charge
  id="chg99999"
  patientid="pat1234"
  visitid="visit5678"
  facilityid="fac1"
  providerid="prov4567"
  proccode="99213"
  diagcodes="J45.40,I10"
  modcodes="25"
  units="1"
  amount="125.00"
  servicedate="2026-05-23"
  postdate="2026-05-23"
  status="UNBILLED"
  paymentplan=""
  insurance="INS1,INS2"
  responsibleparty="pat1234"
/>
```

## Connect API — Insurance

```xml
<insurance
  id="ins777"
  patientid="pat1234"
  carrierid="car199"
  carriername="Blue Cross Blue Shield"
  groupid="GRP123"
  memberid="MEMBER456"
  effectivedate="2026-01-01"
  termdate=""
  copay="20.00"
  deductible="1500.00"
  priority="PRIMARY"
  financialclass="01"
  active="true"
  relationshiptoinsured="self"
  insuredfirst="John"
  insuredlast="Doe"
  insureddob="01/15/1980"
/>
```

`priority` enum: `PRIMARY, SECONDARY, TERTIARY`.
`relationshiptoinsured` enum: `self, spouse, child, parent, other`. Use `getHippaRelationships` for HIPAA-specific subtypes.

## Connect API — Provider

```xml
<provider
  id="prov4567"
  first="Sarah"
  middle="L"
  last="Smith"
  title="DR"
  suffix="MD"
  npi="1234567890"
  taxid="12-3456789"
  specialty="Internal Medicine"
  active="true"
  defaultfacility="fac1"
  username="ssmith"
/>
```

Note: NPI is in the response for licensed providers only.

## Connect API — Visit (lightweight)

```xml
<visit
  id="visit5678"
  patientid="pat1234"
  providerid="prov4567"
  facilityid="fac1"
  visitdate="2026-05-23"
  visittype="OFFICE"
  status="COMPLETED"
  copay="20.00"
  copaycollected="true"
  reason="Annual Physical"
  appointmentid="apt12345"
/>
```

A "visit" is the billing unit. A visit can contain multiple charges and link back to one appointment.

## Connect API — Patient Note

```xml
<patientnote
  id="note98765"
  patientid="pat1234"
  providerid="prov4567"
  visitid="visit5678"
  templatename="SOAP-Followup"
  notetypeid="note1234"
  body="Patient presents with..."
  createddt="2026-05-23T11:30:00"
  modifieddt="2026-05-23T11:35:00"
  signedby="prov4567"
  signeddt="2026-05-23T11:35:00"
  locked="true"
/>
```

`locked=true` means the note is finalized (signed) and cannot be edited.

## Common enums

### Sex / Gender
| Connect | FHIR |
|---------|------|
| `M` | `male` |
| `F` | `female` |
| `U` | `unknown` |

FHIR's `gender` doesn't include `O` (other); AMD's Connect API doesn't either. Non-binary identity goes in `extension[birthsex]` or `extension[genderidentity]` (US Core 7.x, future).

### Title
`MR, MRS, MS, MISS, DR, JR, SR, II, I`

### Marital status (Connect)
`S` (single), `M` (married), `D` (divorced), `W` (widowed), `P` (separated), `U` (unknown).

### Insurance priority
`PRIMARY, SECONDARY, TERTIARY` (Connect).

### Appointment statuses
| Stage | Status |
|-------|--------|
| Booked | `SCHEDULED` |
| Patient arrived | `CHECKEDIN` |
| Visit complete | `COMPLETED` |
| Patient didn't show | `NOSHOW` |
| Cancelled (with reason) | `CANCELLED` |

### Charge statuses
`UNBILLED, BILLED, REJECTED, PAID, ADJUSTED, WRITTENOFF`.

### Intake record status (Connect)
- `1653` New
- `1654` Approved
- `1655` Declined

### `paysource`
- `1` Patient
- `2` Insurance

## ID prefix reference (Connect)

| Prefix | Entity | Example |
|--------|--------|---------|
| `pat` | Patient | `pat1234` |
| `prov` | Provider | `prov4567` |
| `rprov` | Referring Provider | `rprov12` |
| `mprov` | Provider Profile (master) | `mprov1234` |
| `prof` | Profile | `prof890` |
| `col` | Scheduler Column | `col42` |
| `fac` | Facility | `fac1` |
| `car` | Insurance Carrier | `car199` |
| `pcode` | Procedure Code | `pcode4501` |
| `dcode` | Diagnosis Code | `dcode2310` |
| `ap_type` | Appointment Type | `ap_type15` |
| `ap_instr` | Appointment Instruction | `ap_instr3` |
| `stat` | Referral Status | `stat2` |
| `note` | Note Type | `note1234` |
| `chg` | Charge | `chg99999` |
| `ins` | Insurance | `ins777` |
| `visit` | Visit | `visit5678` |
| `apt` | Appointment | `apt12345` |

## See Also

- Full Connect API operation surface: `references/connect-api.md`
- FHIR resource endpoint patterns: `references/fhir-single-api.md`
- US Core 6.1.0 profiles: https://hl7.org/fhir/us/core/STU6.1/
