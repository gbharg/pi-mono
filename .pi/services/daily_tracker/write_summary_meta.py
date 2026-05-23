#!/usr/bin/env python3
"""Write Summary, Methodology, and Data_Quality sheets."""
from __future__ import annotations

import calendar
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, "/Users/agent/pi-mono/.pi/services/daily_tracker")

from graph_util import (
    acquire_token,
    close_session,
    col_letter,
    open_session,
    write_range,
)
from kpi_schema import KPI_ROWS, MONTHS

ADDRESS = "/Users/agent/pi-mono/.pi/services/daily_tracker/workbook_address.json"
AMD_DAILY = "/Users/agent/pi-mono/.pi/services/daily_tracker/amd_daily.json"
M365_DAILY = "/Users/agent/pi-mono/.pi/services/daily_tracker/m365_daily.json"
RC_DAILY = "/Users/agent/pi-mono/.pi/services/daily_tracker/rc_daily.json"
RC_ERRORS = "/Users/agent/pi-mono/.pi/services/daily_tracker/rc_errors.json"
AMD_COV = "/Users/agent/pi-mono/.pi/services/daily_tracker/amd_coverage.json"

METHODOLOGY = [
    ("SCH-1", "Scheduling", "AMD", "Count of appointments with status=3 (Seen) where date of service = day.",
     "visit_details_all.ndjson field startdatetime + status",
     "2025-05..2025-12 undercounted: only visits that became recurring or had activity are in the ndjson."),
    ("SCH-2", "Scheduling", "AMD", "Count of status=1 (Arrived) — transient, normally rolls into Seen by EOD.",
     "visit_details_all.ndjson status=1", "Only populated when end-of-day snapshot happened mid-day."),
    ("SCH-3", "Scheduling", "AMD", "Count of status=10 (Cancelled) for startdatetime=day.",
     "visit_details_all.ndjson status=10",
     "Historical 2025-05..2025-12 mostly missing; NDJSON only caught cancels from ~2026-01 onward."),
    ("SCH-4", "Scheduling", "AMD", "Count of status=12 (No Show) for startdatetime=day.",
     "visit_details_all.ndjson status=12",
     "Historical 2025 missing; only 2026-01+ has reliable values."),
    ("SCH-5", "Scheduling", "AMD", "Total scheduled appointments for the day — from ndjson + older XMLs.",
     "visit_details_all.ndjson + /tmp/amd-ltv/q2q3_2025.xml + /tmp/amd-sso/q4_2025/*.xml",
     "Takes MAX of ndjson and XML to avoid double-counting overlapping pulls."),
    ("SCH-6", "Scheduling", "AMD", "No-show rate = SCH-4 / SCH-5 * 100.", "derived", "Only meaningful 2026-01+."),
    ("SCH-7", "Scheduling", "AMD", "Cancellation rate = SCH-3 / SCH-5 * 100.", "derived", "Only meaningful 2026-01+."),
    ("SCH-8", "Scheduling", "AMD", "Same-day cancels: status=10 AND modifieddate==startdatetime date.",
     "visit_details_all.ndjson modifieddate", "2026-01+ only."),
    ("SCH-9", "Scheduling", "AMD", "Telehealth visits (Seen only, istelemedicine=true).",
     "visit_details_all.ndjson istelemedicine", ""),
    ("SCH-10", "Scheduling", "AMD", "In-person visits (Seen only, istelemedicine=false).",
     "visit_details_all.ndjson", ""),
    ("REV-1", "Revenue", "AMD", "Total charges posted on the day (by date of service).",
     "/tmp/amd-ltv/tx_detail.ndjson — per-charge dos + fee",
     "SAMPLE ONLY: tx_detail covers 97 patients of 1,952. Undercounts by ~90-95%. Use as shape indicator, not absolute."),
    ("REV-2", "Revenue", "AMD", "Total payments collected on the day (paid column from charges).",
     "tx_detail.ndjson paid", "Sample-only. See REV-1 caveat."),
    ("REV-3", "Revenue", "AMD", "Insurance-portion payments.", "tx_detail.ndjson (not split in current pull)",
     "Not separated from REV-2 in this extract — left at 0. Requires retx action."),
    ("REV-4", "Revenue", "AMD", "Patient-portion payments.", "same", "Not separated; left at 0."),
    ("REV-5", "Revenue", "AMD", "Copays collected on the day.", "pending gettxhistory per-patient by code",
     "Not populated in this pull."),
    ("REV-6", "Revenue", "AMD", "Write-offs posted.", "pending", "Not populated in this pull."),
    ("REV-7", "Revenue", "AMD", "Distinct patients with at least one charge on day.",
     "tx_detail.ndjson patientid", "Sample-only (97 patients total)."),
    ("REV-8", "Revenue", "AMD", "Average charge per completed visit = REV-1 / SCH-1.",
     "derived", "Sample-only upstream."),
    ("REV-9", "Revenue", "AMD", "Collection rate = REV-2 / REV-1 * 100.", "derived", ""),
    ("NPF-1", "New Patients", "RC", "Inbound calls to main number — total inbound call-log rows for the day.",
     "/restapi/v1.0/account/~/call-log view=Detailed dateFrom/dateTo",
     "RC API detailed-view retention ~3 months; older days show N/A. Account has extended retention back to ~2025-05."),
    ("NPF-2", "New Patients", "RC", "Inquiries on keypad 1 — calls whose IVR leg matched new-patient menu id.",
     "call-log legs[].extension.id == 63198650008",
     "Requires per-leg inspection; not populated in this pass. Phase 2."),
    ("NPF-3", "New Patients", "M365", "Inbound referrals by email — count of messages in referrals@ inbox.",
     "/users/referrals@exulthealthcare.com/messages $filter receivedDateTime", ""),
    ("NPF-4", "New Patients", "M365", "Web form leads — count of messages in shaye.lemieux@ inbox.",
     "/users/shaye.lemieux@.../messages $filter receivedDateTime",
     "Shaye's mailbox only started receiving web-form submissions around 2026-03. Prior months will show 0."),
    ("NPF-5", "New Patients", "AMD", "New patient charts created — proxy by earliest startdatetime per patient in ndjson.",
     "visit_details_all.ndjson min(startdatetime) per patientid",
     "Proxy metric — earliest known visit date is a lower bound on patient creation."),
    ("NPF-6", "New Patients", "AMD", "First-visit arrivals — earliest visit per patient where status in (Seen, Arrived).",
     "same", "Proxy from ndjson first-visit heuristic."),
    ("NPF-7", "New Patients", "Derived", "Inquiry-to-booking conversion % (phase 2).", "derived",
     "Requires RC IVR leg parsing, deferred."),
    ("PHN-1", "Phone", "RC", "Total inbound calls = count of call-log rows direction=Inbound.",
     "/call-log view=Detailed", ""),
    ("PHN-2", "Phone", "RC", "Answered calls = result in (Accepted, Call connected) and duration>0.",
     "same", ""),
    ("PHN-3", "Phone", "RC", "Missed calls = result in (Missed, Abandoned, Rejected).", "same", ""),
    ("PHN-4", "Phone", "RC", "Voicemails left = result containing 'Voicemail'.", "same", ""),
    ("PHN-5", "Phone", "RC", "Avg answer time (sec) = median of (first ring -> answered leg) delta.",
     "legs[].startTime delta", "Often 0 in current pass because legs don't expose ring delta cleanly."),
    ("PHN-6", "Phone", "RC", "Outbound calls = count of direction=Outbound rows.", "same", ""),
    ("PHN-7", "Phone", "RC", "Call queue 55 (Front Office) volume = inbound calls whose legs touched queue 55.",
     "legs[].extension.id==881804009", ""),
    ("PHN-8", "Phone", "RC", "Longest hold (sec) = max leg duration on answered calls.", "legs[].duration",
     "Rough proxy; actual hold-time requires action-filter."),
    ("RX-1", "Rx", "M365", "Rx requests received — count of messages in prescriptions.rx@ mailbox.",
     "/users/prescriptions.rx@.../messages", "Inbox started routing Rx requests ~2025-09."),
    ("REC-1", "Records", "M365", "Medical record requests — count of threads in request@ Unified group.",
     "/groups/{id}/threads $filter lastDeliveredDateTime",
     "BLOCKED: app-only principal lacks Group.Read.All. Left blank."),
    ("REF-1", "Referrals", "M365", "Inbound referrals = same as NPF-3 (referrals@ inbox).",
     "/users/referrals@.../messages", "Duplicates NPF-3 per spec."),
    ("CI-1", "Calls", "RC", "Voicemail transcripts analyzed.", "/message-store?messageType=VoiceMail",
     "BLOCKED: RC JWT scopes lack ReadMessages. Phase 2."),
    ("CI-2", "Calls", "RC", "Complaint keywords in VM transcripts.", "same", "Blocked (see CI-1)."),
    ("CI-3", "Calls", "RC", "Urgent keywords (ER, suicide, crisis) in VM transcripts.", "same", "Blocked (see CI-1)."),
]


def build_summary_values(amd, m365, rc):
    """Aggregate monthly totals per KPI for the Summary sheet."""
    from write_cells import get_value, build_data_rows

    # For each KPI, compute per-month total (sum of daily values)
    rc_retention = set()
    try:
        rce = json.load(open(RC_ERRORS))
        rc_retention = set(rce.get("retention_blocked", []))
    except FileNotFoundError:
        pass

    monthly_totals: dict[str, dict[str, float]] = {}
    for ym in MONTHS:
        rows = build_data_rows(ym, amd, m365, rc, rc_retention)
        # rows is n_kpis x 33 (31 days + sum + avg); sum is at index 31
        for i, (kpi_id, *_) in enumerate(KPI_ROWS):
            total = rows[i][31]
            if ym not in monthly_totals:
                monthly_totals[ym] = {}
            if isinstance(total, (int, float)):
                monthly_totals[ym][kpi_id] = total
            else:
                monthly_totals[ym][kpi_id] = ""
    return monthly_totals


def build_summary_rows(monthly_totals):
    rows = []
    for kpi_id, label, cat, src in KPI_ROWS:
        row = []
        grand_total = 0.0
        n_valid = 0
        for ym in MONTHS:
            v = monthly_totals.get(ym, {}).get(kpi_id, "")
            if isinstance(v, (int, float)):
                row.append(v)
                grand_total += v
                n_valid += 1
            else:
                row.append("")
        if n_valid > 0:
            row.append(round(grand_total, 2))
            row.append(round(grand_total / n_valid, 2))
        else:
            row.append("")
            row.append("")
        rows.append(row)
    return rows


def build_data_quality_rows(amd, m365, rc, rc_errors):
    dq = []
    # Flag RC retention gaps
    for d in sorted(rc_errors.get("retention_blocked", [])):
        ym = d[:7]
        if ym in MONTHS:
            dq.append([ym, "PHN-*", d, "N/A — beyond RC call-log retention window", "RC", ""])

    # Flag months where AMD has zero Cancelled/NoShow (historical limitation)
    for ym in MONTHS[:8]:  # 2025-05..2025-12
        days = amd.get(ym, {})
        canc_sum = sum(b.get("SCH-3", 0) for b in days.values())
        ns_sum = sum(b.get("SCH-4", 0) for b in days.values())
        if canc_sum == 0 and ns_sum == 0:
            dq.append([ym, "SCH-3 / SCH-4", "",
                       "Historical 2025 NDJSON only has Seen/Arrived; Cancelled & NoShow missing",
                       "AMD", "Data from 2026-01 onward is complete."])

    # Flag M365 mailbox start dates
    startup_flags = {
        "shaye":         ("NPF-4", "2026-03", "Shaye's mailbox didn't receive web-form leads until ~2026-03."),
        "prescriptions": ("RX-1", "2025-09", "prescriptions.rx@ started routing around 2025-09."),
        "fax":           ("NPF-3 (alt)", "2025-06", "fax@ inbox started forwarding ~2025-06."),
    }
    for ym in MONTHS:
        data_month = m365.get(ym, {})
        for alias, (kpi_id, cutoff, note) in startup_flags.items():
            if ym < cutoff:
                total = sum(d.get(alias, 0) or 0 for d in data_month.values())
                if total == 0:
                    dq.append([ym, kpi_id, "", f"Expected zero: {note}", "M365", ""])
                    break  # one entry per month per alias is enough

    # Flag request@ blocked
    dq.append(["*", "REC-1", "2025-05..2026-04",
               "BLOCKED: app principal lacks Group.Read.All for request@ Unified group",
               "M365", "Requires admin consent grant."])

    # Flag CI-* blocked
    dq.append(["*", "CI-1..CI-3", "2025-05..2026-04",
               "BLOCKED: RC JWT scopes lack ReadMessages; VM transcripts unreachable",
               "RC", "Requires scope grant on dev portal app."])

    # Flag REV-* sample-only
    dq.append(["*", "REV-1..REV-9", "2025-05..2026-04",
               "SAMPLE ONLY: tx_detail covers 97 of 1,952 patients; dollar values are a ~5-10% sample",
               "AMD", "Backfill in progress (ARC022825). Use trend/shape, not absolutes."])

    return dq


def main():
    print("Summary / Methodology / Data_Quality writer")
    print("=" * 60)

    addr = json.load(open(ADDRESS))
    drive_id = addr["drive_id"]
    item_id = addr["item_id"]

    amd = json.load(open(AMD_DAILY))
    m365 = json.load(open(M365_DAILY))
    rc = json.load(open(RC_DAILY)) if Path(RC_DAILY).exists() else {ym: {} for ym in MONTHS}
    rce = json.load(open(RC_ERRORS)) if Path(RC_ERRORS).exists() else {}

    token = acquire_token()
    session_id = open_session(token, drive_id, item_id)
    print(f"session open: {session_id[:12]}")

    try:
        # Summary sheet — write monthly totals
        monthly_totals = build_summary_values(amd, m365, rc)
        summary_rows = build_summary_rows(monthly_totals)
        n_months = len(MONTHS)
        # Columns D..(D+n_months-1) then Grand Total, Avg/Month
        first_col = col_letter(3)
        last_col = col_letter(3 + n_months + 1)  # grand_total + avg
        n_rows = len(summary_rows)
        address = f"{first_col}2:{last_col}{1 + n_rows}"
        write_range(token, drive_id, item_id, "Summary", address, summary_rows, session_id)
        print(f"  Summary: {n_rows} rows x {n_months + 2} cols @ {address}")

        # Methodology sheet
        meth_rows = [[m[0], m[1], m[2], m[3], m[4], m[5]] for m in METHODOLOGY]
        write_range(
            token, drive_id, item_id, "Methodology",
            f"A2:F{1 + len(meth_rows)}", meth_rows, session_id,
        )
        print(f"  Methodology: {len(meth_rows)} rows")

        # Data_Quality sheet
        dq_rows = build_data_quality_rows(amd, m365, rc, rce)
        if dq_rows:
            write_range(
                token, drive_id, item_id, "Data_Quality",
                f"A2:F{1 + len(dq_rows)}", dq_rows, session_id,
            )
        print(f"  Data_Quality: {len(dq_rows)} rows")

    finally:
        close_session(token, drive_id, item_id, session_id)
        print("session closed")


if __name__ == "__main__":
    main()
