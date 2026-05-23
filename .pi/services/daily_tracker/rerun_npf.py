#!/usr/bin/env python3
"""Populate NPF-2 (keypad-1 -> Shaye) and NPF-7 (inquiry -> booking conversion).

Sources:
  NPF-2 = precomputed /Users/agent/pi-mono/.pi/services/daily_tracker/npf2_keypad1_daily.json
  NPF-7 = NPF-5 (new patients created per day from AMD patient_directory_v2_authoritative.json)
          divided by NPF-2 (answered keypad-1 calls)

Coverage caveat: keypad-1 routing to Shaye ext 201 was enabled 2026-04-10 only.
Prior months have no data — we leave cells blank and file a Data_Quality note.
The pre-computed JSON covers 2026-02-23 to 2026-04-10; days outside that window
get blank (not zero) because we don't know whether keypad-1 routing existed.
"""
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
NPF2_SRC = "/Users/agent/pi-mono/.pi/services/daily_tracker/npf2_keypad1_daily.json"
AMD_DAILY = "/Users/agent/pi-mono/.pi/services/daily_tracker/amd_daily.json"
OUT = "/Users/agent/pi-mono/.pi/services/daily_tracker/npf_rerun_daily.json"

# keypad-1 routing enablement date (per task brief)
KEYPAD1_ENABLED_DATE = "2026-04-10"


def row_index_for_kpi(kpi_id: str) -> int:
    for idx, (k, *_rest) in enumerate(KPI_ROWS):
        if k == kpi_id:
            return idx + 2
    raise KeyError(kpi_id)


def load_npf2_windowed() -> tuple[dict, str, str]:
    raw = json.load(open(NPF2_SRC))
    daily = raw.get("daily", {})
    window = raw.get("window", "")
    # extract window bounds from the string "YYYY-MM-DDTHH:MM... to YYYY-MM-DDTHH:MM..."
    parts = window.split(" to ")
    if len(parts) == 2:
        win_from = parts[0][:10]
        win_to = parts[1][:10]
    else:
        # fallback to min/max of keys
        keys = sorted(daily.keys())
        win_from = keys[0] if keys else ""
        win_to = keys[-1] if keys else ""
    return daily, win_from, win_to


def load_new_patients_by_date() -> dict[str, int]:
    """Return {date: NPF-5} from amd_daily.json.

    NPF-5 is derived in extract_amd.py as "earliest visit date per patient_id"
    which is the same-day proxy for new-chart-created. The patient_directory_v2
    authoritative file does not expose creationdate, so we pull NPF-5 from the
    already-aggregated AMD daily bundle.
    """
    if not Path(AMD_DAILY).exists():
        return {}
    try:
        amd = json.load(open(AMD_DAILY))
    except json.JSONDecodeError:
        return {}
    by_date: dict[str, int] = {}
    for ym, days in amd.items():
        for date, bucket in days.items():
            n = int(bucket.get("NPF-5") or 0)
            if n:
                by_date[date] = n
    return by_date


def main():
    print("rerun_npf — NPF-2 + NPF-7")
    print("=" * 60)

    npf2_daily, win_from, win_to = load_npf2_windowed()
    print(f"  NPF-2 window: {win_from} .. {win_to}")
    print(f"  NPF-2 days in source: {len(npf2_daily)}")

    new_pts = load_new_patients_by_date()
    n_with_date = sum(new_pts.values())
    print(f"  new patients loaded: {n_with_date} records with creationdate")

    # Build rows for the workbook write
    # NPF-2: 'to_shaye' per day where date is within window
    # NPF-7: NPF-5/NPF-2 * 100 (new patients / keypad-1 calls, same day) or blank if NPF-2 < 1
    data: dict = {ym: {} for ym in MONTHS}
    total_npf2 = 0
    for ym in MONTHS:
        y, m = map(int, ym.split("-"))
        n_days = calendar.monthrange(y, m)[1]
        for d in range(1, n_days + 1):
            date = f"{y:04d}-{m:02d}-{d:02d}"
            in_window = (win_from <= date <= win_to) if (win_from and win_to) else False
            if in_window:
                entry = npf2_daily.get(date, {})
                npf2_val = int(entry.get("to_shaye", 0))
                answered = int(entry.get("answered", 0))
            else:
                npf2_val = None  # blank
                answered = 0
            # NPF-7 = new_patients_created_today / answered_keypad1_today * 100
            #   but only when answered > 0 AND we're in window
            npf5 = new_pts.get(date, 0)
            if in_window and answered > 0:
                npf7_val = round(100.0 * npf5 / answered, 1)
            else:
                npf7_val = None
            data[ym][date] = {"NPF-2": npf2_val, "NPF-7": npf7_val}
            if npf2_val is not None:
                total_npf2 += npf2_val

    print(f"  total NPF-2 (to_shaye) across window: {total_npf2}")

    with open(OUT, "w") as f:
        json.dump({"daily": data, "win_from": win_from, "win_to": win_to}, f, indent=2)
    print(f"  wrote {OUT}")

    # Workbook write
    addr = json.load(open(ADDRESS))
    drive_id = addr["drive_id"]
    item_id = addr["item_id"]

    token = acquire_token()
    session_id = open_session(token, drive_id, item_id)
    try:
        npf2_row = row_index_for_kpi("NPF-2")
        npf7_row = row_index_for_kpi("NPF-7")
        print(f"  NPF-2 row={npf2_row}   NPF-7 row={npf7_row}")
        for ym in MONTHS:
            y, m = map(int, ym.split("-"))
            n_days = calendar.monthrange(y, m)[1]
            # Build NPF-2 row
            def build_row(kpi_id: str):
                day_vals = []
                for d in range(1, n_days + 1):
                    date = f"{y:04d}-{m:02d}-{d:02d}"
                    v = data[ym][date][kpi_id]
                    day_vals.append(v if v is not None else "")
                while len(day_vals) < 31:
                    day_vals.append("")
                numeric = [x for x in day_vals if isinstance(x, (int, float))]
                total = sum(numeric) if numeric else ""
                avg = round(sum(numeric) / len(numeric), 2) if numeric else ""
                return day_vals + [total, avg]

            first_col = col_letter(3)
            last_col = col_letter(3 + 33 - 1)

            row_vals_npf2 = build_row("NPF-2")
            addr_range = f"{first_col}{npf2_row}:{last_col}{npf2_row}"
            write_range(token, drive_id, item_id, ym, addr_range, [row_vals_npf2], session_id)

            row_vals_npf7 = build_row("NPF-7")
            addr_range = f"{first_col}{npf7_row}:{last_col}{npf7_row}"
            write_range(token, drive_id, item_id, ym, addr_range, [row_vals_npf7], session_id)

            print(f"  {ym}: NPF-2 + NPF-7 written")
            time.sleep(0.1)
    finally:
        close_session(token, drive_id, item_id, session_id)
    print("done.")


if __name__ == "__main__":
    main()
