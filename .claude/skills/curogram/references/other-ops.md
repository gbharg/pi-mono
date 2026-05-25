# Curogram — Tasks, Recalls, Surveys, Payments, Templates, Mass Messaging, EMR

Everything outside the conversation/appointment/patient core.

## Provider tasks (work queue)

```graphql
query ProviderTasks
query ProviderTasksQueue
query ProviderTask($id: ObjectId!)
query ProviderTaskStatuses
query ProviderTaskStatusLogs
query GetProviderTasksCsv      # report export
query GetProviderTasksPdf

mutation ProviderTaskCreate
mutation ProviderTaskUpdate
mutation ProviderTaskChangeStatus

fragment ProviderTaskItem on ProviderTask {
  id title description notification priority source
  status { id title color isDeletable isEditable }
  messageId conversationId
  practice { id name }
  assignedToIds
  assignedTo { id displayName }
  assignedById
  assignedBy { id displayName }
  latestStatusLog { changedBy { displayName } date }
  createdAt date
}
```

Tasks can link to a `messageId` and `conversationId` — they often originate from a flagged inbound message.

## Recalls (patient outreach scheduling)

```graphql
query Recalls
query GetRecallsCsv
query GetRecallsPdf
query GetRecallTemplateCompile

mutation RecallCreate
mutation RecallUpdate
mutation RecallRemove

fragment RecallListItem on RecallSchema {
  ... on AutomaticRecallSchema {
    id type sentAt
    patient { id displayName }
    appointment { id date }
  }
  ... on IntegrationRecallSchema {
    id type sentAt triggerAt template
    patient { id displayName }
  }
  ... on ManualRecallSchema {
    id type sentAt triggerAt template
    patient { displayName id }
  }
}
```

## Surveys

```graphql
query Surveys
mutation SurveyResponseRemove
```

REST send: `POST /surveys/{surveyId}` body `{ conversationId: "..." }`.

## Self-testing (lab kits)

```graphql
query SelfTestings
mutation SelfTestingCreate
mutation SelfTestingResult
```

Reports: `GET /practice/reports/self-testing/{id}/pdf`.

## Patient payments

```graphql
query PatientPayments
query PatientPayment

mutation PatientPaymentCreate
mutation PatientPaymentManualChargeCreate
mutation PatientPaymentPosting
mutation PatientPaymentRefund
mutation PatientPaymentRemove

fragment PatientPaymentItem on PatientPayment {
  id
  patient { id displayName dob avatar { url initials } }
  formFile {
    id originalName extension description type
    original { url width height }
  }
}
```

REST extras:

```
GET /patient-payments/export/csv
GET /practice/payment/settings
GET /practice/payment/settings/source
```

**Do not** call card-creation endpoints with raw card numbers from chat — Stripe-tokenize on the client. Curogram embeds `ngx-stripe`.

## Subscription / billing (practice's own subscription)

```
GET /practices/subscription
GET /practices/subscription/cards
GET /practices/subscription/invoices?take=
GET /practices/subscription/list
GET /practices/subscription/next-payment
GET /practices/subscription/plan
GET /practices/subscription/recipient
GET /practices/subscription/status
GET /practices/support
```

## Custom message templates

```graphql
query CustomMessageTemplates
query ProviderCustomTemplatePermissions
mutation CustomMessageTemplateCreate
mutation CustomMessageTemplateUpdate
mutation CustomMessageTemplateRemove
```

REST:

```
GET    /messages/templates/custom
POST   /messages/templates/custom/compile
POST   /messages/templates/custom/remove
GET    /messages/templates/custom/legend
GET    /messages/templates/legend/list
POST   /messages/templates/native/reset
GET    /messages/templates/patient/compiled?patientId=
```

## Mass messaging (broadcasts)

```graphql
query MassMessagingRecipients   # preview audience for filters
```

REST send pipeline:

```
POST /practice/mass-messages/calculate              # estimate audience size from filter
POST /practice/mass-messages/all                    # broadcast to filter
POST /practice/mass-messages/appointments           # broadcast to upcoming-appt cohort
POST /practice/mass-messages/screenings/calculate
POST /practice/mass-messages/screenings/send
GET  /practice/mass-messages/waitlist/testings
GET  /practice/mass-messages/waitlist/send
```

Always run `/calculate` first and confirm the cohort size with the human — broadcasts are expensive (per-SMS) and embarrassing if mis-targeted.

## Practice documents (uploaded files)

```graphql
query PracticeDocuments
query PracticeDocumentStatuses

mutation PracticeDocumentCreate
mutation PracticeDocumentSetPatient
mutation PracticeDocumentSetStatus
```

## Forms and packages

```
GET  /practice/forms
GET  /practice/forms/{id}
POST /practice/forms/{id}                                  # update
POST /practice/forms/request           body: { packageId, direction: "down" }
PUT  /practice/forms/{id}/move
GET  /practice/forms/packages
GET  /practice/forms/packages/{id}
POST /practice/forms/packages/{id}/fields  body: { name }
GET  /patient-forms
```

```graphql
query PracticePackages
```

## Submissions (patient-completed forms)

```
GET /practice/submissions
GET /practice/submissions/unreviewed-count
GET /practice/submissions/{id}/mark-review     body: { isReviewed }
```

## Screenings (COVID + intake)

```
GET   /practice/screening/list
GET   /practice/screening/{id}
GET   /practice/screening/{id}/{path}
GET   /practice/screening/{id}/result
GET   /practice/screening/{id}/result-file
GET   /practice/screening/{id}/billing-status
GET   /practice/screening/{id}/waitlist
GET   /practice/screening/{id}/assign-appointment/{apptId}
PATCH /practice/screening/{id}/result-status
PATCH /practice/screening/{id}/check-in
POST  /practice/screening/{id}/change-log
POST  /practice/screening/{id}/visit-notes        body: { message }
POST  /practice/screening/{id}/complete
POST  /practice/screening/{id}/incomplete
POST  /practice/screening/{id}/send-link-to-testing
POST  /practice/screening/{id}/billing-insurance-type
POST  /practice/screening/{id}/resend-result
POST  /practice/screening/{id}/resend-telemedicine-link
POST  /practice/screening/{id}/resend-telemedicine-link/instant
POST  /practice/screening/{id}/laboratory-settings
PUT   /practice/screening/{id}/billing-insurance-status   body: { insuranceType }
PUT   /practice/screening/{id}/consult                    body: { insuranceType }
PUT   /practice/screening/{id}/re-registration            body
PUT   /practice/screening/re-register                     body: { insuranceStatus }
GET   /practice/screening/{id}/label?format=
PUT   /practice/screening/csv     body: { fileId }
GET   /practice/screening/csv
GET   /practice/screening/unreachable-csv
POST  /practice/screening                          # create
POST  /practice/screening/statistics
GET   /practice/patients/{patientId}/screenings
```

## EMR integration (Practice Fusion + others)

```
POST /integrations-gateway/login
POST /integrations-gateway/login/hybrid
POST /integrations-gateway/practice-fusion/authorize
GET  /practice/integration
GET  /practice/integration/credentials
GET  /practice/integration/emrs
PUT  /practice/integration/provider-mapping
PUT  /practice/integration/unauthorize

GET  /practice/emr/locations/{id}
GET  /practice/emr/locations/unmapped/count
GET  /practice/emr/providers/{id}
GET  /practice/emr/providers/unmapped/count
GET  /practice/emr/resources
GET  /practice/emr/resources/{id}
GET  /practice/emr/services
POST /practice/emr/services
POST /practice/emr/services/{id}
POST /practice/emr/services/{id}/procedures
PUT  /practice/emr/services/{serviceId}/procedures/{procId}
PUT  /practice/emr/services/{id}/laboratory-profile
DELETE /practice/emr/statuses

PUT  /practice/staff/{staffId}/assign       body: { mappingProviderId }
GET  /practice/staff/{staffId}/filter
GET  /practice/staff/{staffId}/filter-tag
GET  /practice/staff/{staffId}/update-filter-set  body: { groupId }
GET  /practice/staff/{staffId}/settings
GET  /practice/staff/settings
GET  /practice/staff/csv

# EMR services + locations from GraphQL
query GetEmrLocations
query GetEmrProviders
query GetEmrResources
query EmrServiceOptions
query EmrServiceLaboratoryProfiles
query LocationServices
query GetPracticeServices
mutation UpdateLocationServices
```

## Reviews

```
GET /practice/reviews
GET /practice/reviews/csv
GET /practice/reviews/pdf
```

## Referrals

```
GET  /referral/patients
POST /referral/patients/scheduling-request

query GetAllReferralPractices
query GetReferralPartners
```

## Vaccinations

```
GET  /practice/vaccination-profiles
PUT  /practice/vaccination-profiles
POST /practice/vaccination-profiles/{id}
PUT  /practice/vaccinations/{id}
```

## Providers / staff

```
GET  /providers
GET  /providers/{id}
GET  /providers/profile
GET  /providers/filter
GET  /providers/settings
POST /providers/settings

# Provider groups
GET    /practice/providers-groups
POST   /practice/providers-groups/{id}
PUT    /practice/providers-groups/{id}/join
POST   /practice/providers-groups/{id}/members
DELETE /practice/providers-groups/leave

GET  /practice/providers-messagings/csv

# Staff (people)
GET /staff
```

```graphql
query StaffById
mutation ProviderPreferencesUpdate
mutation ColumnsPreferencesUpdate
mutation FollowedConversationsToggleUpdate
query   GetFollowedConversationCount
query   ColumnsPreferences
```

## Practice settings

```
GET/PUT /practices/settings
GET/PUT /practices/settings/conversations
GET/PUT /practices/settings/insurances
GET/PUT /practices/settings/locations
GET/PUT /practices/settings/messaging
GET/PUT /practices/settings/onboarding
GET/PUT /practices/settings/primary-phone
GET/PUT /practices/settings/registration
GET/PUT /practices/settings/registration/copy
GET/PUT /practices/settings/registration/type/custom
GET/PUT /practices/settings/registration/type/screening
GET/PUT /practices/settings/registration/type/telemedicine
GET/PUT /practices/settings/specialties
GET/PUT /practices/settings/streamline
GET/PUT /practices/settings/streamline/appointment-notifications
GET/PUT /practices/settings/timezones
GET/PUT /practices/settings/vaccination
GET/PUT /practices/settings/working-hours
```

```
GET /practices/stats
GET /practices/stats/providers
PUT /practices/avatar
PUT /practices/cover
```

## Bot profile

```
POST /practice/bot-profile
PUT  /practice/bot-profile/avatar
```

## Locations / languages / specialties

```
GET /locations
GET /locations/unmapped/count
GET /languages
GET /specialties
```

## Misc

```
GET /blocked-features                 # feature gate flags
GET /documents/pdf
GET /user/avatar

GET /settings/profile
GET /settings/emr-integration
GET /settings/voip-notifications

# Practice GraphQL feature gate
query Query($functionality: AdditionalFunctionality!) {
  additionalFunctionalityEnabled(functionality: $functionality)
}
```

## Practice change log + prep

```
PUT  /practice/change-log
GET  /practice/prep-instructions
GET  /practice/prep-instructions/{id}
GET  /practice/services
GET  /practice/services/{id}
GET  /practice/services/{id}/assign
```
