# RingCentral API Reference

Source: https://developers.ringcentral.com/api-reference

The full RingCentral OpenAPI 3.0 specification is available in the companion file: `ringcentral-api-reference.yml` (1.5MB).

## Base URLs

| Environment | URL |
| --- | --- |
| Production API | https://platform.ringcentral.com |
| Production Media | https://media.ringcentral.com |
| Developer Sandbox API | https://platform.devtest.ringcentral.com |

## API Version

- OpenAPI: 3.0.3
- RingCentral API: 1.0.58 (2024-05-29)

## API Categories

### Voice
- Business Hours
- Call Blocking, Control, Forwarding
- Call Handling Rules (Interaction Rules, State-based Rules)
- Call Flip
- Call Log (History, Export)
- Call Monitoring Groups
- Call Queues
- Call Recordings (Settings)
- Device SIP Registration
- Greetings
- IVR
- RingOut
- Verification Calls

### SMS and Fax
- Fax
- Message Exports
- High Volume SMS
- MMS
- Pager Messages
- SMS
- Message Store

### Team Messaging
- Adaptive Cards
- Chats
- Conversations
- Events
- Notes
- Posts
- Tasks
- Teams
- Webhooks (Incoming, Outgoing)

### Meetings and Video
- Meeting Configuration
- Meeting Management
- RCV Bridges

### Account and Provisioning
- Company (Contacts, Call Log)
- Devices
- Emergency Locations
- Extensions
- Features
- Phone Numbers
- Roles
- Sites
- User Settings

### Data and Analytics
- Business Analytics
- Data Export
- Exchange Notifications (Subscriptions, Events)

### Authentication
- OAuth 2.0 (Authorization Code, PKCE, JWT, Client Credentials)

## Authentication

RingCentral uses OAuth 2.0. Supported flows:
- **Authorization Code** -- for web apps
- **Authorization Code with PKCE** -- for mobile/SPA apps
- **JWT (JSON Web Token)** -- for server-to-server
- **Client Credentials** -- for app-level access

## Key Endpoints (from OpenAPI spec)

### Call Log
```
GET /restapi/v1.0/account/{accountId}/call-log
GET /restapi/v1.0/account/{accountId}/extension/{extensionId}/call-log
```

### SMS
```
POST /restapi/v1.0/account/{accountId}/extension/{extensionId}/sms
```

### Extensions
```
GET /restapi/v1.0/account/{accountId}/extension
GET /restapi/v1.0/account/{accountId}/extension/{extensionId}
```

### Phone Numbers
```
GET /restapi/v1.0/account/{accountId}/phone-number
```

### Call Queues
```
GET /restapi/v1.0/account/{accountId}/call-queues
```

### Subscriptions (Webhooks/Push Notifications)
```
POST /restapi/v1.0/subscription
GET /restapi/v1.0/subscription
GET /restapi/v1.0/subscription/{subscriptionId}
PUT /restapi/v1.0/subscription/{subscriptionId}
DELETE /restapi/v1.0/subscription/{subscriptionId}
```

### Fax
```
POST /restapi/v1.0/account/{accountId}/extension/{extensionId}/fax
```

## Developer Resources

- Developer Portal: https://developers.ringcentral.com
- API Guide: https://developers.ringcentral.com/guide
- SDKs: JavaScript, Java, .NET, Python, PHP, Ruby, Swift
- Developer Support: https://developers.ringcentral.com/support
