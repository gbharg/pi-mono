---
description: "Use at end of day or when asked 'what happened today/yesterday' to generate a daily operations summary."
disable-model-invocation: true
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash(python3 *)
  - Bash(ls *)
  - Bash(cat *)
---

# /daily-summary -- Daily Operations Report

## Trigger

Invoke manually at end of day or when asked about daily activity. This skill does not auto-trigger.

## Procedure

### 1. Gather Data Sources

Read from these locations to compile the summary:

| Source                              | Contains                              |
|-------------------------------------|---------------------------------------|
| ~/claude-workspace/data/daily_tracker/YYYY-MM-DD.json | Call counts, appointment metrics, revenue |
| ~/claude-workspace/data/rc_archive/ | Call logs, voicemail records           |
| ~/claude-workspace/data/message_archive/YYYY-MM-DD.json | Sendblue message history |
| ~/claude-workspace/data/amd_phi/    | Patient visit data (if updated today) |

### 2. Compile Summary Sections

Structure the report as follows:

**Operations Snapshot**
- Total inbound/outbound calls
- Voicemails received (with transcripts if available)
- Appointments: scheduled, completed, no-shows, cancelled
- Revenue collected

**Key Events**
- New patients seen
- Urgent messages or escalations
- Notable call patterns (missed calls, high volume periods)

**Task Log**
- Actions taken by the agent today
- API calls made and outcomes
- Files generated or updated

**Decisions Made**
- Any decisions requiring Gautam's input
- Approvals received or pending

**Message Highlights**
- Summary of Sendblue message threads
- Any action items from messages

### 3. Output

Print the summary to the conversation. If asked, also save to:
```
~/claude-workspace/reports/daily-summary-YYYY-MM-DD.md
```

## Gotchas

- **Check for missing data.** Not all sources may have data for the given day. Note gaps rather than failing.
- **PHI awareness.** The summary may reference patient names from visit data. Keep the summary in the conversation or in protected directories.
- **Yesterday vs today.** If asked about "yesterday", compute the correct date. Don't assume the user means today.
- **Weekend/holiday gaps.** There may be no data for weekends. Report that clearly.
