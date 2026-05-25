---
name: verify
description: "Use after completing significant actions to verify output matches intent, check HIPAA compliance, and validate API responses."
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash(curl *)
  - Bash(python3 *)
  - Bash(ls *)
  - Bash(wc *)
---

# /verify -- Post-Action Verification

## When This Triggers

Run after completing any significant action:
- Patient data operations (create, update, delete)
- Appointment changes
- Email sends
- File generation (reports, letters, exports)
- Configuration changes

## Verification Checklist

### 1. Intent Match

Compare the action result against the original request:
- Did the action accomplish what was asked?
- Were there any partial failures?
- Is the output in the expected format?

### 2. Audit Log Check

Check for an audit entry:
```bash
# Check if the action was logged
grep "$(date +%Y-%m-%d)" /Users/agent/pi-mono/.pi/services/provisioning_audit.md | tail -20
```

If no audit log exists yet, note this as a gap (don't create one during verification).

### 3. PHI Compliance

Scan for PHI in unintended locations:
- Check recent file writes outside `/Users/agent/pi-mono/.pi/services/amd/`
- Check conversation output for full SSNs, DOBs with names, or insurance IDs
- Verify no patient data was written to logs or temp files

```bash
# Look for recently modified files that might contain PHI
find /Users/agent/pi-mono/.pi/ -name "*.json" -newer /tmp/last-action-marker -not -path "*/amd/*" 2>/dev/null
```

See [`INDEX.md`](../INDEX.md) for the canonical pi-mono PHI / audit paths.

### 4. API Response Validation

For API operations, verify the response data:
- **Patient operations**: Confirm the patient_id in the response matches the intended patient
- **Appointment operations**: Verify date, time, provider, and patient are correct
- **Email operations**: Confirm recipient address and subject match intent
- **File operations**: Verify file exists, is non-empty, and contains expected content

### 5. Side Effects

Check for unintended consequences:
- Were any other records modified?
- Did the action trigger any webhooks or notifications?
- Are there any orphaned resources (deleted appointment without creating replacement)?

## Output Format

```
Verification Report
====================
Action: [what was done]
Time: [when]
Status: PASS / FAIL / PARTIAL

Intent Match:    PASS/FAIL - [details]
Audit Log:       PASS/FAIL/SKIP - [details]
PHI Compliance:  PASS/FAIL - [details]
API Validation:  PASS/FAIL - [details]
Side Effects:    PASS/FAIL/NONE - [details]

Overall: PASS / FAIL
Notes: [anything noteworthy]
====================
```

## Gotchas

- **Verify, don't modify.** This skill only checks -- it should never change data. If something is wrong, report it and let the user decide what to do.
- **PHI scan is best-effort.** The find command may not catch everything. Use grep for specific patterns (SSN format, DOB format) when the action involved patient data.
- **Audit log may not exist.** If no audit logging is set up yet, skip that check and note it as a gap.
- **API re-fetch.** For critical operations (appointments, patient updates), re-fetch the resource via API to confirm the change persisted.

## Subagent Guidelines

When spawned as a subagent for QA/verification:
- You are READ-ONLY. Never modify data -- only verify.
- Check: output matches intent, HIPAA compliance (audit.log, no PHI leaks), data accuracy.
- For critical ops (appointments, patient updates), re-fetch via API to confirm the change persisted.
- Report PASS/FAIL with specific details. Be precise about what is wrong and what the fix should be.
- Use Opus model when spawning a verify subagent for highest quality review.
