---
name: amd-process-payment
description: Post a patient payment against outstanding charges in AdvancedMD and generate a receipt (PCI-sensitive)
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, mcp__claude_ai_Keragon__com_keragon_advancedmd_findPatient, mcp__claude_ai_Keragon__com_keragon_advancedmd_getPatientTransactionHistory, mcp__claude_ai_Keragon__com_keragon_advancedmd_applyPaymentToCharge, mcp__claude_ai_Keragon__com_keragon_advancedmd_getChargeDetails, mcp__claude_ai_Keragon__com_keragon_advancedmd_getPaymentsByCode, mcp__claude_ai_Keragon__com_keragon_microsoftoutlook_createDraftMail
---

# amd-process-payment

## Purpose
Post a patient payment against outstanding charges in AdvancedMD, then generate a printable receipt for the patient. This skill touches **financial + PCI + PHI** and is the most sensitive write the clinic performs. It must NEVER see or store a full card number — Exult uses a pass-through merchant device for card-present and a hosted payment page for card-not-present. This skill only **posts** the payment (after the physical transaction has already cleared) and applies it to the right charge.

## PCI / PHI rules (read first)
- Full card PAN: NEVER in chat, logs, files, git, or memory
- CVV: NEVER anywhere
- Card last-4 + brand: OK to log
- Patient name / chart#: initials + last-3 only in logs
- Amount: OK to log
- Receipt delivery: patient portal or secure email only, not SMS

## Inputs
1. Patient identifier (name + DOB, or chart #)
2. Payment method (credit card / check / cash / HSA card)
3. Card last-4 + brand (credit) OR check number (check) OR "cash" — NOT the full card number
4. Amount (dollars)
5. Which charge(s) to apply to (outstanding visit id, or "oldest first")
6. Merchant transaction ID / auth code (from the terminal, if credit)
7. Deposit date (default today)
8. Post-to user / batch (usually Gautam's AMD user, current day batch)

## Prerequisites
- The card/check/cash transaction has ALREADY been run on the physical terminal or via the hosted page. This skill posts the result; it does not charge the card.
- AMD API reachable, Keragon MCP `applyPaymentToCharge` OR XMLRPC `addpayments` (fallback)
- Gautam explicit per-request approval
- Current AMD batch ID (call `getPaymentsByCode` or check morning batch setup)

## Workflow (API path — default)

### Step 1. Look up patient and outstanding balance
```
findPatient(firstName, lastName, dateOfBirth)
getPatientTransactionHistory(patientId=<id>)
```
Review the bucket balances (patient current / patient 30 / 60 / 90 / 120) and the charge list. Identify the specific charge to apply to OR confirm "oldest first" allocation.

### Step 2. Look up the charge details
```
getChargeDetails(chargeId=<id>)
```
Capture: chargeId, patientPortion, insurancePortion, changedAt timestamp, profileId.

### Step 3. Pick paycode + paymethod
Codes (verify against office settings via `getPaymentsByCode`):
- Paycode: `PP` (Patient Payment) — most common for self-pay / copay
- Paymethod values (XMLRPC): `1`=cash, `2`=check, `3`=credit card, `4`=HSA/FSA card (verify — codes can vary by office)
- If credit, also capture cardBrand (VISA/MC/AMEX/DISC) and last-4 — store in the payment note

### Step 4. PAUSE for approval
Summary (redacted):
```
Post payment:
- Patient initials: [J.D.]
- Chart last-3: [**456]
- Amount: $XX.XX
- Method: [credit last-4 **1234 VISA] or [check #NNNNN] or [cash]
- Applied to: charge #<id> (<date>, <cpt>) — patient portion $<amt>
- Auth code: <last-6 of auth>
- Deposit date: <date>
- Batch: <batch id>
Confirm to post?
```
Wait for explicit "go". Do NOT auto-approve even if payment is small.

### Step 5. Post the payment

**Option A — Keragon MCP (preferred):**
```
mcp__claude_ai_Keragon__com_keragon_advancedmd_applyPaymentToCharge(
  patientId=<id>,
  chargeId=<id>,
  amount=<decimal>,
  payCode="PP",
  payMethod=<1|2|3|4>,
  checkNumber="<if check>",
  depositDate="YYYY-MM-DD",
  note="<brand> ****<last4> auth <last-6 auth>"
)
```

**Option B — XMLRPC `addpayments` (fallback):** Use payload shape from `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_addpayments.htm`:
```json
{
  "ppmdmsg": {
    "@action": "addpayments",
    "@class": "paymententry",
    "@msgtime": "<mm/dd/yyyy hh:mm:ss AM/PM>",
    "patient": {
      "@patientid": "<id>",
      "@amount": "<amt>",
      "@paycode": "PP",
      "@paymethod": "<method>",
      "@depositdate": "<mm/dd/yyyy>",
      "@postedby": "<user>",
      "@batch": "<batch>",
      "@checknumber": "<if check>",
      "chargelist": {
        "charge": {
          "@id": "<chargeid>",
          "paymentlist": {
            "payment": {
              "@amount": "<amt>",
              "@status": "B"
            }
          }
        }
      }
    }
  }
}
```

### Step 6. Verify via readback
```
getPatientTransactionHistory(patientId=<id>)
```
Confirm:
- New payment line exists with correct amount + code
- Applied charge's `patbalance` has decreased by the payment amount
- Bucket totals reflect the post

### Step 7. Generate + deliver receipt
- Use Outlook `createDraftMail` to draft a receipt email (do NOT auto-send)
- Receipt body includes: date, amount, method (brand + last-4 only), chart last-3, applied charge date + cpt, provider
- Subject: "Payment receipt - Exult Healthcare - <date>"
- PAUSE for Gautam to review and send

## Per-request approval
- Pause before Step 5 (post) AND before Step 7 (send receipt). Two separate approvals.
- Refunds are a SEPARATE skill (not in this batch) — never issue a refund from this skill.

## Verification
- Payment line visible in `getPatientTransactionHistory`
- Patient balance decreased by exactly the payment amount
- Batch total is updated
- Receipt draft saved to Outlook drafts folder

## Rollback
- Wrong amount posted: cannot easily reverse via API. Use `updatePayment` or `voidPayment` if the MCP exposes it; otherwise Gautam handles via AMD UI (Payment Entry -> edit/void). Document in audit log.
- Wrong charge: reverse via AMD UI, then re-post against the correct charge
- Wrong patient: CRITICAL — stop, alert Gautam, reverse in UI, do NOT try to re-post via API

## Common pitfalls
- **Full PAN in notes**: NEVER write a 13-16 digit card number anywhere. If one slips in, scrub the note field immediately and rotate the tool transcript.
- **Over-application**: Applying more than `patportion` to a single charge will push a credit. Check `patbalance` before posting.
- **Batch closed**: If today's batch was closed by end-of-day, posting fails silently or posts to next day. Verify `@batch` is current.
- **Paycode mismatch**: Using `PI` (payer insurance) instead of `PP` (patient payment) routes to insurance deposits and blows up reconciliation.
- **Sales tax on merchandise**: Exult does not sell merchandise, but if a dispensed supply is billed, don't forget the tax component — or reject and escalate to Gautam.
- **Refund requests**: Patients will sometimes ask for a refund mid-call. This skill does NOT handle refunds. Stop and hand off.

## References
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_addpayments.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Payments.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Payment_Codes.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Get_Patient_Transaction_History_Details.htm`
- Local doc: `/Users/agent/pi-mono/.pi/services/amd/amd-api-docs/raw/Content_Payment_Checks.htm`
- Memory: `feedback_amd_writes.md`, `reference_exult_fees.md`
- PCI scope: Exult is SAQ-A (hosted/attended only). Do not expand scope by storing card data.
