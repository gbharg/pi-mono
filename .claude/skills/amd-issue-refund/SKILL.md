---
name: amd-issue-refund
description: Refund a patient payment in AdvancedMD via reverse/negative payment entry (PCI-sensitive financial write)
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, mcp__claude_ai_Keragon__com_keragon_advancedmd_findPatient, mcp__claude_ai_Keragon__com_keragon_advancedmd_getPatient, mcp__claude_ai_Keragon__com_keragon_advancedmd_getPatientTransactionHistory, mcp__claude_ai_Keragon__com_keragon_advancedmd_getChargeDetails, mcp__claude_ai_Keragon__com_keragon_advancedmd_applyPaymentToCharge, mcp__claude_ai_Keragon__com_keragon_advancedmd_getPaymentsByCode, mcp__claude_ai_Keragon__com_keragon_microsoftoutlook_createDraftMail
---

# amd-issue-refund

## Purpose
Issue a refund to a patient at Exult Healthcare (office 161112) by reversing a prior payment in AdvancedMD and coordinating the card/check refund on the merchant side. This is the single most financially sensitive skill in the batch. It touches PCI, PHI, and money movement. Cannot be easily undone. Requires explicit per-request Gautam approval with dollar confirmation.

## Refund categories
- `REFUND` - patient overpaid or paid for a service not rendered; returns to card on file
- `OVERPAY` - insurance paid after patient paid in full; balance owed back to patient
- `BILLING_ERROR` - charge was posted incorrectly, needs void + refund
- `GOODWILL` - Gautam-approved courtesy refund (rare)

## PCI / PHI rules (read first, non-negotiable)
- Full card PAN: NEVER in chat, logs, files, git, memory
- CVV: NEVER anywhere
- Card last-4 + brand: OK to log
- Patient name / chart#: initials + last-3 only in logs
- Refund amount: OK to log
- Auth / reference numbers: last-6 only in logs
- Refund receipt delivery: patient portal or secure email ONLY, not SMS

## Inputs
1. Patient identifier (chart # or patientid)
2. Original payment to reverse - date + amount + last-4 (or payment ID if known)
3. Refund amount (may be partial or full)
4. Refund reason code (from the 4 categories above)
5. Refund method - MUST match the original payment method (same card, same check routing)
6. Merchant refund auth code (from the physical terminal or hosted page, AFTER the refund is actually posted on the card)
7. Refund deposit date (default today)
8. Notation for the chart memo

## Prerequisites
- The card refund has ALREADY been run on the physical terminal or hosted page. This skill POSTS the refund in AMD; it does not push money.
- AMD API reachable, Keragon MCP `applyPaymentToCharge` (used with negative amount) OR XMLRPC `addpayments`
- Gautam explicit per-request approval WITH the dollar amount read back
- Current AMD batch ID
- Original payment exists in `getPatientTransactionHistory` and has not already been refunded (check for prior negative entry)

## Workflow (API path - default)

### Step 1. Look up the patient and payment history
```
findPatient(firstName, lastName, dateOfBirth)   # or getPatient(patientId)
getPatientTransactionHistory(patientId=<id>)
```
Scan for the original payment row:
- date matches
- amount matches
- paycode (usually `PP` patient payment)
- paymethod = 3 (credit) or 2 (check) or 1 (cash)
- note contains the card brand + last-4 from the original post
Capture `paymentid`, `chargeid` it was applied to, and the current `patbalance`.

### Step 2. Check for prior refunds
Scan the same history for negative lines already applied against this payment. If any exist, STOP - you cannot double-refund. Reconcile with Gautam.

### Step 3. Look up the charge
```
getChargeDetails(chargeId=<id>)
```
Capture `chargeid`, current `patbalance`, `patportion`, and `profileid`.

### Step 4. Determine post strategy
Two equivalent approaches - pick one:

**Approach A - negative payment (preferred for full-amount refunds):**
Post a `PP` payment with a NEGATIVE amount against the same charge. This unwinds the original post exactly.

**Approach B - write-off + fresh charge reversal (for billing-error cases):**
Use `addwriteoffs` per `Content_Add_Write_Offs.htm` against the charge to zero the balance. Only when the charge itself was wrong; not for simple overpayments.

For the common case (overpay / partial refund / goodwill), use Approach A.

### Step 5. Pick paycode + method + refund reason
- Paycode: `PP` (patient payment, negative) per `getPaymentsByCode` readback
- Paymethod: same as original (3 credit / 2 check / 1 cash)
- Reason: put the category string (`REFUND` / `OVERPAY` / `BILLING_ERROR` / `GOODWILL`) in the note field
- Note format: `REFUND - <brand> ****<last4> auth <last-6 of refund auth> orig <yyyy-mm-dd> $<amt>`

### Step 6. PAUSE for approval (HARD STOP)
Summary (redacted, dollar read-back required):
```
ISSUE REFUND:
- Patient initials: [J.D.]
- Chart last-3: [**456]
- Refund amount: $XX.XX   <-- READ THIS BACK EXACTLY
- Method: [credit last-4 **1234 VISA] or [check #NNNNN] or [cash]
- Applied against: charge #<id> (<date>, <cpt>)
- Orig payment: $YY.YY posted on <date> last-4 ****1234
- Reason: [REFUND / OVERPAY / BILLING_ERROR / GOODWILL]
- Refund auth code last-6: [******]
- Deposit date: <date>
- Batch: <batch id>
Confirm to post? (must repeat amount in approval)
```
Gautam MUST echo back the dollar amount in their approval. A thumbs-up alone is insufficient. This is a TWO-WAY confirm to prevent accidental decimal-point errors.

### Step 7. Post the negative payment
Keragon MCP:
```
mcp__claude_ai_Keragon__com_keragon_advancedmd_applyPaymentToCharge(
  patientId=<id>,
  chargeId=<id>,
  amount=-<decimal>,            # NEGATIVE
  payCode="PP",
  payMethod=<1|2|3>,
  checkNumber="<if check>",
  depositDate="YYYY-MM-DD",
  note="REFUND <reason> <brand> ****<last4> auth <last-6>"
)
```
XMLRPC fallback `addpayments` with negative `@amount` per `Content_addpayments.htm`. The `paymentlist.payment.@amount` entry must be negative; `@status="B"` same as a normal post.

### Step 8. Verify via readback
```
getPatientTransactionHistory(patientId=<id>)
getChargeDetails(chargeId=<id>)
```
Confirm:
- New NEGATIVE payment line with correct amount, code, note
- `patbalance` on the charge has INCREASED by the refund amount (unwinding the original reduction)
- Bucket totals reflect the reversal
- Batch total now includes the negative

### Step 9. Update insurance balance if applicable
If the original payment was allocated partially to an insurance-covered charge, the `insbalance` may need an adjustment too. Check the `getChargeDetails` readback. If the insurance portion changed, flag to Gautam - do NOT auto-adjust; this touches AR and may affect claim reconciliation.

### Step 10. Generate refund receipt
Use Outlook `createDraftMail`:
- Subject: `Refund receipt - Exult Healthcare - <date>`
- Body: date, amount, method (brand + last-4 only), chart last-3, reason category, original payment date, refund auth last-6
- NO full card number
- NO full patient name (initials + last-3 chart)
- NO CVV, obviously
Draft only. PAUSE for Gautam to review and click Send.

### Step 11. Notate the chart memo
Use `savememo` or XMLRPC to append a memo entry to the patient chart:
```
REFUND $<amt> <reason> <yyyy-mm-dd> posted by <user> ref <last-6 auth>
```

### Step 12. Log to audit
Append to `/Users/agent/pi-mono/.pi/services/provisioning_audit.md`: timestamp, patient initials, chart last-3, amount, reason, refund payment ID, batch ID.

## Per-request approval
REQUIRED with dollar read-back. Two approval gates:
1. Before Step 7 (post the negative payment) - dollar echo required
2. Before Step 10 send (receipt email) - Gautam reviews draft

No auto-approval threshold. Even $5 refunds get the full gate.

## Verification
- Negative payment line visible in `getPatientTransactionHistory`
- Charge `patbalance` increased by refund amount
- Batch includes the negative
- Memo appended to chart
- Audit log entry written
- Receipt draft in Outlook
- Merchant terminal shows corresponding refund transaction (Gautam cross-checks)

## Rollback
- Refund posted wrong amount: post a SECOND adjustment entry (positive or additional negative) to correct. Do NOT try to modify the original refund line.
- Refund posted to wrong patient: CRITICAL - stop, alert Gautam, reverse via UI (Payment Entry -> void), do NOT try to re-post via API. Privacy + financial incident.
- Merchant refund never ran on the card: UNDO the AMD post with an equal-and-opposite positive PP entry. The terminal is the source of truth.
- Refund posted before merchant refund ran, then merchant declined: same as above, undo with positive PP entry.

## Common pitfalls
- **Double refund**: Posting a negative twice because the first one "looked stuck". Always read back history before re-attempting.
- **Refund before card actually refunds**: AMD post happens instantly; card refund takes 3-5 business days. Patient calls asking where their money is. Set expectations.
- **Wrong payment method**: Refunding a credit payment via "cash" in AMD breaks reconciliation. Method MUST match the original.
- **Batch closed**: If today batch was closed, the refund may post to the next batch. Verify batch ID.
- **Insurance portion**: If the original payment covered an insurance-adjustment portion, refunding the full patient amount may leave insurance balance hanging. Escalate to Gautam.
- **Receipt contains full PAN**: NEVER let the receipt template pull the full card number. Strip to brand + last-4.
- **Dollar-amount typo**: $1000 vs $100 decimal error. Hence the mandatory dollar read-back in approval.
- **Refund reason wrong**: `BILLING_ERROR` triggers different accounting handling than `REFUND`. Pick carefully.
- **Goodwill without Gautam**: Never issue a GOODWILL refund unilaterally. Always explicit approval with reason.

## References
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_addpayments.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Add_Write_Offs.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Payments.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Payment_Codes.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Get_Patient_Transaction_History_Details.htm`
- Related skill: `amd-process-payment`
- Memory: `feedback_amd_writes.md`, `reference_exult_fees.md`, `feedback_verify_agent_claims.md`
- PCI scope: Exult is SAQ-A. Do not store card data anywhere.
- Audit log: `/Users/agent/pi-mono/.pi/services/provisioning_audit.md`
