# Curogram Appointments

Calendar, list, status changes, telemedicine, exports.

## Calendar (month/week view)

```graphql
query GetAppointmentsCalendar(
  $minDate: DateTime!
  $maxDate: DateTime!
  $take: Int!
  $emrServiceIds: [ObjectId]
  $locationIds: [ObjectId]
  $providerIds: [ObjectId]
) {
  calendar(
    minDate: $minDate
    maxDate: $maxDate
    take: $take
    emrServiceIds: $emrServiceIds
    locationIds: $locationIds
    providerIds: $providerIds
  ) {
    totalItemCount
    items {
      date
      totalItemCount
      appointments {
        id date duration status
        practiceId providerId locationId
        patient { displayName }
      }
    }
  }
}
```

## List view (filterable)

```graphql
query AppointmentsList(
  $q: String
  $skip: Int
  $take: Int
  $date: DateRangeInput!
  $excluded: Boolean
  $confirmationStatusIds: [ObjectId!]
  $emrServiceIds: [ObjectId]
  $locationIds: [ObjectId]
  $providerIds: [ObjectId]
  $paymentStatuses: [PatientPaymentStatus]
) {
  appointments(
    q: $q
    skip: $skip
    take: $take
    date: $date
    excluded: $excluded
    confirmationStatusIds: $confirmationStatusIds
    emrServiceIds: $emrServiceIds
    locationIds: $locationIds
    providerIds: $providerIds
    paymentStatuses: $paymentStatuses
  ) {
    totalItemCount
    items { ...AppointmentsListItem }
  }
}

fragment AppointmentsListItem on Appointment {
  id date newPatient isTelemedicine status practiceId
  patient { id displayName }
  type { title telemedicine }
  provider { displayName }
  facility { id label }
  confirmationStatus { title status }
  telemedicineStatus { id type title color }
  digitCode amountDue
  payment {
    id type status
    ... on PatientPaymentStatement { review }
  }
}
```

`DateRangeInput` shape: `{ from: DateTime, to: DateTime }`.

## Status / lifecycle

```
POST /appointments                              # create new appt (body = appt object)
GET  /appointments/{id}                         # detail
POST /appointments/{id}/confirm                 # confirm
POST /appointments/{id}/cancel                  # cancel  body: { appointmentIds: [id] }
POST /appointments/{id}/status     <new status>
PUT  /appointments/{id}/state      <state>
PUT  /appointments/{id}/clinical-status  <status>
PUT  /appointments/{id}/reviewed    body: { telemedicineStatusId: "..." }
POST /appointments/remove           body: { appointmentIds: [...] }    # soft-remove batch
```

## Slot availability

```
GET /practice/availabilities/slot-details?providerId=&locationId=&date=
```

## Export

```
GET /appointments/csv      # appointments as CSV
GET /appointments/pdf      # appointments as PDF
```

## Telemedicine appointments

```
GET  /telemedicine
GET  /telemedicine/appointments
GET  /telemedicine/appointments/queues
GET  /telemedicine/appointments/csv
GET  /telemedicine/appointments/pdf
GET  /telemedicine/settings
GET  /telemedicine-statuses

# Connection log
mutation TelemedicineConnectionLogCreate
query   TelemedicineConnectionLogs
query   TelemedicineStatuses
mutation TelemedicineSettingsUpdate
```

VideoEvents endpoint (raw signaling — opaque, internal use):

```
POST /v1/VideoEvents
```

## Confirmation statuses

`appointment.confirmationStatus` is one of the practice's configured states — pull the full list via the providers / practice settings endpoints. Common statuses:
- `pending`
- `confirmed`
- `cancelled`
- `no-show`
- `completed`

## Reports

```
GET /practice/reports/virtual-visits-analytics/export
GET /practice/reports/waiting-rooms/csv
```

## Waiting rooms

```graphql
query WaitingRooms
```

REST: `GET /practice/waiting-rooms`.
