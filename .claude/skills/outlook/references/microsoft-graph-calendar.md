# List events - Microsoft Graph v1.0

Source: https://learn.microsoft.com/en-us/graph/api/calendar-list-events

Namespace: microsoft.graph

Retrieve a list of events in a calendar. The calendar can be one for a [user](resources/user), or the default calendar of a Microsoft 365 [group](resources/group). The list of events contains single instance meetings and series masters.

To get expanded event instances, you can [get the calendar view](calendar-list-calendarview), or [get the instances of an event](event-list-instances).

> **Note:** If your target mailbox calendar contains any private items, the caller must either:
> - Be granted `FullAccess` mailbox permissions over the target mailbox (via the Add-MailboxPermission cmdlet).
> - Be granted the `Delegate` + `CanViewPrivateItems` flags.

Failure to meet these conditions will result in a `The specified object was not found in the store` response.

This API is available in the following national cloud deployments:

| Global service | US Government L4 | US Government L5 (DOD) | China operated by 21Vianet |
| --- | --- | --- | --- |
| Yes | Yes | Yes | Yes |

## Permissions

| Calendar | Delegated (work or school account) | Delegated (personal Microsoft account) | Application |
| --- | --- | --- | --- |
| user calendar | Calendars.ReadBasic, Calendars.Read, Calendars.ReadWrite | Calendars.ReadBasic, Calendars.Read, Calendars.ReadWrite | Calendars.ReadBasic, Calendars.Read, Calendars.ReadWrite |
| group calendar | Group.Read.All, Group.ReadWrite.All | Not supported. | Not supported. |

## HTTP request

A user's or group's default calendar:

```http
GET /me/calendar/events
GET /users/{id | userPrincipalName}/calendar/events
GET /groups/{id}/calendar/events
```

A user's calendar in the default calendarGroup:

```http
GET /me/calendars/{id}/events
GET /users/{id | userPrincipalName}/calendars/{id}/events
```

A user's calendar in a specific calendarGroup:

```http
GET /me/calendarGroups/{id}/calendars/{id}/events
GET /users/{id | userPrincipalName}/calendarGroups/{id}/calendars/{id}/events
```

## Optional query parameters

This method supports the [OData Query Parameters](https://learn.microsoft.com/en-us/graph/query-parameters) to help customize the response.

## Request headers

| Name | Type | Description |
| --- | --- | --- |
| Authorization | string | Bearer {token}. Required. |
| Prefer: outlook.timezone | string | Use this to specify the time zone for start and end times in the response. If not specified, those time values are returned in UTC. Optional. |

## Request body

Don't supply a request body for this method.

## Response

If successful, this method returns a `200 OK` response code and a collection of [Event](resources/event) objects in the response body.

## Example 1: List calendar events

### Request

```http
GET https://graph.microsoft.com/v1.0/me/calendar/events
```

### C# Example

```csharp
var result = await graphClient.Me.Calendar.Events.GetAsync();
```

### JavaScript Example

```javascript
const client = Client.init(options);
let events = await client.api('/me/calendar/events').get();
```

### Python Example

```python
from msgraph import GraphServiceClient
result = await graph_client.me.calendar.events.get()
```

### Response

```http
HTTP/1.1 200 OK
Content-type: application/json

{
  "value": [
    {
      "originalStartTimeZone": "originalStartTimeZone-value",
      "originalEndTimeZone": "originalEndTimeZone-value",
      "responseStatus": {
        "response": "",
        "time": "datetime-value"
      },
      "iCalUId": "iCalUId-value",
      "reminderMinutesBeforeStart": 99,
      "isReminderOn": true
    }
  ]
}
```

## Example 2: Get events by filtering on the subject property

### Request

```http
GET https://graph.microsoft.com/v1.0/me/calendar/events?$filter=startsWith(subject,'All')
```

### C# Example

```csharp
var result = await graphClient.Me.Calendar.Events.GetAsync((requestConfiguration) =>
{
    requestConfiguration.QueryParameters.Filter = "startsWith(subject,'All')";
});
```

### JavaScript Example

```javascript
let events = await client.api('/me/calendar/events')
    .filter('startsWith(subject,\'All\')').get();
```

### Python Example

```python
from msgraph import GraphServiceClient
from msgraph.generated.users.item.calendar.events.events_request_builder import EventsRequestBuilder
from kiota_abstractions.base_request_configuration import RequestConfiguration

query_params = EventsRequestBuilder.EventsRequestBuilderGetQueryParameters(
    filter = "startsWith(subject,'All')",
)
request_configuration = RequestConfiguration(
    query_parameters = query_params,
)
result = await graph_client.me.calendar.events.get(request_configuration = request_configuration)
```

### Response

```json
{
    "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#users('...')/calendar/events",
    "value": [
        {
            "@odata.etag": "W/\"73p1z1T9xUKc8HVNwAwcvgAAR5r+mw==\"",
            "id": "AAMkADBm...",
            "createdDateTime": "2021-09-13T13:08:27.8871578Z",
            "lastModifiedDateTime": "2021-09-14T15:14:24.624932Z",
            "originalStartTimeZone": "India Standard Time",
            "originalEndTimeZone": "India Standard Time",
            "reminderMinutesBeforeStart": 15,
            "isReminderOn": true,
            "hasAttachments": false,
            "subject": "All APIs Testing",
            "importance": "normal",
            "sensitivity": "normal",
            "isAllDay": false,
            "isCancelled": false,
            "isOrganizer": true,
            "showAs": "busy",
            "type": "singleInstance",
            "isOnlineMeeting": true,
            "onlineMeetingProvider": "teamsForBusiness",
            "allowNewTimeProposals": true,
            "isDraft": false,
            "hideAttendees": false,
            "responseStatus": {
                "response": "organizer",
                "time": "0001-01-01T00:00:00Z"
            },
            "start": {
                "dateTime": "2021-09-14T08:00:00.0000000",
                "timeZone": "UTC"
            },
            "end": {
                "dateTime": "2021-09-14T08:30:00.0000000",
                "timeZone": "UTC"
            },
            "location": {
                "displayName": "Singapore",
                "locationType": "default",
                "uniqueId": "79e60b5c-bf7e-4811-b314-6eb7f270ec21",
                "uniqueIdType": "locationStore"
            },
            "attendees": [
                {
                    "type": "required",
                    "status": {
                        "response": "none",
                        "time": "0001-01-01T00:00:00Z"
                    },
                    "emailAddress": {
                        "name": "admin@contoso.com",
                        "address": "admin@contoso.com"
                    }
                }
            ],
            "organizer": {
                "emailAddress": {
                    "name": "Samantha Booth",
                    "address": "samanthab@contoso.com"
                }
            },
            "onlineMeeting": {
                "joinUrl": "https://teams.microsoft.com/l/meetup-join/..."
            }
        }
    ]
}
```
