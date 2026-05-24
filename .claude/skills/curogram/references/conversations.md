# Curogram Conversations & Messaging

The core agent surface — list inbox, read a thread, send a reply.

## List inbox

### GraphQL (preferred — gives unread count + last message)

```graphql
query GetConversationList($skip: Int, $take: Int, $q: String, $unreadOnly: Boolean) {
  conversations(skip: $skip, take: $take, q: $q, unreadOnly: $unreadOnly) {
    totalItemCount
    items { ...ConversationListItem }
  }
}

fragment ConversationListItem on Conversation {
  id
  title
  type            # PATIENT | DIRECT | GROUP | PRACTICE
  updatedAt
  unreadCount
  avatar { url initials }
  lastMessage { text statusUpdate }
}
```

### REST equivalents

```
GET /conversations?skip=&take=&q=
GET /conversations/unread/list?skip=&take=
GET /conversations/unread-count
GET /conversations/filter-unread-count
GET /conversations/filter-tag-assignes
```

### Single conversation metadata

```graphql
query GetConversation($id: ObjectId!) {
  conversation(id: $id) { id type title }
}

query GetConversationListItem($id: ObjectId!) {
  conversation(id: $id) { ...ConversationListItem }
}
```

REST: `GET /conversations/{convId}`.

## Read messages in a thread (REST, paginated)

```
GET /conversations/{convId}/messages?skip=&take=
GET /conversations/{convId}/messages/{msgId}
GET /conversations/{convId}/messages/after/{msgId}      # newer than msgId
GET /conversations/{convId}/messages/before/{msgId}     # older than msgId
```

Returns `{ totalItemCount, items: [Message...] }`.

## Send a message (REST)

### Text

```
POST /conversations/{convId}/messages
{
  "message": "Hello!",
  "sendSecurely": false
}
```

Response: the created message + a `x-frequency-warning` response header. Numeric value `5` means rate-limit warning — back off.

### Attachment

```
POST /conversations/{convId}/messages
{
  "message": "Attachment",
  "attachment": <attachment object>,
  "sendSecurely": false
}
```

The attachment object structure isn't fully captured here — upload via `/storage` (separate subdomain) first to get the descriptor, then reference it.

### Location

```
POST /conversations/{convId}/location
{ "locationId": "<location ObjectId>" }
```

### Survey

```
POST /surveys/{surveyId}
{ "conversationId": "<convId>" }
```

### Rating request

```
POST /rating/{ratingId}
{ "conversationId": "<convId>", ...optional fields }
```

## Read receipts / spam / archive

```
POST /conversations/{convId}/messages/mark-read              # whole thread
POST /conversations/{convId}/messages/mark-read/{msgId}      # up to msgId
POST /conversations/{convId}/messages/mark-unread/{msgId}    # from msgId on
POST /conversations/{convId}/messages/mark-spam/{msgId}
POST /conversations/mark-read                                # ALL conversations
POST /conversations/{convId}/hide                            # archive
POST /conversations/{convId}/follow
POST /conversations/{convId}/un-follow
PUT  /conversations/{convId}/messages/type/{msgId}     body: { "type": "<MessageType>" }
PUT  /conversations/{convId}/messages/tags-and-mark-unread/{msgId}   body: tag payload
```

## Conversation metadata

```
PUT  /conversations/{convId}                  body: { "title": "..." }
PUT  /conversations/{convId}/tags             body: tag update
GET  /conversations/{convId}/notifications
POST /conversations/{convId}/notifications    body: notification settings
GET  /conversations/{convId}/access-log?skip=&take=
```

GraphQL extras:

```graphql
fragment ConversationBodyTags on Tags {
  lastTopic
  lastAppointmentEmrService { id title }
  lastAppointmentLocation { id }
  lastAppointmentPhysician { id displayName }
  patientGroups { id }
  patientLanguage { id }
  lastAppointmentConfirmationStatus { id title }
  lastMessageType
}
```

## Members (group conversations)

```
GET    /conversations/{convId}/members?skip=&take=
POST   /conversations/{convId}/members             body: { "memberIds": ["..."] }
DELETE /conversations/{convId}/members/leave
DELETE /conversations/{convId}/members/remove/{memberId}
```

## Create new conversations

```
POST /conversations/patient   { "patientId": "<patient ObjectId>" }   # SMS thread with a patient
POST /conversations/direct    { "memberId": "<staff member ObjectId>" } # internal DM
POST /conversations/group     { "title": "...", "memberIds": ["..."] }  # group chat
POST /conversations/practice  { "incomingGroupId": "..." }              # claim incoming group
```

## Lookup helpers

```
GET /conversations/user/{userId}              # find convo by participant
GET /conversations/incoming-group/{groupId}
```

## Templates

Use precanned text templates instead of free-form when sending bulk or sensitive messages.

```graphql
query CustomMessageTemplates  # list user's templates
query ProviderCustomTemplatePermissions
mutation CustomMessageTemplateCreate
mutation CustomMessageTemplateUpdate
mutation CustomMessageTemplateRemove
```

REST compile (renders variables like `{patient_first_name}` against a real patient):

```
POST /messages/templates/custom/compile     body: { templateId, patientId, ... }
GET  /messages/templates/custom/legend      # available variable names
GET  /messages/templates/legend/list
GET  /messages/templates/patient/compiled?patientId=...
POST /messages/templates/native/reset       # restore Curogram defaults
```

## Internal staff notes (NOT patient-facing)

A "conversation note" is a sticky note attached to a thread that staff see but the patient never does.

```graphql
mutation ConversationNoteCreate(
  $accountId: AccountId!
  $conversationId: ConversationId!
  $text: String!
) {
  conversationNoteCreate(accountId: $accountId, conversationId: $conversationId, text: $text) { id }
}

mutation NoteUpdate
mutation NoteRemove
```

Don't confuse this with `POST /conversations/{id}/messages` — that one actually sends to the patient.

## Agent loop recipe

```
1. Poll: GET /conversations/unread-count
2. If unread > 0: GraphQL GetConversationList(unreadOnly: true)
3. For each item:
     GET /conversations/{id}/messages?take=20  (or after lastSeenMsgId)
     LLM generates draft reply
     [optional human-in-loop approval]
     POST /conversations/{id}/messages { message, sendSecurely: false }
     POST /conversations/{id}/messages/mark-read
4. Sleep / re-poll, OR upgrade to socket.io for push (channel not yet mapped)
```

## Subscription / realtime

The bundle imports `socket.io-client`. The websocket URL has not been observed in this session because the dashboard was idle. To map it, open DevTools -> Network -> WS while the inbox loads. Likely candidate: `wss://api-v2.curogram.com/socket.io/`.
