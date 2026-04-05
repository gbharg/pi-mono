# AdvancedMD API Documentation — Authoritative Endpoint Catalog

> **215 endpoint pages** parsed from AMD's official documentation site.
> Generated: 2026-04-05 10:39 UTC
> Source: `https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/`
> Raw HTML preserved in `./amd-api-docs/raw/`, structured data in `./api_documentation.json`.

**This file is Gautam's 'step 1' deliverable — documented endpoints saved BEFORE analysis.** Every endpoint below links to the exact AMD help page that documents it.

## Table of Contents

- [Visits/Appointments](#visitsappointments) — 23 endpoints
- [Scheduler](#scheduler) — 2 endpoints
- [Patients](#patients) — 34 endpoints
- [Patient Portal / Intake](#patient-portal--intake) — 6 endpoints
- [Charges/Billing](#chargesbilling) — 14 endpoints
- [Insurance/Eligibility](#insuranceeligibility) — 3 endpoints
- [Claims](#claims) — 3 endpoints
- [EHR (Chart)](#ehr-chart) — 34 endpoints
- [Providers](#providers) — 9 endpoints
- [Referrals](#referrals) — 5 endpoints
- [Telehealth](#telehealth) — 3 endpoints
- [Labs](#labs) — 1 endpoints
- [Documents](#documents) — 17 endpoints
- [Lookup Actions](#lookup-actions) — 11 endpoints
- [Custom Tabs](#custom-tabs) — 2 endpoints
- [Audit](#audit) — 1 endpoints
- [Reference: Auth/URL](#reference-authurl) — 5 endpoints
- [Reference: Field Lists](#reference-field-lists) — 1 endpoints
- [Reference: Hard-coded Values](#reference-hard-coded-values) — 1 endpoints
- [Reference: Error Codes](#reference-error-codes) — 1 endpoints
- [Reference: Algorithms](#reference-algorithms) — 1 endpoints
- [Reference: What's New](#reference-what's-new) — 1 endpoints
- [Other](#other) — 37 endpoints

## Transport legend

| Transport | Meaning |
|---|---|
| `ppmdmsg-xmlrpc` | Legacy AMD XML envelope. POST to `pm-api-{shard}.advancedmd.com/processrequest.aspx` with `<ppmdmsg action="<action>" ...>` body. Still the primary API for most actions. |
| `rest` | Modern REST endpoint, typically under `/api/` or `/connect/v1/`. |
| `reference` | Reference/conceptual page without a single action (e.g. 'Cancel Appointment' overview). Treated as documentation context. |

## Endpoints by Category

### Visits/Appointments

| # | Title | Action | Transport | Tables | Code | Source |
|---:|---|---|---|---:|---:|---|
| 1 | Add Patient Notes by Visit | `addehrnotebyvisit` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/addehrnotebyvisit.htm) |
| 2 | Add Visit for a Patient | `addvisit` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/addvisit.htm) |
| 3 | Auto Assign Forms to Appointment | `autoassignforms` | `ppmdmsg-xmlrpc` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Auto%20Assign%20Forms.htm) |
| 4 | Book Appointment | `—` | `reference` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/newappointment.htm) |
| 5 | Cancel Appointment | `—` | `reference` | 2 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Cancel%20Appointment.htm) |
| 6 | Confirm Appointment Not Booked | `update` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Confirm%20Appointment%20Not%20Booked.htm) |
| 7 | Delete Appointment Reason | `delete` | `ppmdmsg-xmlrpc` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Delete%20Appointment%20Reason.htm) |
| 8 | Get a List of Fields Available to \"getupdatedvisits\" | `getupdatedvisitstemplate` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getupdatedvisitstemplate.htm) |
| 9 | Get All Appointment Reasons by Provider ID | `—` | `reference` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Get%20All%20Appointment%20Reasons%20by%20Provider%20ID.htm) |
| 10 | Get Appointment Types | `getappttypes` | `ppmdmsg-xmlrpc` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getappttypes.htm) |
| 11 | Get Appointments | `—` | `reference` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Get%20Appointments.htm) |
| 12 | Get New and Modified Visits | `getupdatedvisits` | `ppmdmsg-xmlrpc` | 0 | 16 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getupdatedvisits.htm) |
| 13 | Get Patient Notes by Visit | `getehrnotesbyvisit` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getehrnotesbyvisit.htm) |
| 14 | Get Recall Visits | `getreminderrecallvisits` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getreminderrecallvisits.htm) |
| 15 | Get Reminder Appointments | `getreminderappts` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getreminderappts.htm) |
| 16 | Get Visit ID by Reference ID | `getvisitidbyrefid` | `ppmdmsg-xmlrpc` | 0 | 10 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Get%20Visit%20ID%20by%20Reference%20ID.htm) |
| 17 | Get Visits By ID | `getvisitsbyid` | `ppmdmsg-xmlrpc` | 0 | 14 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Get%20Visits%20By%20ID.htm) |
| 18 | Get Visits for a Specific Date | `getdatevisits` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getdatevisits.htm) |
| 19 | Get Visits for a Specific Patient | `getpatientvisits` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getpatientvisits.htm) |
| 20 | Save Appointment Reason | `add` | `ppmdmsg-xmlrpc` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Save%20Appointment%20Reason.htm) |
| 21 | Update Appointment Reason | `update` | `ppmdmsg-xmlrpc` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Update%20Appointment%20Reason.htm) |
| 22 | Update Appointment Reasons For Provider Type | `update` | `ppmdmsg-xmlrpc` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Update%20Appointment%20Reasons%20For%20Provider%20Type.htm) |
| 23 | Update Visit With New Charges | `updvisitwithnewcharges` | `ppmdmsg-xmlrpc` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/updvisitwithnewcharges.htm) |

### Scheduler

| # | Title | Action | Transport | Tables | Code | Source |
|---:|---|---|---|---:|---:|---|
| 1 | Get Scheduler Setup | `getschedulersetup` | `ppmdmsg-xmlrpc` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Get%20Scheduler%20Setup.htm) |
| 2 | Scheduler Block and Hold Actions | `—` | `reference` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Scheduler%20Block%20and%20Hold%20Actions.htm) |

### Patients

| # | Title | Action | Transport | Tables | Code | Source |
|---:|---|---|---|---:|---:|---|
| 1 | Add a Patient | `addpatient` | `ppmdmsg-xmlrpc` | 1 | 6 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/addpatient.htm) |
| 2 | Add a Patient Note | `addehrnote` | `ppmdmsg-xmlrpc` | 0 | 28 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/addehrnote.htm) |
| 3 | Add Patient Allergy | `Add` | `ppmdmsg-xmlrpc` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Add%20Patient%20Allergy.htm) |
| 4 | Add Patient Notes | `savepatientnotes` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/savepatientnotes.htm) |
| 5 | Decline All Intake Records by Patient ID | `—` | `reference` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/intake-declineallbyid.htm) |
| 6 | Get a List of Fields Available to \"getupdatedpatients\" | `getupdatedpatientstemplate` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getupdatedpatientstemplate.htm) |
| 7 | Get Custom Patient Data | `getcustomdata` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getcustomdata.htm) |
| 8 | Get Encounters (/encounters/Encounters?PatientId={id}) | `—` | `reference` | 0 | 6 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Get%20Encounters.htm) |
| 9 | Get List of Documents (files/documents?PatientId={id}) | `—` | `reference` | 0 | 6 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Get%20List%20of%20Documents.htm) |
| 10 | Get List of Patient Portal Accounts | `getfamilymembers` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Get%20List%20of%20Patient%20Portal%20Accounts.htm) |
| 11 | Get New and Modified Patient Notes | `getehrupdatednotes` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getehrupdatednotes.htm) |
| 12 | Get New and Modified Patients | `getupdatedpatients` | `ppmdmsg-xmlrpc` | 0 | 16 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getupdatedpatients.htm) |
| 13 | Get Patient Birthday Reminders | `getreminderpatientbirthdays` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getreminderpatientbirthdays.htm) |
| 14 | Get Patient Demographic Info - class=\"demographics\" | `getdemographic` | `ppmdmsg-xmlrpc` | 1 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getdemographic-demographics.htm) |
| 15 | Get Patient Financial History | `gettxhistory` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/gettxhistory.htm) |
| 16 | Get Patient Pharmacy | `—` | `reference` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getpatientpharmacy.htm) |
| 17 | Get Patient Portal Account | `getaccount` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Get%20Patient%20Portal%20Account.htm) |
| 18 | Get Patient Preferences | `—` | `reference` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Get%20Patient%20Preferences.htm) |
| 19 | Get Patient Transaction History Details | `gettxhistory` | `ppmdmsg-xmlrpc` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Get%20Patient%20Transaction%20History%20Details.htm) |
| 20 | Get the List of Filters Available to \"getupdatedpatients\" | `getfieldsets` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getfieldsets.htm) |
| 21 | Look Up Patient | `lookuppatient` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Look%20Up%20Patient.htm) |
| 22 | Lookup Patient Portal Account | `lookuppatientportalaccount` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Lookup%20Patient%20Portal%20Account.htm) |
| 23 | Patient Portal Account | `lookuppatientportalaccount` | `ppmdmsg-xmlrpc` | 0 | 12 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Patient%20Portal%20Account.htm) |
| 24 | Save Patient Portal Account | `saveaccount` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Save%20Patient%20Portal%20Account.htm) |
| 25 | Save Patient\u0027s Preferred Pharmacy | `savepatientpharmacy` | `ppmdmsg-xmlrpc` | 0 | 6 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/savepatientpharmacy.htm) |
| 26 | Searching for a Patient, Responsible Party, or Master File | `Item` | `ppmdmsg-xmlrpc` | 1 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Search%20Patient%20Resp%20Party%20or%20Master%20File.htm) |
| 27 | Select Patient Notes | `selectpatientnotes` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/selectpatientnotes.htm) |
| 28 | Send Patient Portal Account Invite | `sendinvitation` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Send%20Patient%20Portal%20Account%20Invite.htm) |
| 29 | Update a Patient | `updatepatient` | `ppmdmsg-xmlrpc` | 1 | 10 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/updatepatient.htm) |
| 30 | Update a Patient Note | `updateehrnote` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/updateehrnotes.htm) |
| 31 | Update and Get Patient Consent Status | `—` | `reference` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Update%20and%20Get%20Patient%20Consent%20Status.htm) |
| 32 | Update Patient Preferences | `—` | `reference` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Update%20Patient%20Preferences.htm) |
| 33 | Upload Files to the Patient Chart Files | `uploadfile` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Uploading%20Files%20to%20Chart.htm) |
| 34 | Uploading Files to the Patient Chart Files | `uploadfile` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Uploading%20Files%20to%20the%20Patient%20Chart%20Files.htm) |

### Patient Portal / Intake

| # | Title | Action | Transport | Tables | Code | Source |
|---:|---|---|---|---:|---:|---|
| 1 | Create Intake Record | `Create` | `ppmdmsg-xmlrpc` | 0 | 6 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/intake-createrecord-post.htm) |
| 2 | Create Intake Record | `Changes` | `ppmdmsg-xmlrpc` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/intake-createrecord-put.htm) |
| 3 | Get Paged Intake Records | `Get` | `ppmdmsg-xmlrpc` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/intake-getpaged.htm) |
| 4 | Settings for Online Intake Requests | `Required` | `ppmdmsg-xmlrpc` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/intake-setup.htm) |
| 5 | Update Intake Record | `Update` | `ppmdmsg-xmlrpc` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/intake-updaterecord.htm) |
| 6 | Update Status of Intake Record | `Changes` | `ppmdmsg-xmlrpc` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Update%20Status%20of%20Intake%20Record.htm) |

### Charges/Billing

| # | Title | Action | Transport | Tables | Code | Source |
|---:|---|---|---|---:|---:|---|
| 1 | Add a Payment | `addpayments` | `ppmdmsg-xmlrpc` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/addpayments.htm) |
| 2 | Add Payment Plan | `updatepaymentplan` | `ppmdmsg-xmlrpc` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Add%20Payment%20Plan.htm) |
| 3 | Add Write Offs | `addwriteoffs` | `ppmdmsg-xmlrpc` | 1 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Add%20Write%20Offs.htm) |
| 4 | Charge Detail | `getchargedetaildataicd10` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getchargedetaildata.htm) |
| 5 | Charge Rebill | `ID` | `ppmdmsg-xmlrpc` | 3 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Charge%20Rebill.htm) |
| 6 | Create or Update Responsible Party Payment Plan | `updatepaymentplan` | `ppmdmsg-xmlrpc` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Create%20and%20Update%20Responsible%20Party%20Payment%20Plan.htm) |
| 7 | Get Responsible Party Payment Plan | `getpaymentplan` | `ppmdmsg-xmlrpc` | 0 | 6 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Get%20Responsible%20Party%20Payment%20Plan.htm) |
| 8 | Payment Checks | `Create` | `ppmdmsg-xmlrpc` | 0 | 14 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Payment%20Checks.htm) |
| 9 | Payment Codes | `Create` | `ppmdmsg-xmlrpc` | 0 | 12 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Payment%20Codes.htm) |
| 10 | Payment Notes | `Create` | `ppmdmsg-xmlrpc` | 0 | 16 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Payment%20Notes.htm) |
| 11 | Payment Processing Accounts | `Create` | `ppmdmsg-xmlrpc` | 0 | 12 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Payment%20Processing%20Accounts.htm) |
| 12 | Payment Reasons | `—` | `reference` | 0 | 10 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Payment%20Reasons.htm) |
| 13 | Payments | `—` | `reference` | 0 | 16 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Payments.htm) |
| 14 | Save a Charge | `savecharges` | `ppmdmsg-xmlrpc` | 1 | 20 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/savecharges.htm) |

### Insurance/Eligibility

| # | Title | Action | Transport | Tables | Code | Source |
|---:|---|---|---|---:|---:|---|
| 1 | Add and Update Insurance Coverages | `addinsurance` | `ppmdmsg-xmlrpc` | 1 | 12 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Adding%20and%20Updating%20Insurance%20Coverages.htm) |
| 2 | Add Insurance Image | `uploadfile` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Add%20Insurance%20Image.htm) |
| 3 | Eligibilty | `submitdemandrequest` | `ppmdmsg-xmlrpc` | 1 | 22 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Eligibilty.htm) |

### Claims

| # | Title | Action | Transport | Tables | Code | Source |
|---:|---|---|---|---:|---:|---|
| 1 | Get Claim Status | `request` | `ppmdmsg-xmlrpc` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Get%20Claim%20Status.htm) |
| 2 | Get Claims Report | `Class` | `ppmdmsg-xmlrpc` | 2 | 6 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getclaimsreport.htm) |
| 3 | Select Custom Claim Fields | `selectcustomclaimfields` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/selectcustomclaimfields.htm) |

### EHR (Chart)

| # | Title | Action | Transport | Tables | Code | Source |
|---:|---|---|---|---:|---:|---|
| 1 | Add a Problem | `addehrproblem` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/addehrproblem.htm) |
| 2 | Add Health Watcher Plans | `addehrhwplans` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/addehrhwplans.htm) |
| 3 | Add Notes Type | `savenotetypes` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/savenotetypes.htm) |
| 4 | AdvancedMD EHR APIs | `—` | `rest` | 3 | 0 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/EHR%20APIs.htm) |
| 5 | C-CDA EHR Actions | `getehrccdadocument` | `ppmdmsg-xmlrpc` | 0 | 16 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/C-CDA%20EHR%20Actions.htm) |
| 6 | C-CDA getehrccdadata | `getehrccdadata` | `ppmdmsg-xmlrpc` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getehrccdadata.htm) |
| 7 | C-CDA getehrccdadocument | `getehrccdadocument` | `ppmdmsg-xmlrpc` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getehrccdadocument.htm) |
| 8 | C-CDA saveehrccdadata | `saveehrccdadata` | `ppmdmsg-xmlrpc` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/saveehrccdadata.htm) |
| 9 | C-CDA saveehrccdadocument | `saveehrccdadocument` | `ppmdmsg-xmlrpc` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/saveehrccdadocument.htm) |
| 10 | Documentation Notes | `—` | `reference` | 0 | 0 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Documentation%20Notes.htm) |
| 11 | File Chart XML Message Specification | `—` | `reference` | 1 | 0 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/file%20chart%20introduction.htm) |
| 12 | Get a List of Fields Available to \"getehrimmunizations\" | `getehrimmunizationstemplate` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getehrimmunizationstemplate.htm) |
| 13 | Get a List of Fields Available to \"getehrlabresults\" | `getehrlabresultstemplate` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getehrlabresultstemplate.htm) |
| 14 | Get a List of Fields Available to \"getehrmedications\" | `getehrmedicationstemplate` | `ppmdmsg-xmlrpc` | 0 | 7 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getehrmedicationstemplate.htm) |
| 15 | Get a List of Fields Available to \"getehrnotes\" | `getehrnotestemplate` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getehrnotestemplate02.htm) |
| 16 | Get a List of Fields Available to \"getehrproblems\" | `getehrproblemstemplate` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getehrproblemstemplate.htm) |
| 17 | Get a List of Fields Available to \"getehrtemplates\" | `getehrtemplatestemplate` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getehrtemplatestemplates.htm) |
| 18 | Get a Problem List | `getehrproblems` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getehrproblems.htm) |
| 19 | Get an Allergies List | `getehrallergies` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getehrallergies.htm) |
| 20 | Get Clinical Note by Id (clinicalnotes/notes/{id}) | `—` | `reference` | 0 | 6 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Get%20Clinical%20Note%20by%20ID.htm) |
| 21 | Get Clinical Note Header by Id (clinicalnotes/noteheaders?noteid={id}) | `—` | `reference` | 0 | 6 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Get%20Clinical%20Note%20Header%20by%20Id.htm) |
| 22 | Get EHR Note Templates | `getehrnotestemplate` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getehrnotestemplate.htm) |
| 23 | Get EHR Templates | `getehrtemplates` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getehrtemplates.htm) |
| 24 | Get Health Watcher Plans | `getehrhwplans` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getehrhwplans.htm) |
| 25 | Get Health Watcher Plans Template | `getehrhwplanstemplate` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getehrhwplanstemplate.htm) |
| 26 | Get Immunizations | `getehrimmunizations` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getehrimmunizations.htm) |
| 27 | Get Lab Results | `getehrlabresults` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getehrlabresults.htm) |
| 28 | Get List of Clinical Notes (clinicalnotes/notes) | `—` | `reference` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Get%20List%20of%20Clinical%20Notes.htm) |
| 29 | Get Medications | `getehrmedications` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getehrmedications.htm) |
| 30 | Get Profiles | `getehrprofiles` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getehrprofiles.htm) |
| 31 | Get Updated EHR Lab Results | `getupdatedehrlabresults` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Get%20Updated%20EHR%20Lab%20Results.htm) |
| 32 | Update a Problem | `updateehrproblem` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/updateehrproblem.htm) |
| 33 | Update Health Watcher Plans | `updateehrhwplans` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/updateehrhwplans.htm) |
| 34 | Upload Files EHR | `—` | `reference` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Upload%20Files%20EHR.htm) |

### Providers

| # | Title | Action | Transport | Tables | Code | Source |
|---:|---|---|---|---:|---:|---|
| 1 | Add New Referring Provider | `addrefprovider` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/addreferringprovider.htm) |
| 2 | Get a List of Fields Available to \"getupdatedproviders\" | `getupdatedproviderstemplate` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getupdatedproviderstemplate.htm) |
| 3 | Get New and Modified Providers | `getupdatedproviders` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getupdatedproviders.htm) |
| 4 | Get New and Modified Referring Providers | `getupdatedreferringproviders` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getupdatedreferringproviders.htm) |
| 5 | Get Provider Types for Intake Provider Setup | `get` | `ppmdmsg-xmlrpc` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Get%20Provider%20Types%20for%20Intake%20Provider%20Setup.htm) |
| 6 | Look Up Provider | `lookupprovider` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/lookupprovider.htm) |
| 7 | Look Up Referring Provider | `lookuprefprovider` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/lookuprefprovider.htm) |
| 8 | Save Referring Providers | `saverefprovider` | `ppmdmsg-xmlrpc` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Save%20Referring%20Providers.htm) |
| 9 | Update Referring Provider | `updaterefprovider` | `ppmdmsg-xmlrpc` | 2 | 24 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/updaterefprovider.htm) |

### Referrals

| # | Title | Action | Transport | Tables | Code | Source |
|---:|---|---|---|---:|---:|---|
| 1 | Add Inbound Referral | `—` | `reference` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Add%20Inbound%20Referral.htm) |
| 2 | Add Marketing Referral (Save).htm | `addreferral` | `ppmdmsg-xmlrpc` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Add%20Marketing%20Referral%20(Save).htm) |
| 3 | Look Up Referral Source | `lookupmarsource` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/lookupmarsource.htm) |
| 4 | Look Up Referral Status | `lookupmarstatus` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/lookupmarstatus.htm) |
| 5 | Update Marketing Referral (Save) | `updatereferral` | `ppmdmsg-xmlrpc` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Update%20Marketing%20Referral%20(Save).htm) |

### Telehealth

| # | Title | Action | Transport | Tables | Code | Source |
|---:|---|---|---|---:|---:|---|
| 1 | Create Telehealth Block/Hold | `—` | `reference` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Create%20External%20Block.htm) |
| 2 | Delete Telehealth Block/Hold | `—` | `reference` | 0 | 0 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Delete%20External%20Block.htm) |
| 3 | Get Telehealth Block/Hold | `—` | `reference` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Get%20External%20Block.htm) |

### Labs

| # | Title | Action | Transport | Tables | Code | Source |
|---:|---|---|---|---:|---:|---|
| 1 | AdvancedMD Labs API | `login` | `ppmdmsg-xmlrpc` | 29 | 26 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Labs%20API.htm) |

### Documents

| # | Title | Action | Transport | Tables | Code | Source |
|---:|---|---|---|---:|---:|---|
| 1 | API Documentation | `—` | `reference` | 0 | 0 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Introduction.htm) |
| 2 | Copyfile Message Specification | `Message` | `ppmdmsg-xmlrpc` | 2 | 3 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/copyfile.htm) |
| 3 | Deletefile Message Specification | `Message` | `ppmdmsg-xmlrpc` | 6 | 9 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/deletefile.htm) |
| 4 | DocumentPostRequest | `—` | `reference` | 1 | 16 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/DocumentPostRequest.htm) |
| 5 | DocumentPostResponse | `—` | `reference` | 1 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/DocumentPostResponse.htm) |
| 6 | Get Clinician Profile Picture | `—` | `rest` | 0 | 18 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Get%20Clinician%20Profile%20Picture.htm) |
| 7 | Get Document by Id (files/documents/{id}) | `—` | `reference` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Get%20Document%20by%20Id.htm) |
| 8 | Getfile Message Specification | `Message` | `ppmdmsg-xmlrpc` | 6 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getfile.htm) |
| 9 | Getfilelist Message Specification | `Message` | `ppmdmsg-xmlrpc` | 14 | 16 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getfilelist.htm) |
| 10 | POST /files/documents | `—` | `rest` | 3 | 20 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/POST%20Paths.htm) |
| 11 | Revisefile Message Specification | `Message` | `ppmdmsg-xmlrpc` | 12 | 14 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/revisefile.htm) |
| 12 | Select User File Templates | `selectuserfiletemplates` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/selectuserfiletemplates.htm) |
| 13 | Updatefile Message Specification | `Message` | `ppmdmsg-xmlrpc` | 12 | 14 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/updatefile.htm) |
| 14 | Updatefilestatus Message Specification | `Message` | `ppmdmsg-xmlrpc` | 6 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/updatefilestatus.htm) |
| 15 | Upload Bank File | `—` | `reference` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Upload%20Bank%20File.htm) |
| 16 | Upload Document (files/documents) | `—` | `reference` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Upload%20Document.htm) |
| 17 | uploadfile.htm | `Message` | `ppmdmsg-xmlrpc` | 62 | 60 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/uploadfile.htm) |

### Lookup Actions

| # | Title | Action | Transport | Tables | Code | Source |
|---:|---|---|---|---:|---:|---|
| 1 | Look Up Account Type | `lookupaccttype` | `ppmdmsg-xmlrpc` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/lookupaccttype.htm) |
| 2 | Look Up Carrier | `lookupcarrier` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/lookupcarrier.htm) |
| 3 | Look Up Diag Code | `lookupdiagcode` | `ppmdmsg-xmlrpc` | 0 | 6 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/lookupdiagcode.htm) |
| 4 | Look Up Facilities | `lookupfacility` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/lookupfacility.htm) |
| 5 | Look Up Financial class | `lookupfinclass` | `ppmdmsg-xmlrpc` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/lookupfinclass.htm) |
| 6 | Look Up Group | `selectgroup` | `ppmdmsg-xmlrpc` | 1 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/lookupgroup.htm) |
| 7 | Look Up Mod Code | `lookupmodcode` | `ppmdmsg-xmlrpc` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/lookupmodcode.htm) |
| 8 | Look Up Proc Code | `lookupproccode` | `ppmdmsg-xmlrpc` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/lookupproccode.htm) |
| 9 | Look Up Profile | `lookupprofile` | `ppmdmsg-xmlrpc` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/lookupprofile.htm) |
| 10 | Look Up Responsible Party | `lookuprespparty` | `ppmdmsg-xmlrpc` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/lookuprespparty.htm) |
| 11 | Lookup Actions | `Item` | `ppmdmsg-xmlrpc` | 1 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Lookup%20Actions.htm) |

### Custom Tabs

| # | Title | Action | Transport | Tables | Code | Source |
|---:|---|---|---|---:|---:|---|
| 1 | Custom Tab Request | `getcustomdata` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Custom%20Tab%20Request.htm) |
| 2 | Update Custom Tab | `getcustomdata` | `ppmdmsg-xmlrpc` | 0 | 12 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Update%20Custom%20Tab.htm) |

### Audit

| # | Title | Action | Transport | Tables | Code | Source |
|---:|---|---|---|---:|---:|---|
| 1 | Audit | `—` | `reference` | 1 | 0 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Audit.htm) |

### Reference: Auth/URL

| # | Title | Action | Transport | Tables | Code | Source |
|---:|---|---|---|---:|---:|---|
| 1 | JSON Format | `action` | `ppmdmsg-xmlrpc` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/JSON%20Format.htm) |
| 2 | Login and Re-Direct Process | `login` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Login%20and%20Re-Direct%20Process.htm) |
| 3 | Post Messages | `—` | `reference` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Posting%20Messages.htm) |
| 4 | URL Construction | `—` | `reference` | 0 | 0 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/URL%20Construction.htm) |
| 5 | XML Format | `action` | `ppmdmsg-xmlrpc` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/XML%20Format.htm) |

### Reference: Field Lists

| # | Title | Action | Transport | Tables | Code | Source |
|---:|---|---|---|---:|---:|---|
| 1 | Complete Field Lists | `getupdatedpatients` | `ppmdmsg-xmlrpc` | 4 | 0 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Complete%20Field%20Lists.htm) |

### Reference: Hard-coded Values

| # | Title | Action | Transport | Tables | Code | Source |
|---:|---|---|---|---:|---:|---|
| 1 | Hard-Coded Values | `—` | `reference` | 42 | 0 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Hard%20Coded%20Values.htm) |

### Reference: Error Codes

| # | Title | Action | Transport | Tables | Code | Source |
|---:|---|---|---|---:|---:|---|
| 1 | AdvancedMDError Codes | `—` | `reference` | 1 | 0 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/AdvancedMD%20Error%20Codes.htm) |

### Reference: Algorithms

| # | Title | Action | Transport | Tables | Code | Source |
|---:|---|---|---|---:|---:|---|
| 1 | Algorithms | `—` | `reference` | 0 | 0 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Algorithms.htm) |

### Reference: What's New

| # | Title | Action | Transport | Tables | Code | Source |
|---:|---|---|---|---:|---:|---|
| 1 | What's New | `—` | `reference` | 0 | 0 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/What%27s%20New.htm) |

### Other

| # | Title | Action | Transport | Tables | Code | Source |
|---:|---|---|---|---:|---:|---|
| 1 | Add a Responsible Party | `addrespparty` | `ppmdmsg-xmlrpc` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/addrespparty.htm) |
| 2 | Batching | `—` | `reference` | 0 | 0 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Batching.htm) |
| 3 | Columns Openings | `—` | `reference` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Columns%20Openings.htm) |
| 4 | Get Account Detail | `getaccountdetail` | `ppmdmsg-xmlrpc` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Get%20Account%20Detail.htm) |
| 5 | Get Accounts for the Collector | `getaccounts` | `ppmdmsg-xmlrpc` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Get%20Accounts%20for%20the%20Collector.htm) |
| 6 | Get Additional Demographics | `getadditionaldemographics` | `ppmdmsg-xmlrpc` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Get%20Additional%20Demographics.htm) |
| 7 | Get Allergy Category | `—` | `reference` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Get%20Allergy%20Category.htm) |
| 8 | Get Allergy Reaction List | `—` | `reference` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Get%20Allergy%20Reaction%20List.htm) |
| 9 | Get Allergy Severity List | `—` | `reference` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Get%20Allergy%20Severity%20List.htm) |
| 10 | Get Auto Match Details | `—` | `reference` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Get%20Auto%20Match%20Details.htm) |
| 11 | Get Episodes | `getepisodes` | `ppmdmsg-xmlrpc` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getepisodes.htm) |
| 12 | Get Invitation URL | `—` | `reference` | 0 | 6 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Get%20Invitation%20URL.htm) |
| 13 | Get Race and Ethnicity Lists | `getraceethnicitylists` | `ppmdmsg-xmlrpc` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getraceethnicitylists.htm) |
| 14 | Get Responsible Party Self | `getresponsiblepartyself` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Get%20Responsible%20Party%20Self.htm) |
| 15 | Get Responsible Party Details | `getrespparty` | `ppmdmsg-xmlrpc` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getrespparty.htm) |
| 16 | Get Worklist | `getworklist` | `ppmdmsg-xmlrpc` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getworklist.htm) |
| 17 | Get Worklist Totals | `getworklisttotals` | `ppmdmsg-xmlrpc` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getworklisttotals.htm) |
| 18 | getdemographic-api.htm | `getdemographic` | `ppmdmsg-xmlrpc` | 0 | 7 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getdemographic-api.htm) |
| 19 | Getdiskusage Message Specification | `Message` | `ppmdmsg-xmlrpc` | 10 | 12 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getdiskusage.htm) |
| 20 | Getrevision Message Specification | `Message` | `ppmdmsg-xmlrpc` | 6 | 9 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getrevision.htm) |
| 21 | Getrevisionlist Message Specification | `Message` | `ppmdmsg-xmlrpc` | 10 | 13 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/getrevisionlist.htm) |
| 22 | Insert Action History | `History` | `ppmdmsg-xmlrpc` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Insert%20Action%20History.htm) |
| 23 | Look Up Collector | `lookupcollector` | `ppmdmsg-xmlrpc` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Look%20Up%20Collector.htm) |
| 24 | Look Up Management Services Office Class | `lookupmsopatient` | `ppmdmsg-xmlrpc` | 0 | 8 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Look%20Up%20Management%20Services%20Office%20Class.htm) |
| 25 | Mass Rebill | `—` | `reference` | 3 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Mass%20Rebill.htm) |
| 26 | Post Received Reports | `—` | `rest` | 3 | 14 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Post%20Received%20Reports.htm) |
| 27 | Requirements and Usage Restrictions | `login` | `ppmdmsg-xmlrpc` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Requirements%20and%20Usage%20Restrictions.htm) |
| 28 | Rollbackrevision Message Specification | `Message` | `ppmdmsg-xmlrpc` | 2 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/rollbackrevision.htm) |
| 29 | Save Memo | `savememo` | `ppmdmsg-xmlrpc` | 0 | 4 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/savememo.htm) |
| 30 | Save Reconciliation | `—` | `reference` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Save%20Reconciliation.htm) |
| 31 | Select Diagnosis Codes | `selectdiagnosiscodes` | `ppmdmsg-xmlrpc` | 0 | 20 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/selectdiagnosiscodes.htm) |
| 32 | SMS Consent Handling | `—` | `reference` | 2 | 20 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/SMS%20Consent.htm) |
| 33 | Streamed vs. Non-Streamed Requests | `—` | `reference` | 1 | 0 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Streamed%20vs.%20Non-Streamed%20Requests.htm) |
| 34 | System Defaults Requests | `getsysdefaults` | `ppmdmsg-xmlrpc` | 0 | 12 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/System%20Defaults%20Requests.htm) |
| 35 | Update Memo | `updatememo` | `ppmdmsg-xmlrpc` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/updatememo.htm) |
| 36 | Update Responsible Party | `updaterespparty` | `ppmdmsg-xmlrpc` | 0 | 2 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/Update%20Responsible%20Party.htm) |
| 37 | updatedownloadstatus.htm | `Message` | `ppmdmsg-xmlrpc` | 10 | 14 | [link](https://ow2-help-01-prd.advancedmd.com/help/APIDocumentation/Content/updatedownloadstatus.htm) |

## Critical Gotchas

- **Scheduler LIST endpoint filters statuses 4/5/6** (cancelled / no-show / rescheduled). For daily cancel/reschedule/no-show counts, use `getupdatedvisits` (returns modified visits including cancelled) or probe the 'Missed Appointments' worklist XHR. See `LRN-20260405-001` in the shared learnings file.
- **`getupdatedvisits` is the key workload endpoint.** It returns visits modified within a date range and includes status changes, making it the authoritative source for reschedule/cancellation counts.
- **Write endpoints exist but must be validated before trust.** `addpatient`, `addvisit`, `savecharges`, `addpayments`, `updatepatient` are all documented but have never been executed with live Exult data. Per `feedback_amd_writes.md`, writes require explicit Gautam per-request approval.
- **Authentication**: The docs are behind a login wall. Session cookie format: `token` cookie at `.advancedmd.com` domain, value `{officeKey}{64-hex}`. Set by the popup chain after 2FA. `saml-session` cookie alone is insufficient.

## Validated Reference (separate file)

Endpoints we have OBSERVED and VALIDATED against Exult's live AMD tenant (office 161112) are cataloged separately in `API_REFERENCE.md` with transport-level shapes (real request/response pairs). This file is for the documentation layer; `API_REFERENCE.md` is for what we have actually run.

