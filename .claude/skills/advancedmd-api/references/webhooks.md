# AdvancedMD — Webhooks (and why there aren't any)

**Short answer: AdvancedMD does not expose customer-facing webhooks.** None of the three public surfaces (FHIR Single, FHIR Bulk, Connect API) emit push notifications. To pick up changes, you poll.

## What this means in practice

| You want | Use |
|----------|-----|
| "Notify me when a new patient is created" | Connect API `getNewAndModifiedPatients` on a cron |
| "Notify me when an appointment is cancelled" | Connect API `getAppointments` filtered by `modifieddt` |
| "Notify me when a charge posts" | Connect API `getNewAndModifiedVisits` + `getChargeDetails` |
| "Notify me when a clinical note is signed" | Connect API `getNewAndModifiedPatientNotes` |
| "Real-time clinical data feed for a population" | FHIR Bulk `$export` on a schedule (typically daily or hourly) |

The delta-sync pattern is well-supported on Connect API ops (most have a `datechanged` filter). The "freshness" you can achieve is bounded by your polling cadence — 1 minute is reasonable, faster risks throttling.

## Why no webhooks

A few reasons inferred from AMD's posture (not officially stated):

1. **ONC §170.315(g)(10)** only requires standards-based read APIs. Webhooks aren't part of the certification criteria.
2. **HIPAA + tenant isolation** — pushing PHI to an arbitrary partner URL requires elaborate BAA + auth checking. Polling lets the BA control egress.
3. **The Connect API predates webhooks as a common pattern.** It was built on the same XML-era backend as Allscripts (AMD's PE-acquired sibling) — synchronous request/response only.
4. **AMD's competitors (Athena, Greenway, eClinicalWorks)** mostly don't expose webhooks either. The PM/EHR industry hasn't standardized on push.

## Possible push-style alternatives (not webhooks, but adjacent)

These are tangential to webhooks. Read each before relying:

### FHIR Subscriptions (R4 / R5)
The FHIR `Subscription` resource lets a client register for push notifications. **AMD does NOT implement Subscriptions** in their Single Patient API (verified in CapabilityStatement — `Subscription` is not in the supported resources list as of US Core 6.1.0). HL7 R5's Subscription Backport is also not implemented.

### HL7 v2.x feeds (legacy interop)
For practices that need real-time clinical messaging into another EHR or a hospital system, AdvancedMD offers HL7 v2.x ADT/ORM/ORU feeds via their interop team. This is:
- Negotiated case-by-case (call InterOps)
- Delivered via SFTP, VPN, or MLLP — not webhooks
- Not part of the FHIR or Connect API surface
- Mostly used for lab integrations, not partner SaaS apps

If your use case is "match real-time clinical events between AMD and a hospital", HL7 v2.x via InterOps is the closest AMD gets to push.

### Patient Portal webhooks
There are no documented webhooks for the patient-facing portal either. Patient form submissions land in AMD's task queue and are visible to staff via the UI; partners pull them via Connect API `getIntakeRecords`.

## Polling design for "near real-time" feel

If you need to feel like a webhook:

```ts
const POLL_INTERVAL = 60_000;   // 1 minute — conservative, well under throttle

async function streamPatients(onPatient: (p: Patient) => Promise<void>) {
  let cursor = new Date(Date.now() - POLL_INTERVAL);
  while (true) {
    const start = Date.now();
    const patients = await callConnect("getnewandmodifiedpatients", "pat", {
      datechanged: formatDate(cursor),
    });
    for (const p of patients) {
      try { await onPatient(p); } catch (e) { logFailedPatient(p, e); }
    }
    cursor = new Date(start);                  // advance cursor only on success
    const elapsed = Date.now() - start;
    await sleep(Math.max(0, POLL_INTERVAL - elapsed));
  }
}
```

Latency: each event is visible to your consumer at most `2 × POLL_INTERVAL` after creation in AMD (worst case: created just after your last poll completed). With 1-min polling that's ~2 min.

To go faster than 1 min: stagger entity types across separate workers, monitor rate-limit headers, and back off when you see 429s.

## Things to avoid

### Don't try to "register" a webhook URL with AMD
There is no endpoint for this. Don't email InterOps asking for one — they'll redirect you to the polling docs.

### Don't poll faster than 30 seconds globally
You'll trip Apigee rate limits. AMD's documented limits are vague but Connect API throttling kicks in around 10 req/s sustained per partner.

### Don't assume "newandmodified" is exhaustive
The `getNewAndModifiedPatients` op only returns patients whose `modifieddt` is `> datechanged`. If a patient is created and then immediately soft-deleted in the same minute, you may miss it (the deletion can rewrite `modifieddt` to be earlier in some edge cases). For audit-grade tracking, combine with `getPatients` paginated dumps weekly.

### Don't poll the FHIR API for changes if Bulk is an option
A nightly Bulk export of a Group is ~10× cheaper than walking the entire Patient list via FHIR Single. Bulk also gives you NDJSON files which are easier to diff than nested JSON.

## What to ask InterOps if your use case truly needs push

If polling won't work (e.g., you need <5s latency for a clinical alert), InterOps may agree to one of:

1. **A custom HL7 ADT feed over SFTP/MLLP** — typically requires the customer practice to opt in and pay for the integration setup.
2. **A reverse-proxy partnership** — your service sits inside AMD's network. This is rare and very expensive.

Document your use case clearly. AMD won't build webhooks for you, but they have agreed to point-to-point clinical feeds for healthcare networks.

## See Also

- Delta-sync ops in Connect API: `references/connect-api.md` (search "Sync / Delta")
- Bulk export design (for population-level periodic sync): `references/fhir-bulk-api.md`
- Polling examples: `references/examples.md`
