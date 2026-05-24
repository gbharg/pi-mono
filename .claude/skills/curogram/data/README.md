# Curogram data dumps

Raw enumerations from reverse-engineering the `app.curogram.com` Angular bundle.

## `graphql-operations.json`

99 GraphQL operations (mutations + queries) with their full string bodies, keyed by operation name.

### Known issue — unresolved `${Ip}` placeholder

Two operations have an unresolved JavaScript template literal `${Ip}` embedded in their selection set:

- `mutation PatientRegistrationBillingUpdate`
- `query PatientRegistrationBillings`

In the original Angular source these strings are built with a template literal where `Ip` is a constant holding a shared GraphQL fragment selection (`id, status, name, ...`). The reverse-engineering dump stringified the templates BEFORE the JS runtime expanded the interpolation, so the literal characters `${Ip}` ended up in the JSON.

These 2 operations are **unusable as-is** — pass them to a GraphQL server and the parser will reject them.

To use them, replace `${Ip}` with the appropriate fragment selection. The expected shape (inferred from sibling operations) is roughly:

```graphql
id
status
billingStatus
verificationStatus
coPay
coInsurance
deductable
outOfPocket
paymentStatus
insuranceType
patient { id chart first last }
```

Confirm against a live response from Curogram before relying on the field list.

## `rest-endpoints.txt`

(present? see `ls`) — flat list of 139 REST endpoints discovered in the bundle.

## See also

Reference docs are at `~/pi-mono/.claude/skills/curogram/references/`.
