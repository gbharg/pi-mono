#!/usr/bin/env python3
"""Patch the Data_Quality sheet: replace BLOCKED markers with Unblocked notes.

Targeted surgery — does not rebuild the whole Data_Quality table. Replaces the
three specific rows (REC-1, CI-1..3, REV-1..9) and appends new rows for NPF-2
and newly-discovered limitations.
"""
from __future__ import annotations

import json
import sys

sys.path.insert(0, "/Users/agent/pi-mono/.pi/services/daily_tracker")

from graph_util import (
    acquire_token,
    close_session,
    open_session,
    read_range,
    write_range,
)

ADDRESS = "/Users/agent/pi-mono/.pi/services/daily_tracker/workbook_address.json"

UNBLOCKED_DATE = "2026-04-11"

REPLACEMENT_ROWS = {
    # kpi_id marker -> replacement row values
    "REC-1": [
        "*", "REC-1", "2025-05..2026-04-09",
        "Unblocked 2026-04-11 via Graph Group.Read.All. Group createdDateTime=2026-04-10T16:08Z, so historical threads unavailable (group was created today). Pre-2026-04-10 days written as 0; treat as N/A not absent.",
        "M365",
        "Group ID 0e6b44be-c3db-43c5-9a0a-fa112f81f6d0. No predecessor mailbox in Exchange Online.",
    ],
    "CI-1..CI-3": [
        "*", "CI-1..CI-3", "2025-05..2026-02-08",
        "Unblocked 2026-04-11 via RC ReadMessages scope. Populated 2026-02-09..2026-04-10 (168 transcripts, 13 complaints flagged, 103 urgent-keyword hits). RC message-store retention ~60 days so 2025 and Jan 2026 unreachable.",
        "RC",
        "Extensions queried: 8003, 8004, 8000, 8002, 8005, 55, 201, 2002. Transcript bodies NEVER stored or logged - only aggregate counts per day.",
    ],
    "REV-1..REV-9": [
        "*", "REV-1..REV-9", "2025-05..2026-04",
        "Unblocked 2026-04-11 via full tx_detail backfill (7754 charges, 11490 payment lines). Actual totals: $2.09M gross / $1.71M paid / $383K writeoff / $169K insurance / $452K patient. Prior 'sample only' ceased.",
        "AMD",
        "Parquet: cohort_analysis/raw/tx_detail_charges.parquet + tx_detail_payments.parquet. REV-1/2/6/7/9 grouped by dos; REV-3/4/5 grouped by payment_date; REV-8 = REV-1/SCH-1.",
    ],
}

# New rows to append
APPEND_ROWS = [
    ["*", "NPF-2", "2025-05..2026-04-08",
     "Unblocked 2026-04-11 via keypad-1 routing analysis. Only enabled 2026-04-10 (7 calls) and 1 stray on 2026-04-09 (routing drift). 2026-02-23..2026-04-08 window shows zero because keypad-1 routing did not exist then. Pre-2026-02-23 days are blank (N/A - routing state unknown).",
     "RC",
     "Source: npf2_keypad1_daily.json. Shaye ext id 63198650008."],
    ["*", "NPF-7", "2025-05..2026-04-08",
     "Conversion %: blank for days with NPF-2=0 or out of window. Only 3 answered keypad-1 calls total (all 2026-04-10), so conversion % currently non-meaningful.",
     "Derived",
     "NPF-7 = NPF-5 (new patient charts from AMD amd_daily.json) / NPF-2 answered calls, same day."],
    ["*", "CI-3", "",
     "Urgent-keyword regex is broad: 'hurt', 'er ' (with space), 'harm' produce false positives from everyday speech. 103 urgent hits is an upper bound; manual review recommended before treating as triage signal.",
     "RC",
     "Consider refining keyword list to {'suicid', 'crisis', 'emergency', 'overdose', '911'}."],
    ["*", "REC-1", "",
     "Going forward: request@ group is now monitored. New threads from 2026-04-11 onward will populate REC-1 directly.",
     "M365",
     "Weekly rerun of rerun_rec1.py will pick up new threads. No action needed."],
]


def main():
    print("rerun_dq - patch Data_Quality BLOCKED markers")
    print("=" * 60)

    addr = json.load(open(ADDRESS))
    drive_id = addr["drive_id"]
    item_id = addr["item_id"]

    token = acquire_token()

    # 1) Find current row numbers of the three BLOCKED rows
    r = read_range(token, drive_id, item_id, "Data_Quality", "A1:F200")
    values = r.get("values", [])
    print(f"  Data_Quality has {len(values)} populated rows")

    target_rows: dict[str, int] = {}
    for idx, row in enumerate(values, 1):
        if len(row) < 2:
            continue
        kpi = str(row[1]).strip()
        if kpi in REPLACEMENT_ROWS and "BLOCKED" in str(row[3] if len(row) > 3 else ""):
            target_rows[kpi] = idx

    print(f"  matched BLOCKED rows: {target_rows}")

    # Find the last populated row so we know where to append
    last_row = 1
    for idx, row in enumerate(values, 1):
        if any(str(c).strip() for c in row):
            last_row = idx

    session_id = open_session(token, drive_id, item_id)
    try:
        # Replace each BLOCKED row in-place
        for kpi, row_num in target_rows.items():
            new_row = REPLACEMENT_ROWS[kpi]
            addr_range = f"A{row_num}:F{row_num}"
            write_range(token, drive_id, item_id, "Data_Quality", addr_range, [new_row], session_id)
            print(f"  replaced row {row_num} ({kpi})")

        # Append new rows
        append_start = last_row + 1
        for i, new_row in enumerate(APPEND_ROWS):
            row_num = append_start + i
            addr_range = f"A{row_num}:F{row_num}"
            write_range(token, drive_id, item_id, "Data_Quality", addr_range, [new_row], session_id)
            print(f"  appended row {row_num} ({new_row[1]})")
    finally:
        close_session(token, drive_id, item_id, session_id)
    print("done.")


if __name__ == "__main__":
    main()
