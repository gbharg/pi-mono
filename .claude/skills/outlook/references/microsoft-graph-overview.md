# Microsoft Graph REST API v1.0 endpoint reference

Source: https://learn.microsoft.com/en-us/graph/api/overview

Welcome to Microsoft Graph REST API reference for the `v1.0` endpoint.

API sets on the `v1.0` endpoint (`https://graph.microsoft.com/v1.0`) have reached general availability (GA), and have gone through a rigorous review-and-feedback process with customers to meet practical, production needs. Updates to APIs on this endpoint are additive in nature and don't break existing app scenarios.

## Common use cases

The power of Microsoft Graph lies in easy navigation of entities and relationships across different services exposed on a single Microsoft Graph REST endpoint.

Some of these services are designed to enable rich scenarios around a [user](resources/user) and around a [group](resources/group).

### User-centric use cases in v1.0

- [Get the profile](user-get) and [photo](resources/profilephoto) of a user.
- [Get the profile information for a user's manager](user-list-manager) and [IDs of their direct reports](user-list-directreports), all stored in Microsoft Entra ID.
- [Access a user's files on OneDrive](driveitem-list-children), find the [identity](resources/identityset) of the last person who modified a [file](resources/driveitem) there, and go to that person's profile.
- [Access a user's calendar](calendar-get) on Exchange Online and [determine the best time to meet with their team](user-findmeetingtimes) in the next two weeks.
- [Subscribe to](subscription-post-subscriptions) and [track changes](event-delta) in a user's calendar, and tell the user when they're spending more than 80% of their time in meetings.
- [Set automatic replies](user-update-mailboxsettings#example-1) when a user is away from the office.
- [Get the people who are most relevant to a user](user-list-people), based on communication, collaboration, and business relationships.
- Get the latest sales projection from a [chart](resources/workbookchart) in an Excel file in a user's OneDrive.
- [Find the tasks assigned to a user in Planner](planneruser-list-tasks).

### Microsoft 365 group use cases in v1.0

- Run a report on Microsoft 365 groups in an organization and identify the group with the most [communication among group members](reportroot-getoffice365groupsactivitycounts).
- [Find the plans of this Microsoft 365 group](plannergroup-list-plans), and the [assignment of tasks](resources/plannerassignments) in that plan.
- [Start a new conversation](group-post-conversations) in the Microsoft 365 group to determine if members want to [create another group](group-post-groups) to share the workload.
- [Get the default notebook](notebook-get) for the group and [create a page](section-post-pages) to note the outcome of the investigation.

## Call the v1.0 endpoint

Microsoft Graph API requests to the v1.0 endpoint use the following pattern:

```http
https://graph.microsoft.com/v1.0/{resource}?[query_parameters]
```

For more information about Microsoft Graph REST API calls, see [Use the Microsoft Graph API](https://learn.microsoft.com/en-us/graph/use-the-api).

## Microsoft Graph beta endpoint

Currently, two versions of Microsoft Graph REST APIs are available: v1.0 and beta.

If you're interested in new or enhanced APIs that are still in preview status, see [Microsoft Graph beta endpoint reference](https://learn.microsoft.com/en-us/graph/api/overview?view=graph-rest-beta).

> **Caution:** APIs in preview status are subject to change, and might break existing scenarios without notice. Don't take a production dependency on APIs in the `beta` endpoint.

For more information, see [Versioning and support](https://learn.microsoft.com/en-us/graph/versioning-and-support).

## What's new

Find out [what's new](https://learn.microsoft.com/en-us/graph/whats-new-overview) in the v1.0 endpoint.

For details about changes to Microsoft Graph APIs in v1.0, explore the [API changelog](https://developer.microsoft.com/graph/changelog/?filterby=v1.0).
