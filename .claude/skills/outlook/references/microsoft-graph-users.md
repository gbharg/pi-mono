---
layout: Conceptual
monikers:
- graph-rest-1.0
defaultMoniker: graph-rest-1.0
versioningType: Ranged
title: List users - Microsoft Graph v1.0 | Microsoft Learn
canonicalUrl: https://learn.microsoft.com/en-us/graph/api/user-list?view=graph-rest-1.0
config_moniker_range: '>= graph-rest-1.0'
feedback_system: Standard
feedback_product_url: https://developer.microsoft.com/graph/support
author: yyuank
ms.author: MSGraphDocsVteam
ms.suite: microsoft-graph
ms.subservice: entra-users
uhfHeaderId: MSDocsHeader-MSGraph
toc_preview: true
recommendations: false
breadcrumb_path: /graph/ref-breadcrumb/toc.json
ms.service: microsoft-graph
ms.topic: reference
description: Retrieve a list of user objects.
ms.reviewer: iamut
ms.localizationpriority: high
doc_type: apiPageType
ms.date: 2025-05-16T00:00:00.0000000Z
locale: en-us
document_id: 5288856d-4731-71a4-8c7b-01a8b9c599cb
document_version_independent_id: 9c894ef4-2cff-60e5-a726-8281655005fd
updated_at: 2025-07-23T10:06:00.0000000Z
original_content_git_url: https://github.com/microsoftgraph/microsoft-graph-docs/blob/live/api-reference/v1.0/api/user-list.md
gitcommit: https://github.com/microsoftgraph/microsoft-graph-docs/blob/82d0912dd8dd5a5f9a5e51d471f9c7f248f8e118/api-reference/v1.0/api/user-list.md
git_commit_id: 82d0912dd8dd5a5f9a5e51d471f9c7f248f8e118
default_moniker: graph-rest-1.0
site_name: Docs
depot_name: MSDN.microsoft-graph-ref
page_type: conceptual
interactive_type: msgraph
toc_rel: toc.json
feedback_help_link_type: ''
feedback_help_link_url: ''
word_count: 6138
asset_id: api/user-list
moniker_range_name: 107bf06837724705de50667b407c0197
monikers:
- graph-rest-1.0
item_type: Content
source_path: api-reference/v1.0/api/user-list.md
cmProducts:
- https://authoring-docs-microsoft.poolparty.biz/devrel/5fc61396-d075-4560-aece-fdbda73d243f
spProducts:
- https://authoring-docs-microsoft.poolparty.biz/devrel/ad9437c1-8cda-4537-ad69-b4b263652e13
platformId: 90c59392-7dca-83ff-dc48-b690f8bc2a8f
---

# List users - Microsoft Graph v1.0 | Microsoft Learn

Namespace: microsoft.graph

Retrieve a list of [user](resources/user) objects.

> 
> **Note:** This request might have replication delays for users that were recently created, updated, or deleted.

This API is available in the following [national cloud deployments](/en-us/graph/deployments).

| Global service | US Government L4 | US Government L5 (DOD) | China operated by 21Vianet |
| --- | --- | --- | --- |
| ✅ | ✅ | ✅ | ✅ |

## Permissions

One of the following permissions is required to call this API. To learn more, including how to choose permissions, see [Permissions](/en-us/graph/permissions-reference).

| Permission type | Permissions (from least to most privileged) |
| --- | --- |
| Delegated (work or school account) | User.ReadBasic.All, User.Read.All, User.ReadWrite.All, Directory.Read.All, Directory.ReadWrite.All |
| Delegated (personal Microsoft account) | Not supported. |
| Application | User.Read.All, User.ReadWrite.All, Directory.Read.All, Directory.ReadWrite.All |

Guests can't call this API. For more information about the permissions for member and guests, see [What are the default user permissions in Microsoft Entra ID?](/en-us/azure/active-directory/fundamentals/users-default-permissions?context=graph/context#member-and-guest-users)

### Permissions for specific scenarios

- *User-Mail.ReadWrite.All* is the least privileged permission to read and write the **otherMails** property; also allows to read some identifier-related properties on the user object.
- *User-PasswordProfile.ReadWrite.All* is the least privileged permission to read and write password reset-related properties; also allows to read some identifier-related properties on the user object.
- *User-Phone.ReadWrite.All* is the least privileged permission to read and write the **businessPhones** and **mobilePhone** properties; also allows to read some identifier-related properties on the user object.
- *User.EnableDisableAccount.All* + *User.Read.All* is the least privileged combination of permissions to read and write the **accountEnabled** property.

## HTTP request

```http
GET /users
```

## Optional query parameters

This method supports the `$count`, `$expand`, `$filter`, `$orderby`, `$search`, `$select`, and `$top`[OData query parameters](/en-us/graph/query-parameters) to help customize the response. `$skip` isn't supported. The default and maximum page sizes are 100 and 999 user objects respectively, except when you specify `$select=signInActivity` or `$filter=signInActivity`. When `signInActivity` is selected or filtered on, the maximum page size is 500. Some queries are supported only when you use the **ConsistencyLevel** header set to `eventual` and `$count`. For more information, see [Advanced query capabilities on directory objects](/en-us/graph/aad-advanced-queries). The `$count` and `$search` parameters are currently not available in Azure AD B2C tenants.

By default, only a limited set of properties are returned (**businessPhones**, **displayName**, **givenName**, **id**, **jobTitle**, **mail**, **mobilePhone**, **officeLocation**, **preferredLanguage**, **surname**, and **userPrincipalName**).To return an alternative property set, specify the desired set of [user](resources/user) properties using the OData `$select` query parameter. For example, to return **displayName**, **givenName**, and **postalCode**, add the following to your query `$select=displayName,givenName,postalCode`.

Extension properties also support query parameters as follows:

| Extension type | Comments |
| --- | --- |
| onPremisesExtensionAttributes 1-15 | Returned only with `$select`. Supports `$filter` (`eq`, `ne`, and `eq` on `null` values). |
| Schema extensions | Returned only with `$select`. Supports `$filter` (`eq`, `ne`, and `eq` on `null` values). |
| Open extensions | Returned only with `$expand`, that is, `users?$expand=extensions`. |
| Directory extensions | Returned only with `$select`. Supports `$filter` (`eq`, `ne`, and `eq` on `null` values). |

Certain properties can't be returned within a user collection. The following properties are only supported when [retrieving a single user](user-get): **aboutMe**, **birthday**, **hireDate**, **interests**, **mySite**, **pastProjects**, **preferredName**, **responsibilities**, **schools**, **skills**, **mailboxSettings**.

The following properties aren't supported in personal Microsoft accounts and will be `null`: **aboutMe**, **birthday**, **interests**, **mySite**, **pastProjects**, **preferredName**, **responsibilities**, **schools**, **skills**, **streetAddress**.

## Request headers

| Header | Value |
| --- | --- |
| Authorization | Bearer {token}. Required. Learn more about [authentication and authorization](/en-us/graph/auth/auth-concepts). |
| ConsistencyLevel | eventual. This header and `$count` are required when using `$search`, or in specific usage of `$filter`. For more information about the use of **ConsistencyLevel** and `$count`, see [Advanced query capabilities on directory objects](/en-us/graph/aad-advanced-queries). |

## Request body

Don't supply a request body for this method.

## Response

If successful, this method returns a `200 OK` response code and collection of [user](resources/user) objects in the response body. If a large user collection is returned, you can use [paging in your app](/en-us/graph/paging).

Attempting to use `$select` on the `/users` collection to retrieve properties that can't be returned within a user collection (for example, the request `../users?$select=aboutMe`) returns a `501 Not Implemented` error code.

## Examples

### Example 1: Get all users

#### Request

The following example shows a request.

# [HTTP](#tab/http)
```msgraph
GET https://graph.microsoft.com/v1.0/users
```

# [C#](#tab/csharp)
```csharp

// Code snippets are only available for the latest version. Current version is 5.x

// To initialize your graphClient, see https://learn.microsoft.com/en-us/graph/sdks/create-client?from=snippets&tabs=csharp
var result = await graphClient.Users.GetAsync();

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Go](#tab/go)
```go

// Code snippets are only available for the latest major version. Current major version is $v1.*

// Dependencies
import (  "context"  msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"  //other-imports
)

// To initialize your graphClient, see https://learn.microsoft.com/en-us/graph/sdks/create-client?from=snippets&tabs=go
users, err := graphClient.Users().Get(context.Background(), nil)

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Java](#tab/java)
```java

// Code snippets are only available for the latest version. Current version is 6.x

GraphServiceClient graphClient = new GraphServiceClient(requestAdapter);

UserCollectionResponse result = graphClient.users().get();

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [JavaScript](#tab/javascript)
```javascript

const options = {authProvider,
};

const client = Client.init(options);

let users = await client.api('/users').get();

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [PHP](#tab/php)
```php

<?php
use Microsoft\Graph\GraphServiceClient;

$graphServiceClient = new GraphServiceClient($tokenRequestContext, $scopes);

$result = $graphServiceClient->users()->get()->wait();

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [PowerShell](#tab/powershell)
```powershell

Import-Module Microsoft.Graph.Users

Get-MgUser

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Python](#tab/python)
```python

# Code snippets are only available for the latest version. Current version is 1.x
from msgraph import GraphServiceClient
# To initialize your graph_client, see https://learn.microsoft.com/en-us/graph/sdks/create-client?from=snippets&tabs=python

result = await graph_client.users.get()

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

---

#### Response

The following example shows the response.

> 
> **Note:** The response object shown here might be shortened for readability.

```http
HTTP/1.1 200 OK
Content-type: application/json

{
    "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#users",
    "value": [
        {
            "businessPhones": [],
            "displayName": "Conf Room Adams",
            "givenName": null,
            "jobTitle": null,
            "mail": "Adams@contoso.com",
            "mobilePhone": null,
            "officeLocation": null,
            "preferredLanguage": null,
            "surname": null,
            "userPrincipalName": "Adams@contoso.com",
            "id": "6ea91a8d-e32e-41a1-b7bd-d2d185eed0e0"
        },
        {
            "businessPhones": [
                "425-555-0100"
            ],
            "displayName": "MOD Administrator",
            "givenName": "MOD",
            "jobTitle": null,
            "mail": null,
            "mobilePhone": "425-555-0101",
            "officeLocation": null,
            "preferredLanguage": "en-US",
            "surname": "Administrator",
            "userPrincipalName": "admin@contoso.com",
            "id": "4562bcc8-c436-4f95-b7c0-4f8ce89dca5e"
        }
    ]
}
```

### Example 2: Get a user account using a sign-in name

#### Request

The following example shows a request.

> 
> **Note:** When filtering for an **issuerAssignedId**, you must supply both **issuer** and **issuerAssignedId**. However, the **issuer** value will be ignored in certain scenarios. For more information on filtering on identities, see [objectIdentity resource type](resources/objectidentity)

# [HTTP](#tab/http)
```msgraph
GET https://graph.microsoft.com/v1.0/users?$select=displayName,id&$filter=identities/any(c:c/issuerAssignedId eq 'j.smith@yahoo.com' and c/issuer eq 'My B2C tenant')
```

# [C#](#tab/csharp)
```csharp

// Code snippets are only available for the latest version. Current version is 5.x

// To initialize your graphClient, see https://learn.microsoft.com/en-us/graph/sdks/create-client?from=snippets&tabs=csharp
var result = await graphClient.Users.GetAsync((requestConfiguration) =>
{requestConfiguration.QueryParameters.Select = new string []{ "displayName","id" };requestConfiguration.QueryParameters.Filter = "identities/any(c:c/issuerAssignedId eq 'j.smith@yahoo.com' and c/issuer eq 'My B2C tenant')";
});

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Go](#tab/go)
```go

// Code snippets are only available for the latest major version. Current major version is $v1.*

// Dependencies
import (  "context"  msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"  graphusers "github.com/microsoftgraph/msgraph-sdk-go/users"  //other-imports
)

requestFilter := "identities/any(c:c/issuerAssignedId eq 'j.smith@yahoo.com' and c/issuer eq 'My B2C tenant')"

requestParameters := &graphusers.UsersRequestBuilderGetQueryParameters{Select: [] string {"displayName","id"},Filter: &requestFilter,
}
configuration := &graphusers.UsersRequestBuilderGetRequestConfiguration{QueryParameters: requestParameters,
}

// To initialize your graphClient, see https://learn.microsoft.com/en-us/graph/sdks/create-client?from=snippets&tabs=go
users, err := graphClient.Users().Get(context.Background(), configuration)

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Java](#tab/java)
```java

// Code snippets are only available for the latest version. Current version is 6.x

GraphServiceClient graphClient = new GraphServiceClient(requestAdapter);

UserCollectionResponse result = graphClient.users().get(requestConfiguration -> {requestConfiguration.queryParameters.select = new String []{"displayName", "id"};requestConfiguration.queryParameters.filter = "identities/any(c:c/issuerAssignedId eq 'j.smith@yahoo.com' and c/issuer eq 'My B2C tenant')";
});

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [JavaScript](#tab/javascript)
```javascript

const options = {authProvider,
};

const client = Client.init(options);

let users = await client.api('/users').filter('identities/any(c:c/issuerAssignedId eq \'j.smith@yahoo.com\' and c/issuer eq \'My B2C tenant\')').select('displayName,id').get();

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [PHP](#tab/php)
```php

<?php
use Microsoft\Graph\GraphServiceClient;
use Microsoft\Graph\Generated\Users\UsersRequestBuilderGetRequestConfiguration;

$graphServiceClient = new GraphServiceClient($tokenRequestContext, $scopes);

$requestConfiguration = new UsersRequestBuilderGetRequestConfiguration();
$queryParameters = UsersRequestBuilderGetRequestConfiguration::createQueryParameters();
$queryParameters->select = ["displayName","id"];
$queryParameters->filter = "identities/any(c:c/issuerAssignedId eq 'j.smith@yahoo.com' and c/issuer eq 'My B2C tenant')";
$requestConfiguration->queryParameters = $queryParameters;

$result = $graphServiceClient->users()->get($requestConfiguration)->wait();

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [PowerShell](#tab/powershell)
```powershell

Import-Module Microsoft.Graph.Users

Get-MgUser -Property "displayName,id" -Filter "identities/any(c:c/issuerAssignedId eq 'j.smith@yahoo.com' and c/issuer eq 'My B2C tenant')" 

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Python](#tab/python)
```python

# Code snippets are only available for the latest version. Current version is 1.x
from msgraph import GraphServiceClient
from msgraph.generated.users.users_request_builder import UsersRequestBuilder
from kiota_abstractions.base_request_configuration import RequestConfiguration
# To initialize your graph_client, see https://learn.microsoft.com/en-us/graph/sdks/create-client?from=snippets&tabs=python
query_params = UsersRequestBuilder.UsersRequestBuilderGetQueryParameters(	select = ["displayName","id"],	filter = "identities/any(c:c/issuerAssignedId eq 'j.smith@yahoo.com' and c/issuer eq 'My B2C tenant')",
)

request_configuration = RequestConfiguration(
query_parameters = query_params,
)

result = await graph_client.users.get(request_configuration = request_configuration)

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

---

#### Response

The following example shows the response.

> 
> **Note:** The response object shown here might be shortened for readability.

```http
HTTP/1.1 200 OK
Content-type: application/json

{
  "value": [
    {
      "displayName": "John Smith",
      "id": "87d349ed-44d7-43e1-9a83-5f2406dee5bd"
    }
  ]
}
```

### Example 3: Get only a count of users

#### Request

The following example shows a request. This request requires the **ConsistencyLevel** header set to `eventual` because `$count` is in the request. For more information about the use of **ConsistencyLevel** and `$count`, see [Advanced query capabilities on directory objects](/en-us/graph/aad-advanced-queries).

> 
> **Note:** The `$count` and `$search` query parameters are currently not available in Azure AD B2C tenants.

# [HTTP](#tab/http)
```msgraph
GET https://graph.microsoft.com/v1.0/users/$count
ConsistencyLevel: eventual
```

# [C#](#tab/csharp)
```csharp

// Code snippets are only available for the latest version. Current version is 5.x

// To initialize your graphClient, see https://learn.microsoft.com/en-us/graph/sdks/create-client?from=snippets&tabs=csharp
await graphClient.Users.Count.GetAsync((requestConfiguration) =>
{requestConfiguration.Headers.Add("ConsistencyLevel", "eventual");
});

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Go](#tab/go)
```go

// Code snippets are only available for the latest major version. Current major version is $v1.*

// Dependencies
import (  "context"  abstractions "github.com/microsoft/kiota-abstractions-go"  msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"  graphusers "github.com/microsoftgraph/msgraph-sdk-go/users"  //other-imports
)

headers := abstractions.NewRequestHeaders()
headers.Add("ConsistencyLevel", "eventual")

configuration := &graphusers.Users$countRequestBuilderGetRequestConfiguration{Headers: headers,
}

// To initialize your graphClient, see https://learn.microsoft.com/en-us/graph/sdks/create-client?from=snippets&tabs=go
graphClient.Users().Count().Get(context.Background(), configuration)

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Java](#tab/java)
```java

// Code snippets are only available for the latest version. Current version is 6.x

GraphServiceClient graphClient = new GraphServiceClient(requestAdapter);

graphClient.users().count().get(requestConfiguration -> {requestConfiguration.headers.add("ConsistencyLevel", "eventual");
});

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [JavaScript](#tab/javascript)
```javascript

const options = {authProvider,
};

const client = Client.init(options);

let int32 = await client.api('/users/$count').header('ConsistencyLevel','eventual').get();

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [PHP](#tab/php)
```php

<?php
use Microsoft\Graph\GraphServiceClient;
use Microsoft\Graph\Generated\Users\Count\CountRequestBuilderGetRequestConfiguration;

$graphServiceClient = new GraphServiceClient($tokenRequestContext, $scopes);

$requestConfiguration = new CountRequestBuilderGetRequestConfiguration();
$headers = [	'ConsistencyLevel' => 'eventual',];
$requestConfiguration->headers = $headers;

$graphServiceClient->users()->count()->get($requestConfiguration)->wait();

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [PowerShell](#tab/powershell)
```powershell

Import-Module Microsoft.Graph.Users

Get-MgUserCount -ConsistencyLevel eventual 

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Python](#tab/python)
```python

# Code snippets are only available for the latest version. Current version is 1.x
from msgraph import GraphServiceClient
from msgraph.generated.users.count.count_request_builder import CountRequestBuilder
from kiota_abstractions.base_request_configuration import RequestConfiguration
# To initialize your graph_client, see https://learn.microsoft.com/en-us/graph/sdks/create-client?from=snippets&tabs=python

request_configuration = RequestConfiguration()
request_configuration.headers.add("ConsistencyLevel", "eventual")

await graph_client.users.count.get(request_configuration = request_configuration)

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

---

#### Response

The following example shows the response.

```http
HTTP/1.1 200 OK
Content-type: text/plain

893
```

### Example 4: Use $filter and $top to get one user with a display name that starts with 'a' including a count of returned objects

#### Request

The following example shows a request. This request requires the **ConsistencyLevel** header set to `eventual` and the `$count=true` query string because the request has both the `$orderby` and `$filter` query parameters. For more information about the use of **ConsistencyLevel** and `$count`, see [Advanced query capabilities on directory objects](/en-us/graph/aad-advanced-queries).

> 
> **Note:** The `$count` and `$search` query parameters are currently not available in Azure AD B2C tenants.

```msgraph
GET https://graph.microsoft.com/v1.0/users?$filter=startswith(displayName,'a')&$orderby=displayName&$count=true&$top=1
ConsistencyLevel: eventual
```

#### Response

The following example shows the response.

> 
> **Note:** The response object shown here might be shortened for readability.

```http
HTTP/1.1 200 OK
Content-type: application/json

{
  "@odata.context":"https://graph.microsoft.com/v1.0/$metadata#users",
  "@odata.count":1,
  "value":[
    {
      "displayName":"a",
      "mail":"a@contoso.com",
      "mailNickname":"a_contoso.com#EXT#",
      "userPrincipalName":"a_contoso.com#EXT#@contoso.com"
    }
  ]
}
```

### Example 5: Use $filter to get all users with a mail that ends with 'a@contoso.com', including a count of returned objects, with the results ordered by userPrincipalName

#### Request

The following example shows a request. This request requires the **ConsistencyLevel** header set to `eventual` and the `$count=true` query string because the request has both the `$orderby` and `$filter` query parameters, and also uses the `endsWith` operator. For more information about the use of **ConsistencyLevel** and `$count`, see [Advanced query capabilities on directory objects](/en-us/graph/aad-advanced-queries).

> 
> **Note:** The `$count` and `$search` query parameters are currently not available in Azure AD B2C tenants.

# [HTTP](#tab/http)
```msgraph
GET https://graph.microsoft.com/v1.0/users?$filter=endswith(mail,'a@contoso.com')&$orderby=userPrincipalName&$count=true
ConsistencyLevel: eventual
```

# [C#](#tab/csharp)
```csharp

// Code snippets are only available for the latest version. Current version is 5.x

// To initialize your graphClient, see https://learn.microsoft.com/en-us/graph/sdks/create-client?from=snippets&tabs=csharp
var result = await graphClient.Users.GetAsync((requestConfiguration) =>
{requestConfiguration.QueryParameters.Filter = "endswith(mail,'a@contoso.com')";requestConfiguration.QueryParameters.Orderby = new string []{ "userPrincipalName" };requestConfiguration.QueryParameters.Count = true;requestConfiguration.Headers.Add("ConsistencyLevel", "eventual");
});

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Go](#tab/go)
```go

// Code snippets are only available for the latest major version. Current major version is $v1.*

// Dependencies
import (  "context"  abstractions "github.com/microsoft/kiota-abstractions-go"  msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"  graphusers "github.com/microsoftgraph/msgraph-sdk-go/users"  //other-imports
)

headers := abstractions.NewRequestHeaders()
headers.Add("ConsistencyLevel", "eventual")

requestFilter := "endswith(mail,'a@contoso.com')"
requestCount := true

requestParameters := &graphusers.UsersRequestBuilderGetQueryParameters{Filter: &requestFilter,Orderby: [] string {"userPrincipalName"},Count: &requestCount,
}
configuration := &graphusers.UsersRequestBuilderGetRequestConfiguration{Headers: headers,QueryParameters: requestParameters,
}

// To initialize your graphClient, see https://learn.microsoft.com/en-us/graph/sdks/create-client?from=snippets&tabs=go
users, err := graphClient.Users().Get(context.Background(), configuration)

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Java](#tab/java)
```java

// Code snippets are only available for the latest version. Current version is 6.x

GraphServiceClient graphClient = new GraphServiceClient(requestAdapter);

UserCollectionResponse result = graphClient.users().get(requestConfiguration -> {requestConfiguration.queryParameters.filter = "endswith(mail,'a@contoso.com')";requestConfiguration.queryParameters.orderby = new String []{"userPrincipalName"};requestConfiguration.queryParameters.count = true;requestConfiguration.headers.add("ConsistencyLevel", "eventual");
});

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [JavaScript](#tab/javascript)
```javascript

const options = {authProvider,
};

const client = Client.init(options);

let users = await client.api('/users').header('ConsistencyLevel','eventual').filter('endswith(mail,\'a@contoso.com\')').orderby('userPrincipalName').get();

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [PHP](#tab/php)
```php

<?php
use Microsoft\Graph\GraphServiceClient;
use Microsoft\Graph\Generated\Users\UsersRequestBuilderGetRequestConfiguration;

$graphServiceClient = new GraphServiceClient($tokenRequestContext, $scopes);

$requestConfiguration = new UsersRequestBuilderGetRequestConfiguration();
$headers = [	'ConsistencyLevel' => 'eventual',];
$requestConfiguration->headers = $headers;

$queryParameters = UsersRequestBuilderGetRequestConfiguration::createQueryParameters();
$queryParameters->filter = "endswith(mail,'a@contoso.com')";
$queryParameters->orderby = ["userPrincipalName"];
$queryParameters->count = true;
$requestConfiguration->queryParameters = $queryParameters;

$result = $graphServiceClient->users()->get($requestConfiguration)->wait();

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [PowerShell](#tab/powershell)
```powershell

Import-Module Microsoft.Graph.Users

Get-MgUser -Filter "endswith(mail,'a@contoso.com')" -Sort "userPrincipalName" -CountVariable CountVar  -ConsistencyLevel eventual 

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Python](#tab/python)
```python

# Code snippets are only available for the latest version. Current version is 1.x
from msgraph import GraphServiceClient
from msgraph.generated.users.users_request_builder import UsersRequestBuilder
from kiota_abstractions.base_request_configuration import RequestConfiguration
# To initialize your graph_client, see https://learn.microsoft.com/en-us/graph/sdks/create-client?from=snippets&tabs=python
query_params = UsersRequestBuilder.UsersRequestBuilderGetQueryParameters(	filter = "endswith(mail,'a@contoso.com')",	orderby = ["userPrincipalName"],	count = True,
)

request_configuration = RequestConfiguration(
query_parameters = query_params,
)
request_configuration.headers.add("ConsistencyLevel", "eventual")

result = await graph_client.users.get(request_configuration = request_configuration)

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

---

#### Response

The following example shows the response.

> 
> **Note:** The response object shown here might be shortened for readability.

```http
HTTP/1.1 200 OK
Content-type: application/json

{
  "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#users",
  "@odata.count": 1,
  "value": [
    {
      "displayName": "Grady Archie",
      "givenName": "Grady",
      "jobTitle": "Designer",
      "mail": "GradyA@contoso.com",
      "userPrincipalName": "GradyA@contoso.com",
      "id": "e8b753b5-4117-464e-9a08-713e1ff266b3"
      }
    ]
}
```

### Example 6: Use $search to get users with display names that contain the letters 'wa' including a count of returned objects

#### Request

The following example shows a request. This request requires the **ConsistencyLevel** header set to `eventual` because `$search` is in the request. For more information about the use of **ConsistencyLevel** and `$count`, see [Advanced query capabilities on directory objects](/en-us/graph/aad-advanced-queries).

> 
> **Note:** The `$count` and `$search` query parameters are currently not available in Azure AD B2C tenants.

# [HTTP](#tab/http)
```msgraph
GET https://graph.microsoft.com/v1.0/users?$search="displayName:wa"&$orderby=displayName&$count=true
ConsistencyLevel: eventual
```

# [C#](#tab/csharp)
```csharp

// Code snippets are only available for the latest version. Current version is 5.x

// To initialize your graphClient, see https://learn.microsoft.com/en-us/graph/sdks/create-client?from=snippets&tabs=csharp
var result = await graphClient.Users.GetAsync((requestConfiguration) =>
{requestConfiguration.QueryParameters.Search = "\"displayName:wa\"";requestConfiguration.QueryParameters.Orderby = new string []{ "displayName" };requestConfiguration.QueryParameters.Count = true;requestConfiguration.Headers.Add("ConsistencyLevel", "eventual");
});

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Go](#tab/go)
```go

// Code snippets are only available for the latest major version. Current major version is $v1.*

// Dependencies
import (  "context"  abstractions "github.com/microsoft/kiota-abstractions-go"  msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"  graphusers "github.com/microsoftgraph/msgraph-sdk-go/users"  //other-imports
)

headers := abstractions.NewRequestHeaders()
headers.Add("ConsistencyLevel", "eventual")

requestSearch := "\"displayName:wa\""
requestCount := true

requestParameters := &graphusers.UsersRequestBuilderGetQueryParameters{Search: &requestSearch,Orderby: [] string {"displayName"},Count: &requestCount,
}
configuration := &graphusers.UsersRequestBuilderGetRequestConfiguration{Headers: headers,QueryParameters: requestParameters,
}

// To initialize your graphClient, see https://learn.microsoft.com/en-us/graph/sdks/create-client?from=snippets&tabs=go
users, err := graphClient.Users().Get(context.Background(), configuration)

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Java](#tab/java)
```java

// Code snippets are only available for the latest version. Current version is 6.x

GraphServiceClient graphClient = new GraphServiceClient(requestAdapter);

UserCollectionResponse result = graphClient.users().get(requestConfiguration -> {requestConfiguration.queryParameters.search = "\"displayName:wa\"";requestConfiguration.queryParameters.orderby = new String []{"displayName"};requestConfiguration.queryParameters.count = true;requestConfiguration.headers.add("ConsistencyLevel", "eventual");
});

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [JavaScript](#tab/javascript)
```javascript

const options = {authProvider,
};

const client = Client.init(options);

let users = await client.api('/users').header('ConsistencyLevel','eventual').search('displayName:wa').orderby('displayName').get();

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [PHP](#tab/php)
```php

<?php
use Microsoft\Graph\GraphServiceClient;
use Microsoft\Graph\Generated\Users\UsersRequestBuilderGetRequestConfiguration;

$graphServiceClient = new GraphServiceClient($tokenRequestContext, $scopes);

$requestConfiguration = new UsersRequestBuilderGetRequestConfiguration();
$headers = [	'ConsistencyLevel' => 'eventual',];
$requestConfiguration->headers = $headers;

$queryParameters = UsersRequestBuilderGetRequestConfiguration::createQueryParameters();
$queryParameters->search = "\"displayName:wa\"";
$queryParameters->orderby = ["displayName"];
$queryParameters->count = true;
$requestConfiguration->queryParameters = $queryParameters;

$result = $graphServiceClient->users()->get($requestConfiguration)->wait();

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [PowerShell](#tab/powershell)
```powershell

Import-Module Microsoft.Graph.Users

Get-MgUser -Search '"displayName:wa"' -Sort "displayName" -CountVariable CountVar  -ConsistencyLevel eventual 

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Python](#tab/python)
```python

# Code snippets are only available for the latest version. Current version is 1.x
from msgraph import GraphServiceClient
from msgraph.generated.users.users_request_builder import UsersRequestBuilder
from kiota_abstractions.base_request_configuration import RequestConfiguration
# To initialize your graph_client, see https://learn.microsoft.com/en-us/graph/sdks/create-client?from=snippets&tabs=python
query_params = UsersRequestBuilder.UsersRequestBuilderGetQueryParameters(	search = "\"displayName:wa\"",	orderby = ["displayName"],	count = True,
)

request_configuration = RequestConfiguration(
query_parameters = query_params,
)
request_configuration.headers.add("ConsistencyLevel", "eventual")

result = await graph_client.users.get(request_configuration = request_configuration)

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

---

#### Response

The following example shows the response.

> 
> **Note:** The response object shown here might be shortened for readability.

```http
HTTP/1.1 200 OK
Content-type: application/json

{
  "@odata.context":"https://graph.microsoft.com/v1.0/$metadata#users",
  "@odata.count":7,
  "value":[
    {
      "displayName":"Oscar Ward",
      "givenName":"Oscar",
      "mail":"oscarward@contoso.com",
      "userPrincipalName":"oscarward@contoso.com"
    }
  ]
}
```

### Example 7: Use $search to get users with display names that contain the letters 'wa' or the letters 'ad' including a count of returned objects

#### Request

The following example shows a request. This request requires the **ConsistencyLevel** header set to `eventual` because `$search` is in the request. For more information about the use of **ConsistencyLevel** and `$count`, see [Advanced query capabilities on directory objects](/en-us/graph/aad-advanced-queries).

> 
> **Note:** The `$count` and `$search` query parameters are currently not available in Azure AD B2C tenants.

# [HTTP](#tab/http)
```msgraph
GET https://graph.microsoft.com/v1.0/users?$search="displayName:wa" OR "displayName:ad"&$orderbydisplayName&$count=true
ConsistencyLevel: eventual
```

# [C#](#tab/csharp)
```
Snippet not available
```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Go](#tab/go)
```
Snippet not available
```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Java](#tab/java)
```
Snippet not available
```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [JavaScript](#tab/javascript)
```
Snippet not available
```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [PHP](#tab/php)
```
Snippet not available
```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [PowerShell](#tab/powershell)
```powershell

Import-Module Microsoft.Graph.Users

Get-MgUser -Search '"displayName:wa" OR "displayName:ad"' -Orderbydisplayname =  -CountVariable CountVar  -ConsistencyLevel eventual 

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Python](#tab/python)
```
Snippet not available
```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

---

#### Response

The following example shows the response.

> 
> **Note:** The response object shown here might be shortened for readability.

```http
HTTP/1.1 200 OK
Content-type: application/json

{
  "@odata.context":"https://graph.microsoft.com/v1.0/$metadata#users",
  "@odata.count":7,
  "value":[
    {
      "displayName":"Oscar Ward",
      "givenName":"Oscar",
      "mail":"oscarward@contoso.com",
      "userPrincipalName":"oscarward@contoso.com"
    },
    {
      "displayName":"contosoAdmin1",
      "givenName":"Contoso Administrator",
      "mail":"'contosoadmin1@fabrikam.com",
      "userPrincipalName":"contosoadmin1_fabrikam.com#EXT#@contoso.com"
    }
  ]
}
```

### Example 8: Get guest (B2B) users from a specific tenant or domain by userPrincipalName

#### Request

The following example shows a request. The userPrincipalName value for guest (B2B collaboration) users always contains the "#EXT#" identifier. For example, the userPrincipalName of a user in their home tenant is *AdeleV@adatum.com*. When you invite the user to collaborate in your tenant, *contoso.com*, their userPrincipalName in your tenant is "AdeleV\_adatum.com#EXT#@contoso.com".

This request requires the **ConsistencyLevel** header set to `eventual` and the `$count=true` query string because the request includes the endsWith operator. For more information about the use of **ConsistencyLevel** and `$count`, see [Advanced query capabilities on directory objects](/en-us/graph/aad-advanced-queries).

> 
> **NOTE:** You must encode the reserved character "#" in the userPrincipalName value as "%23" in the request URL. For more information, see [Encoding special characters](/en-us/graph/query-parameters#encoding-query-parameters).

# [HTTP](#tab/http)
```msgraph
GET https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,identities&$filter=endsWith(userPrincipalName,'%23EXT%23@contoso.com')&$count=true
ConsistencyLevel: eventual
```

# [C#](#tab/csharp)
```csharp

// Code snippets are only available for the latest version. Current version is 5.x

// To initialize your graphClient, see https://learn.microsoft.com/en-us/graph/sdks/create-client?from=snippets&tabs=csharp
var result = await graphClient.Users.GetAsync((requestConfiguration) =>
{requestConfiguration.QueryParameters.Select = new string []{ "id","displayName","mail","identities" };requestConfiguration.QueryParameters.Filter = "endsWith(userPrincipalName,'";requestConfiguration.Headers.Add("ConsistencyLevel", "eventual");
});

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Go](#tab/go)
```go

// Code snippets are only available for the latest major version. Current major version is $v1.*

// Dependencies
import (  "context"  abstractions "github.com/microsoft/kiota-abstractions-go"  msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"  graphusers "github.com/microsoftgraph/msgraph-sdk-go/users"  //other-imports
)

headers := abstractions.NewRequestHeaders()
headers.Add("ConsistencyLevel", "eventual")

requestFilter := "endsWith(userPrincipalName,'"

requestParameters := &graphusers.UsersRequestBuilderGetQueryParameters{Select: [] string {"id","displayName","mail","identities"},Filter: &requestFilter,
}
configuration := &graphusers.UsersRequestBuilderGetRequestConfiguration{Headers: headers,QueryParameters: requestParameters,
}

// To initialize your graphClient, see https://learn.microsoft.com/en-us/graph/sdks/create-client?from=snippets&tabs=go
users, err := graphClient.Users().Get(context.Background(), configuration)

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Java](#tab/java)
```java

// Code snippets are only available for the latest version. Current version is 6.x

GraphServiceClient graphClient = new GraphServiceClient(requestAdapter);

UserCollectionResponse result = graphClient.users().get(requestConfiguration -> {requestConfiguration.queryParameters.select = new String []{"id", "displayName", "mail", "identities"};requestConfiguration.queryParameters.filter = "endsWith(userPrincipalName,'";requestConfiguration.headers.add("ConsistencyLevel", "eventual");
});

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [JavaScript](#tab/javascript)
```
Snippet not available
```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [PHP](#tab/php)
```php

<?php
use Microsoft\Graph\GraphServiceClient;
use Microsoft\Graph\Generated\Users\UsersRequestBuilderGetRequestConfiguration;

$graphServiceClient = new GraphServiceClient($tokenRequestContext, $scopes);

$requestConfiguration = new UsersRequestBuilderGetRequestConfiguration();
$headers = [	'ConsistencyLevel' => 'eventual',];
$requestConfiguration->headers = $headers;

$queryParameters = UsersRequestBuilderGetRequestConfiguration::createQueryParameters();
$queryParameters->select = ["id","displayName","mail","identities"];
$queryParameters->filter = "endsWith(userPrincipalName,'";
$requestConfiguration->queryParameters = $queryParameters;

$result = $graphServiceClient->users()->get($requestConfiguration)->wait();

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [PowerShell](#tab/powershell)
```powershell

Import-Module Microsoft.Graph.Users

Get-MgUser -Property "id,displayName,mail,identities" -Filter "endsWith(userPrincipalName,'"  -ConsistencyLevel eventual 

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Python](#tab/python)
```python

# Code snippets are only available for the latest version. Current version is 1.x
from msgraph import GraphServiceClient
from msgraph.generated.users.users_request_builder import UsersRequestBuilder
from kiota_abstractions.base_request_configuration import RequestConfiguration
# To initialize your graph_client, see https://learn.microsoft.com/en-us/graph/sdks/create-client?from=snippets&tabs=python
query_params = UsersRequestBuilder.UsersRequestBuilderGetQueryParameters(	select = ["id","displayName","mail","identities"],	filter = "endsWith(userPrincipalName,'",
)

request_configuration = RequestConfiguration(
query_parameters = query_params,
)
request_configuration.headers.add("ConsistencyLevel", "eventual")

result = await graph_client.users.get(request_configuration = request_configuration)

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

---

#### Response

The following example shows the response.

> 
> **Note:** The response object shown here might be shortened for readability.

```http
HTTP/1.1 200 OK
Content-type: application/json

{
    "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#users(id,displayName,mail,identities)",
    "@odata.count": 2,
    "value": [
        {
            "id": "39807bd1-3dde-48f3-8165-81ddd4e46de0",
            "displayName": "Adele Vance",
            "mail": "AdeleV@adatum.com",
            "identities": [
                {
                    "signInType": "userPrincipalName",
                    "issuer": "contoso.com",
                    "issuerAssignedId": "AdeleV_adatum.com#EXT#@cntoso.com"
                }
            ]
        }
    ]
}
```

### Example 9: Use $filter to get users who are assigned a specific license

#### Request

The following example shows a request.

```msgraph
GET https://graph.microsoft.com/v1.0/users?$select=id,mail,assignedLicenses&$filter=assignedLicenses/any(u:u/skuId eq cbdc14ab-d96c-4c30-b9f4-6ada7cdc1d46)
```

#### Response

The following example shows the response.

```http
HTTP/1.1 200 OK
Content-type: application/json

{
  "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#users(id,mail,assignedLicenses)",
  "value": [
    {
      "id": "cb4954e8-467f-4a6d-a8c8-28b9034fadbc",
      "mail": "admin@contoso.com",
      "assignedLicenses": [
        {
          "disabledPlans": [],
          "skuId": "cbdc14ab-d96c-4c30-b9f4-6ada7cdc1d46"
        }
      ]
    },
    {
      "id": "81a133c2-bdf2-4e67-8755-7264366b04ee",
      "mail": "DebraB@contoso.com",
      "assignedLicenses": [
        {
          "disabledPlans": [],
          "skuId": "cbdc14ab-d96c-4c30-b9f4-6ada7cdc1d46"
        }
      ]
    }
  ]
}
```

### Example 10: Get the value of a schema extension for all users

In this example, the ID of the schema extension is `ext55gb1l09_msLearnCourses`.

#### Request

# [HTTP](#tab/http)
```msgraph
GET https://graph.microsoft.com/v1.0/users?$select=ext55gb1l09_msLearnCourses
```

# [C#](#tab/csharp)
```csharp

// Code snippets are only available for the latest version. Current version is 5.x

// To initialize your graphClient, see https://learn.microsoft.com/en-us/graph/sdks/create-client?from=snippets&tabs=csharp
var result = await graphClient.Users.GetAsync((requestConfiguration) =>
{requestConfiguration.QueryParameters.Select = new string []{ "ext55gb1l09_msLearnCourses" };
});

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Go](#tab/go)
```go

// Code snippets are only available for the latest major version. Current major version is $v1.*

// Dependencies
import (  "context"  msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"  graphusers "github.com/microsoftgraph/msgraph-sdk-go/users"  //other-imports
)

requestParameters := &graphusers.UsersRequestBuilderGetQueryParameters{Select: [] string {"ext55gb1l09_msLearnCourses"},
}
configuration := &graphusers.UsersRequestBuilderGetRequestConfiguration{QueryParameters: requestParameters,
}

// To initialize your graphClient, see https://learn.microsoft.com/en-us/graph/sdks/create-client?from=snippets&tabs=go
users, err := graphClient.Users().Get(context.Background(), configuration)

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Java](#tab/java)
```java

// Code snippets are only available for the latest version. Current version is 6.x

GraphServiceClient graphClient = new GraphServiceClient(requestAdapter);

UserCollectionResponse result = graphClient.users().get(requestConfiguration -> {requestConfiguration.queryParameters.select = new String []{"ext55gb1l09_msLearnCourses"};
});

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [JavaScript](#tab/javascript)
```javascript

const options = {authProvider,
};

const client = Client.init(options);

let users = await client.api('/users').select('ext55gb1l09_msLearnCourses').get();

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [PHP](#tab/php)
```php

<?php
use Microsoft\Graph\GraphServiceClient;
use Microsoft\Graph\Generated\Users\UsersRequestBuilderGetRequestConfiguration;

$graphServiceClient = new GraphServiceClient($tokenRequestContext, $scopes);

$requestConfiguration = new UsersRequestBuilderGetRequestConfiguration();
$queryParameters = UsersRequestBuilderGetRequestConfiguration::createQueryParameters();
$queryParameters->select = ["ext55gb1l09_msLearnCourses"];
$requestConfiguration->queryParameters = $queryParameters;

$result = $graphServiceClient->users()->get($requestConfiguration)->wait();

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [PowerShell](#tab/powershell)
```powershell

Import-Module Microsoft.Graph.Users

Get-MgUser -Property "ext55gb1l09_msLearnCourses" 

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Python](#tab/python)
```python

# Code snippets are only available for the latest version. Current version is 1.x
from msgraph import GraphServiceClient
from msgraph.generated.users.users_request_builder import UsersRequestBuilder
from kiota_abstractions.base_request_configuration import RequestConfiguration
# To initialize your graph_client, see https://learn.microsoft.com/en-us/graph/sdks/create-client?from=snippets&tabs=python
query_params = UsersRequestBuilder.UsersRequestBuilderGetQueryParameters(	select = ["ext55gb1l09_msLearnCourses"],
)

request_configuration = RequestConfiguration(
query_parameters = query_params,
)

result = await graph_client.users.get(request_configuration = request_configuration)

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

---

#### Response

In the following response, the schema extension property `ext55gb1l09_msLearnCourses` is unassigned in two of the user objects.

```http
HTTP/1.1 200 OK
Content-type: application/json

{
    "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#users(ext55gb1l09_msLearnCourses)",
    "value": [
        {},
        {
            "ext55gb1l09_msLearnCourses": {
                "@odata.type": "#microsoft.graph.ComplexExtensionValue",
                "courseType": "Developer",
                "courseName": "Introduction to Microsoft Graph",
                "courseId": 1
            }
        },
        {}
    ]
}
```

> 
> **Note:** You can also apply `$filter` on the schema extension property to retrieve objects where a property in the collection matches a specified value. The syntax is `/users?$filter={schemaPropertyID}/{propertyName} eq 'value'`. For example, `GET /users?$select=ext55gb1l09_msLearnCourses&$filter=ext55gb1l09_msLearnCourses/courseType eq 'Developer'`. The `eq` and `not` operators are supported.

### Example 11: Get users including their last sign-in time

#### Request

The following example shows a request.

Note

- Details for the **signInActivity** property require a Microsoft Entra ID P1 or P2 license and the `AuditLog.Read.All` permission.
- When you specify `$select=signInActivity` or `$filter=signInActivity` when listing users, the maximum page size for `$top` is 500. Requests with `$top` set higher than 500 return pages with up to 500 users. The **signInActivity** property supports `$filter` (`eq`, `ne`, `not`, `ge`, `le`) *but* not with any other filterable properties.

# [HTTP](#tab/http)
```msgraph
GET https://graph.microsoft.com/v1.0/users?$select=displayName,userPrincipalName,signInActivity
```

# [C#](#tab/csharp)
```csharp

// Code snippets are only available for the latest version. Current version is 5.x

// To initialize your graphClient, see https://learn.microsoft.com/en-us/graph/sdks/create-client?from=snippets&tabs=csharp
var result = await graphClient.Users.GetAsync((requestConfiguration) =>
{requestConfiguration.QueryParameters.Select = new string []{ "displayName","userPrincipalName","signInActivity" };
});

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Go](#tab/go)
```go

// Code snippets are only available for the latest major version. Current major version is $v1.*

// Dependencies
import (  "context"  msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"  graphusers "github.com/microsoftgraph/msgraph-sdk-go/users"  //other-imports
)

requestParameters := &graphusers.UsersRequestBuilderGetQueryParameters{Select: [] string {"displayName","userPrincipalName","signInActivity"},
}
configuration := &graphusers.UsersRequestBuilderGetRequestConfiguration{QueryParameters: requestParameters,
}

// To initialize your graphClient, see https://learn.microsoft.com/en-us/graph/sdks/create-client?from=snippets&tabs=go
users, err := graphClient.Users().Get(context.Background(), configuration)

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Java](#tab/java)
```java

// Code snippets are only available for the latest version. Current version is 6.x

GraphServiceClient graphClient = new GraphServiceClient(requestAdapter);

UserCollectionResponse result = graphClient.users().get(requestConfiguration -> {requestConfiguration.queryParameters.select = new String []{"displayName", "userPrincipalName", "signInActivity"};
});

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [JavaScript](#tab/javascript)
```javascript

const options = {authProvider,
};

const client = Client.init(options);

let users = await client.api('/users').select('displayName,userPrincipalName,signInActivity').get();

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [PHP](#tab/php)
```php

<?php
use Microsoft\Graph\GraphServiceClient;
use Microsoft\Graph\Generated\Users\UsersRequestBuilderGetRequestConfiguration;

$graphServiceClient = new GraphServiceClient($tokenRequestContext, $scopes);

$requestConfiguration = new UsersRequestBuilderGetRequestConfiguration();
$queryParameters = UsersRequestBuilderGetRequestConfiguration::createQueryParameters();
$queryParameters->select = ["displayName","userPrincipalName","signInActivity"];
$requestConfiguration->queryParameters = $queryParameters;

$result = $graphServiceClient->users()->get($requestConfiguration)->wait();

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [PowerShell](#tab/powershell)
```powershell

Import-Module Microsoft.Graph.Users

Get-MgUser -Property "displayName,userPrincipalName,signInActivity" 

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Python](#tab/python)
```python

# Code snippets are only available for the latest version. Current version is 1.x
from msgraph import GraphServiceClient
from msgraph.generated.users.users_request_builder import UsersRequestBuilder
from kiota_abstractions.base_request_configuration import RequestConfiguration
# To initialize your graph_client, see https://learn.microsoft.com/en-us/graph/sdks/create-client?from=snippets&tabs=python
query_params = UsersRequestBuilder.UsersRequestBuilderGetQueryParameters(	select = ["displayName","userPrincipalName","signInActivity"],
)

request_configuration = RequestConfiguration(
query_parameters = query_params,
)

result = await graph_client.users.get(request_configuration = request_configuration)

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

---

#### Response

The following example shows the response.

> 
> **Note:** The response object shown here might be shortened for readability.

```http
HTTP/1.1 200 OK
Content-type: application/json

{
  "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#users(displayName,userPrincipalName,signInActivity)",
  "value": [
    {
      "displayName": "Adele Vance",
      "userPrincipalName": "AdeleV@contoso.com",
      "id": "1aecaf40-dc3a-461f-88a8-d06994e12898",
      "signInActivity": {
        "lastSignInDateTime": "2021-06-17T16:41:33Z",
        "lastSignInRequestId": "d4d31c40-4c36-4775-ad59-7d1e6a171f00",
        "lastNonInteractiveSignInDateTime": "0001-01-01T00:00:00Z",
        "lastNonInteractiveSignInRequestId": "",
        "lastSuccessfulSignInDateTime": "",
        "lastSuccessfulSignInRequestId": ""
      }
    },
    {
      "displayName": "Alex Wilber",
      "userPrincipalName": "AlexW@contoso.com",
      "id": "f0662ee5-84b1-43d6-8338-769cce1bc141",
      "signInActivity": {
        "lastSignInDateTime": "2021-07-29T15:53:27Z",
        "lastSignInRequestId": "f3149ee1-e347-4181-b45b-99a1f82b1c00",
        "lastNonInteractiveSignInDateTime": "2021-07-29T17:53:42Z",
        "lastNonInteractiveSignInRequestId": "868efa6a-b2e9-40e9-9b1c-0aaea5b50200",
        "lastSuccessfulSignInDateTime": "",
        "lastSuccessfulSignInRequestId": ""
      }
    }
  ]
}
```

### Example 12: Use $filter and endsWith to get users with a specified top-level domain in otherMails

#### Request

The following example shows a request. This request requires the **ConsistencyLevel** header set to `eventual` because `$count` is in the request. For more information about the use of **ConsistencyLevel** and `$count`, see [Advanced query capabilities on directory objects](/en-us/graph/aad-advanced-queries).

# [HTTP](#tab/http)
```msgraph
GET https://graph.microsoft.com/v1.0/users?$filter=otherMails/any(x:endswith(x,'.edu'))&$count=true
ConsistencyLevel: eventual
```

# [C#](#tab/csharp)
```csharp

// Code snippets are only available for the latest version. Current version is 5.x

// To initialize your graphClient, see https://learn.microsoft.com/en-us/graph/sdks/create-client?from=snippets&tabs=csharp
var result = await graphClient.Users.GetAsync((requestConfiguration) =>
{requestConfiguration.QueryParameters.Filter = "otherMails/any(x:endswith(x,'.edu'))";requestConfiguration.QueryParameters.Count = true;requestConfiguration.Headers.Add("ConsistencyLevel", "eventual");
});

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Go](#tab/go)
```go

// Code snippets are only available for the latest major version. Current major version is $v1.*

// Dependencies
import (  "context"  abstractions "github.com/microsoft/kiota-abstractions-go"  msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"  graphusers "github.com/microsoftgraph/msgraph-sdk-go/users"  //other-imports
)

headers := abstractions.NewRequestHeaders()
headers.Add("ConsistencyLevel", "eventual")

requestFilter := "otherMails/any(x:endswith(x,'.edu'))"
requestCount := true

requestParameters := &graphusers.UsersRequestBuilderGetQueryParameters{Filter: &requestFilter,Count: &requestCount,
}
configuration := &graphusers.UsersRequestBuilderGetRequestConfiguration{Headers: headers,QueryParameters: requestParameters,
}

// To initialize your graphClient, see https://learn.microsoft.com/en-us/graph/sdks/create-client?from=snippets&tabs=go
users, err := graphClient.Users().Get(context.Background(), configuration)

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Java](#tab/java)
```java

// Code snippets are only available for the latest version. Current version is 6.x

GraphServiceClient graphClient = new GraphServiceClient(requestAdapter);

UserCollectionResponse result = graphClient.users().get(requestConfiguration -> {requestConfiguration.queryParameters.filter = "otherMails/any(x:endswith(x,'.edu'))";requestConfiguration.queryParameters.count = true;requestConfiguration.headers.add("ConsistencyLevel", "eventual");
});

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [JavaScript](#tab/javascript)
```javascript

const options = {authProvider,
};

const client = Client.init(options);

let users = await client.api('/users').header('ConsistencyLevel','eventual').filter('otherMails/any(x:endswith(x,\'.edu\'))').get();

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [PHP](#tab/php)
```php

<?php
use Microsoft\Graph\GraphServiceClient;
use Microsoft\Graph\Generated\Users\UsersRequestBuilderGetRequestConfiguration;

$graphServiceClient = new GraphServiceClient($tokenRequestContext, $scopes);

$requestConfiguration = new UsersRequestBuilderGetRequestConfiguration();
$headers = [	'ConsistencyLevel' => 'eventual',];
$requestConfiguration->headers = $headers;

$queryParameters = UsersRequestBuilderGetRequestConfiguration::createQueryParameters();
$queryParameters->filter = "otherMails/any(x:endswith(x,'.edu'))";
$queryParameters->count = true;
$requestConfiguration->queryParameters = $queryParameters;

$result = $graphServiceClient->users()->get($requestConfiguration)->wait();

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [PowerShell](#tab/powershell)
```powershell

Import-Module Microsoft.Graph.Users

Get-MgUser -Filter "otherMails/any(x:endswith(x,'.edu'))" -CountVariable CountVar  -ConsistencyLevel eventual 

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Python](#tab/python)
```python

# Code snippets are only available for the latest version. Current version is 1.x
from msgraph import GraphServiceClient
from msgraph.generated.users.users_request_builder import UsersRequestBuilder
from kiota_abstractions.base_request_configuration import RequestConfiguration
# To initialize your graph_client, see https://learn.microsoft.com/en-us/graph/sdks/create-client?from=snippets&tabs=python
query_params = UsersRequestBuilder.UsersRequestBuilderGetQueryParameters(	filter = "otherMails/any(x:endswith(x,'.edu'))",	count = True,
)

request_configuration = RequestConfiguration(
query_parameters = query_params,
)
request_configuration.headers.add("ConsistencyLevel", "eventual")

result = await graph_client.users.get(request_configuration = request_configuration)

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

---

#### Response

> 
> **Note:** The response object shown here might be shortened for readability.

```http
HTTP/1.1 200 OK
Content-type: application/json

{
    "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#users",
    "@odata.count": 2,
    "value": [
        {
            "displayName": "Isaiah Langer",
            "mail": "isaiahl@fineartschool.edu",
            "id": "0012cd20-3890-409e-9db3-afc3055ebe22"
        },
        {
            "displayName": "Adele Vance",
            "mail": "adelev@bellowscollege.edu",
            "id": "0012cd20-3890-409e-9db3-afc3055ebe22"
        }
    ]
}
```

### Example 13: List all users whose management is restricted

The following example shows how to list all users whose management is restricted.

#### Request

The following example shows a request.

# [HTTP](#tab/http)
```msgraph
GET https://graph.microsoft.com/v1.0/users?$filter=isManagementRestricted eq true&$select=displayName,userPrincipalName
```

# [C#](#tab/csharp)
```csharp

// Code snippets are only available for the latest version. Current version is 5.x

// To initialize your graphClient, see https://learn.microsoft.com/en-us/graph/sdks/create-client?from=snippets&tabs=csharp
var result = await graphClient.Users.GetAsync((requestConfiguration) =>
{requestConfiguration.QueryParameters.Filter = "isManagementRestricted eq true";requestConfiguration.QueryParameters.Select = new string []{ "displayName","userPrincipalName" };
});

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Go](#tab/go)
```go

// Code snippets are only available for the latest major version. Current major version is $v1.*

// Dependencies
import (  "context"  msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"  graphusers "github.com/microsoftgraph/msgraph-sdk-go/users"  //other-imports
)

requestFilter := "isManagementRestricted eq true"

requestParameters := &graphusers.UsersRequestBuilderGetQueryParameters{Filter: &requestFilter,Select: [] string {"displayName","userPrincipalName"},
}
configuration := &graphusers.UsersRequestBuilderGetRequestConfiguration{QueryParameters: requestParameters,
}

// To initialize your graphClient, see https://learn.microsoft.com/en-us/graph/sdks/create-client?from=snippets&tabs=go
users, err := graphClient.Users().Get(context.Background(), configuration)

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Java](#tab/java)
```java

// Code snippets are only available for the latest version. Current version is 6.x

GraphServiceClient graphClient = new GraphServiceClient(requestAdapter);

UserCollectionResponse result = graphClient.users().get(requestConfiguration -> {requestConfiguration.queryParameters.filter = "isManagementRestricted eq true";requestConfiguration.queryParameters.select = new String []{"displayName", "userPrincipalName"};
});

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [JavaScript](#tab/javascript)
```javascript

const options = {authProvider,
};

const client = Client.init(options);

let users = await client.api('/users').filter('isManagementRestricted eq true').select('displayName,userPrincipalName').get();

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [PHP](#tab/php)
```php

<?php
use Microsoft\Graph\GraphServiceClient;
use Microsoft\Graph\Generated\Users\UsersRequestBuilderGetRequestConfiguration;

$graphServiceClient = new GraphServiceClient($tokenRequestContext, $scopes);

$requestConfiguration = new UsersRequestBuilderGetRequestConfiguration();
$queryParameters = UsersRequestBuilderGetRequestConfiguration::createQueryParameters();
$queryParameters->filter = "isManagementRestricted eq true";
$queryParameters->select = ["displayName","userPrincipalName"];
$requestConfiguration->queryParameters = $queryParameters;

$result = $graphServiceClient->users()->get($requestConfiguration)->wait();

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [PowerShell](#tab/powershell)
```powershell

Import-Module Microsoft.Graph.Users

Get-MgUser -Filter "isManagementRestricted eq true" -Property "displayName,userPrincipalName" 

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

# [Python](#tab/python)
```python

# Code snippets are only available for the latest version. Current version is 1.x
from msgraph import GraphServiceClient
from msgraph.generated.users.users_request_builder import UsersRequestBuilder
from kiota_abstractions.base_request_configuration import RequestConfiguration
# To initialize your graph_client, see https://learn.microsoft.com/en-us/graph/sdks/create-client?from=snippets&tabs=python
query_params = UsersRequestBuilder.UsersRequestBuilderGetQueryParameters(	filter = "isManagementRestricted eq true",	select = ["displayName","userPrincipalName"],
)

request_configuration = RequestConfiguration(
query_parameters = query_params,
)

result = await graph_client.users.get(request_configuration = request_configuration)

```

> 
> For details about how to [add the SDK](/en-us/graph/sdks/sdk-installation) to your project and [create an authProvider](/en-us/graph/sdks/choose-authentication-providers) instance, see the [SDK documentation](/en-us/graph/sdks/sdks-overview).

---

#### Response

The following example shows the response.

> 
> **Note:** The response object shown here might be shortened for readability.

```http
HTTP/1.1 200 OK
Content-type: application/json

{
  "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#users(displayName,userPrincipalName)",
  "value": [
    {
      "displayName": "Adele",
      "userPrincipalName": "Adele@contoso.com"
    },
    {
      "displayName": "Bob",
      "userPrincipalName": "Bob@contoso.com"
    }
  ]
}
```

---

## Other Supported Versions

- [graph-rest-beta](https://learn.microsoft.com/en-us/graph/api/user-list?view=graph-rest-beta&accept=text/markdown)
