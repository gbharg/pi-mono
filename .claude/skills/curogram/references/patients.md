# Curogram Patients

Patient lookup, search, demographics, and communication preferences.

## Search / list (GraphQL on `api-v2.curogram.com`)

```graphql
query Patients($skip: Int, $take: Int, $q: String) {
  patients(skip: $skip, take: $take, q: $q) {
    totalItemCount
    items { id displayName }
  }
}

query GetPatientList            # internal, similar shape
query GetPatientDuplicatesList  # find duplicate patient records
```

REST autocomplete:

```
GET /patients/search?q=<term>         # quick autocomplete by name or phone
GET /patients?skip=&take=&q=          # full list
```

## Single patient

```graphql
query PatientInfo($id: ID!) {
  patient(id: $id) {
    id displayName dob
    avatar { initials url }
  }
}
```

REST:

```
GET /patients/{patientId}             # full demographic record
GET /patients/{patientId}/groups      # patient groups membership
```

## Communication preferences (lives on `patients.curogram.com/graphql`)

```graphql
query CommunicationPreferences($patientId: PatientId!) {
  communicationPreferences(patientId: $patientId) {
    allowCalls
    allowEmailMessages
    allowMarketingMessages
    allowSmsMessages
    consent
  }
}

mutation CommunicationPreferencesUpdate(
  $patientId: PatientId!
  $consent: Boolean!
  $allowMarketingMessages: Boolean!
  $allowSmsMessages: Boolean!
  $allowEmailMessages: Boolean!
  $allowCalls: Boolean!
) {
  communicationPreferencesUpdate(
    patientId: $patientId
    consent: $consent
    allowMarketingMessages: $allowMarketingMessages
    allowSmsMessages: $allowSmsMessages
    allowEmailMessages: $allowEmailMessages
    allowCalls: $allowCalls
  ) { allowCalls }
}
```

Always check `consent` and `allowSmsMessages` before any outbound message — sending without consent can violate TCPA.

## Notes (internal)

```graphql
query PatientNotes($patientId: ...)
mutation PatientNoteCreate($accountId: AccountId!, $text: String!) {
  patientNoteCreate(accountId: $accountId, text: $text) {
    ...PatientNoteItem
  }
}

fragment PatientNoteItem on PatientNoteSchema {
  id text updatedAt
  author { id displayName avatar { initials url } }
}
```

## Merge duplicates

```
POST /practices/patients/merge        body: { primaryId, duplicateIds: [...] }
GET  /patients/settings/timezones
```

## Patient registrations

These are intake/check-in records (forms, screenings, etc.) — distinct from the demographic patient record.

```graphql
query PatientRegistration
query PatientRegistrations
query PatientRegistrationBillings
mutation PatientRegistrationBillingUpdate
mutation PatientRegistrationSetCheckedIn
mutation PatientRegistrationSetPending
```

REST:

```
GET  /practice/patient-registration                              # list
POST /practice/patient-registration/{id}/appointment             # link to appt
POST /practice/patient-registration/{id}/insurance-details       # add insurance
GET  /practice/patient-registration/{id}/missing-information
GET  /practice/patient-registration/{id}/custom-files
GET  /practice/patient-registration/{id}/custom-files/{fileId}
GET  /practice/patient-registration/{id}/documents/available
POST /practice/patient-registration/{id}/proof-of-residence
POST /practice/patient-registration/{id}/proof-of-residence-files/{fileId}
PATCH /practice/patient-registration/{id}/proof-of-residence-files
GET  /practice/patient-registration/covid/list
```

## Stored payment cards (PCI-sensitive — DO NOT enter card data)

```graphql
query PatientStoredCards
mutation PatientStoredCardMarkDefault
mutation PatientStoredCardRemove
```

## Patient telemedicine history

```graphql
query PatientTelemedicineHistory($patientId: ObjectId!, $skip: Int, $take: Int) { ... }
```

## Patient groups

```
GET  /practice/patients-groups                            # list groups
POST /practice/patients-groups/{groupId}                  # create/update
PUT  /practice/patients-groups/{groupId}/members          # set membership
```
