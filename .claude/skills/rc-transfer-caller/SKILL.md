---
name: rc-transfer-caller
description: Blind vs warm transfer playbook for a live RingCentral call (softphone or desk phone)
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch
---

# rc-transfer-caller

## Purpose
Walk Gautam (or another front-office user) through transferring a live caller to another extension, external number, or voicemail box. Transfers are a real-time action taken on the physical softphone or desk phone — there is NO public API to transfer a call that is currently connected to a different user's device. This skill is therefore a UI/softphone playbook with step-by-step scripts for blind vs warm transfer and decision guidance for which to use.

## Inputs
1. Caller (who is on the line — name if known, or reason for call)
2. Destination (internal extension / external # / voicemail box)
3. Transfer type preference (blind / warm / to VM) — or ask the skill to recommend
4. Is the destination expecting the call? (affects warm vs blind choice)

## Prerequisites
- Active call on the Exult Healthcare RC softphone (desktop or mobile) OR desk phone
- Destination extension number OR external phone number
- For warm transfer: the destination must be reachable right now (not in a meeting)

## Decision guide — which transfer type?
- **Blind**: Use when destination is a simple routing step (e.g., "billing questions -> ext 105", "main nurse line -> queue 60"). Fast, no wait. Caller hears one ring and then the destination's greeting/queue.
- **Warm**: Use when destination needs context (e.g., "angry patient with a complex billing history -> Gautam ext 104"). Slower, involves a live handoff conversation.
- **Voicemail**: Use when destination is unreachable and caller wants to leave a message (e.g., "provider is in session -> their VM box"). Transfers directly to the VM without ringing the destination.
- **External**: Warm transfer only for external #s. Blind transfer to external is technically possible but risks dropped calls — avoid.

## Workflow — RC Desktop App (softphone, default)

### Blind transfer (cold)
1. On the active call panel, click the **Transfer** button (arrow icon)
2. Select **Blind Transfer** (some versions label it "Transfer now" or just "Transfer")
3. In the destination field, type the extension number OR external phone (E.164 format for external: `+19727140006`)
4. Click **Transfer**
5. Your call disconnects immediately — caller is now ringing the destination
6. Confirm to Gautam: "Transferred <caller reference> to <destination>, blind."

### Warm transfer (attended)
1. On the active call panel, click **Transfer**
2. Select **Warm Transfer** (may be labeled "Transfer with announcement" or "Attended transfer")
3. Current caller is placed on hold automatically
4. RC dials the destination — wait for them to pick up
5. Announce: "I have <patient first name only> on the line about <topic>. OK to transfer?"
6. If destination says **yes**: click **Complete Transfer** (or "Join") — caller is connected, you drop
7. If destination says **no**: click **Cancel** or **Return to caller** — you go back to the caller on hold and explain the next step (e.g., take a message)

### Transfer to voicemail directly
1. Click **Transfer**
2. Select **Transfer to voicemail**
3. Enter destination extension
4. Click **Transfer** — caller is routed straight to the destination's VM greeting

## Workflow — Desk Phone (Polycom / Yealink)

### Blind
1. Press **Transfer** soft key
2. Dial destination extension
3. Press **Transfer** again (or **B.Xfer** soft key) — drops your line immediately

### Warm
1. Press **Transfer**
2. Dial destination extension
3. Press **Send** / **Dial**
4. Speak to destination when they pick up (caller is on hold)
5. Press **Transfer** again to complete the handoff

## Common destinations at Exult
- Front Office queue (ring group): ext 55 — use for general/billing/scheduling questions when unsure who should take it
- Front desk direct (Gautam): ext 104
- Auto-receptionist (main greeting): ext 2000 — use to send a caller back to the IVR
- After-hours: ext 2002 — use after 5pm CT or if caller is outside business hours
- Patient portal help / billing: TODO: verify ext — check with Gautam
- Provider VM boxes: TODO: verify ext numbers per provider

## Per-request approval
Transfers are real-time and do not require written approval. Use judgment:
- ALWAYS ask the caller "may I transfer you to X?" before executing (common courtesy + HIPAA — implicit consent)
- Warm-transfer any angry or complex call — never dump on a colleague
- If caller is a patient discussing clinical concerns, transfer to clinical line or offer to take a message

## Verification
- After transfer, your line is free (no active call indicator)
- If warm: destination confirmed handoff verbally
- If the transfer failed (caller dropped, destination didn't answer), callback the caller from the same number

## Rollback
- **Accidental blind transfer**: Call the caller back immediately from (469) 714-0006. Apologize. Try again.
- **Warm transfer refused by destination**: Return to caller, explain, offer alternative (message, call back, different person)
- **Transfer to wrong ext**: Cannot recall once caller is connected. Call destination and ask them to transfer back or take a message

## Common pitfalls
- **Blind to VM accidentally**: If destination has DND on or is off-hook, a blind transfer may route to VM. Warm transfer avoids this surprise.
- **Losing the caller**: Always confirm the caller heard you before transferring. "Please hold one moment while I transfer you" — don't just click.
- **External blind transfers**: Higher risk of dropped calls through RC's routing. Use warm when transferring externally.
- **Transferring to a queue**: Valid, but caller hears hold music — set expectations: "I'm transferring you to our scheduling team, there may be a brief wait."
- **HIPAA**: Do not announce patient details in the warm-transfer hand-off beyond first name + topic. Save full context for after the transfer.

## References
- RC KB (transfer calls): https://support.ringcentral.com/article-v2/6007.html
- Softphone app: https://app.ringcentral.com/
- Memory: `reference_rc_phone_routing.md` (IVR chain + ring group 55 notes)
- No API path — RC does not expose live-call transfer via REST
