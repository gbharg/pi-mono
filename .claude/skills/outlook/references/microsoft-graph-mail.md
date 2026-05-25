# List messages - Microsoft Graph v1.0

Source: https://learn.microsoft.com/en-us/graph/api/user-list-messages

Namespace: microsoft.graph

Get the messages in the signed-in user's mailbox (including the Deleted Items and Clutter folders).

Depending on the page size and mailbox data, getting messages from a mailbox can incur multiple requests. The default page size is 10 messages. Use `$top` to customize the page size, within the range of 1 and 1000.

To improve the operation response time, use `$select` to specify the exact properties you need. Fine-tune the values for `$select` and `$top`, especially when you must use a larger page size, as returning a page with hundreds of messages each with a full response payload may trigger the gateway timeout (HTTP 504).

To get the next page of messages, simply apply the entire URL returned in `@odata.nextLink` to the next get-messages request. This URL includes any query parameters you may have specified in the initial request.

Do not try to extract the `$skip` value from the `@odata.nextLink` URL to manipulate responses. This API uses the `$skip` value to keep count of all the items it has gone through in the user's mailbox to return a page of message-type items.

Currently, this operation returns message bodies in only HTML format.

There are two scenarios where an app can get messages in another user's mail folder:
- If the app has application permissions, or,
- If the app has the appropriate delegated permissions from one user, and another user has shared a mail folder with that user, or has given delegated access to that user.

This API is available in the following national cloud deployments:

| Global service | US Government L4 | US Government L5 (DOD) | China operated by 21Vianet |
| --- | --- | --- | --- |
| Yes | Yes | Yes | Yes |

## Permissions

| Permission type | Least privileged permissions | Higher privileged permissions |
| --- | --- | --- |
| Delegated (work or school account) | Mail.ReadBasic | Mail.ReadWrite, Mail.Read |
| Delegated (personal Microsoft account) | Mail.ReadBasic | Mail.ReadWrite, Mail.Read |
| Application | Mail.ReadBasic.All | Mail.ReadWrite, Mail.Read |

## HTTP request

To get all the messages in a user's mailbox:

```http
GET /me/messages
GET /users/{id | userPrincipalName}/messages
```

To get messages in a specific folder in the user's mailbox:

```http
GET /me/mailFolders/{id}/messages
GET /users/{id | userPrincipalName}/mailFolders/{id}/messages
```

## Optional query parameters

This method supports the [OData Query Parameters](https://learn.microsoft.com/en-us/graph/query-parameters) to help customize the response.

### Using filter and orderby in the same query

When using `$filter` and `$orderby` in the same query to get messages, make sure to specify properties in the following ways:

1. Properties that appear in `$orderby` must also appear in `$filter`.
2. Properties that appear in `$orderby` are in the same order as in `$filter`.
3. Properties that are present in `$orderby` appear in `$filter` before any properties that aren't.

Failing to do this results in the following error:
- Error code: `InefficientFilter`
- Error message: `The restriction or sort order is too complex for this operation.`

## Request headers

| Name | Type | Description |
| --- | --- | --- |
| Authorization | string | Bearer {token}. Required. |
| Prefer: outlook.body-content-type | string | The format of the **body** and **uniqueBody** properties to be returned in. Values can be "text" or "html". If the header is not specified, the properties are returned in HTML format. Optional. |

## Request body

Don't supply a request body for this method.

## Response

If successful, this method returns a `200 OK` response code and collection of [Message](resources/message) objects in the response body.

## Example 1: List all messages

### Request

Get the default, top 10 messages in the signed-in user's mailbox, using `$select` to return a subset of the properties:

```http
GET https://graph.microsoft.com/v1.0/me/messages?$select=sender,subject
```

### C# Example

```csharp
var result = await graphClient.Me.Messages.GetAsync((requestConfiguration) =>
{
    requestConfiguration.QueryParameters.Select = new string []{ "sender","subject" };
});
```

### JavaScript Example

```javascript
let messages = await client.api('/me/messages')
    .select('sender,subject').get();
```

### Python Example

```python
from msgraph import GraphServiceClient
from msgraph.generated.users.item.messages.messages_request_builder import MessagesRequestBuilder
from kiota_abstractions.base_request_configuration import RequestConfiguration

query_params = MessagesRequestBuilder.MessagesRequestBuilderGetQueryParameters(
    select = ["sender","subject"],
)
request_configuration = RequestConfiguration(
    query_parameters = query_params,
)
result = await graph_client.me.messages.get(request_configuration = request_configuration)
```

### PowerShell Example

```powershell
Import-Module Microsoft.Graph.Mail
Get-MgUserMessage -UserId $userId -Property "sender,subject"
```

### Response

```json
{
    "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#users('bb8775a4-...')/messages(sender,subject)",
    "value": [
        {
            "@odata.etag": "W/\"CQAAABYAAADHcgC8Hl9tRZ/hc1wEUs1TAAAwR4Hg\"",
            "id": "AAMkAGUAAAwTW09AAA=",
            "subject": "You have late tasks!",
            "sender": {
                "emailAddress": {
                    "name": "Microsoft Planner",
                    "address": "noreply@Planner.Office365.com"
                }
            }
        }
    ]
}
```

## Key notes for mail API usage

- Default page size: 10 messages
- Maximum page size: 1000 messages (via `$top`)
- Use `$select` to reduce payload size and avoid 504 timeouts
- Use `@odata.nextLink` for pagination -- do not manually manipulate `$skip`
- Supports `$filter`, `$orderby`, `$search`, `$select`, `$top`, `$count`
- When combining `$filter` and `$orderby`, properties must appear in both in the same order
