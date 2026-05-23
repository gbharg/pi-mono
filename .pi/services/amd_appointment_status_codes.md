# AMD Appointment Status Codes (Empirically Mapped)

AMD does not document these status codes in their API. Values below were mapped
empirically on 2026-04-26 by analyzing March 2026 data (925 appointments, fully
completed month) and checking which statuses had visits/charges posted.

## REST API Status Values (`/scheduler/appointments`)

| Status | Name (inferred) | March Count | Visit Posted % | Description |
|--------|-----------------|-------------|----------------|-------------|
| 0 | Scheduled | 27 | 67% | Booked but never checked in. Some still had visits posted (staff skipped checkout). |
| 1 | Checked In / Arrived | 32 | 75% | Patient checked in but checkout not completed. Most were seen. |
| 2 | In Room | 3 | 100% | Patient roomed. All were seen. |
| 3 | Checked Out | 647 | 94% | Standard completed path. This is the bulk of encounters. |
| 4 | Cancelled | N/A | N/A | NOT returned by `forView=month` API. Filtered out server-side. |
| 5 | No-Show | N/A | N/A | NOT returned by `forView=month` API. Filtered out server-side. |
| 6 | Rescheduled | N/A | N/A | NOT returned by `forView=month` API. Filtered out server-side. |
| 10 | No-Show / Late Cancel (untagged) | 132 | 2% | Patient did NOT come. No cancel reason recorded. NOT filtered by API. |
| 12 | Telehealth Completed | 84 | 81% | Virtual visit completion path. 71% flagged `istelemedicine=true`. |

## Key Findings

- The API does NOT return statuses 4, 5, 6 (cancelled, no-show, rescheduled).
- Status 10 is functionally a no-show (~98% have no visit posted) but is NOT filtered
  by the API. This inflates raw counts by ~130-140/month.
- Status 12 is a telehealth completion status. Most have visits and charges posted.
- For **billable encounter counts**, use the AMD built-in report — not raw API totals.
- For **proportional analysis** (med mgmt vs therapy, provider splits), the ratios from
  the API are still valid since all statuses are proportionally affected.

## XMLRPC Status Filter

The `getreminderappts` endpoint accepts `apptstatus="0,1"` to filter by status.
The `getpatientvisits` endpoint accepts `apptstatusid` as an optional filter.

## Methodology

Verified against Gautam's AMD report for April 2026:
- AMD report: 575 encounters + 60 no-shows = 635 billable
- API status 3 + 12 (billable types): 501 + 53 = 554 (close to 575 when accounting
  for statuses 0/1/2 with visits posted)
- API status 10 count: ~84-132/month (maps to AMD's no-show count of ~60 plus
  late cancels that AMD doesn't count as no-show)
