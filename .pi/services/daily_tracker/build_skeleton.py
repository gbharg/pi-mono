#!/usr/bin/env python3
"""Create the Daily Operations Tracker workbook and scaffold all sheets."""
from __future__ import annotations

import calendar
import datetime as dt
import json
import sys
import urllib.parse

sys.path.insert(0, "/Users/agent/pi-mono/.pi/services/daily_tracker")

from graph_util import (
    GRAPH_V1,
    acquire_token,
    add_worksheet,
    call,
    close_session,
    col_letter,
    delete_worksheet,
    freeze_panes,
    list_worksheets,
    open_session,
    upload_empty_workbook,
    write_range,
)
from kpi_schema import KPI_ROWS, MONTHS, WORKBOOK_PATH, WORKBOOK_USER

ADDRESS_JSON = "/Users/agent/pi-mono/.pi/services/daily_tracker/workbook_address.json"


def month_dates(ym: str) -> list[str]:
    y, m = ym.split("-")
    y, m = int(y), int(m)
    n = calendar.monthrange(y, m)[1]
    return [f"{y:04d}-{m:02d}-{d:02d}" for d in range(1, n + 1)]


def build_header_row(ym: str) -> list:
    dates = month_dates(ym)
    # columns A-C: KPI, Category, Source
    row = ["KPI", "Category", "Source"]
    # columns D..AH (31 day slots)
    for i in range(31):
        row.append(dates[i] if i < len(dates) else "")
    # AI, AJ
    row.append("Month Total")
    row.append("Month Avg")
    return row


def build_kpi_label_rows() -> list[list]:
    rows = []
    for kpi_id, label, category, source in KPI_ROWS:
        # label column merges kpi_id and description
        row = [f"{kpi_id} {label}", category, source]
        # 31 day cells + 2 summary cells — start blank, data filled later
        row.extend([None] * 33)
        rows.append(row)
    return rows


def upsert_workbook(token: str) -> dict:
    # Check if file already exists
    path_url = (
        f"{GRAPH_V1}/users/{urllib.parse.quote(WORKBOOK_USER)}"
        f"/drive/root:{urllib.parse.quote(WORKBOOK_PATH)}"
    )
    try:
        item = call("GET", path_url, token)
        print(f"  workbook exists: item_id={item['id']}")
        return item
    except RuntimeError as e:
        if "404" not in str(e):
            raise
    print(f"  creating workbook at {WORKBOOK_PATH}")
    # Ensure parent folder exists by creating it idempotently
    # (OneDrive `root:/a/b/c.xlsx:/content` will create intermediate folders)
    item = upload_empty_workbook(token, WORKBOOK_USER, WORKBOOK_PATH)
    print(f"  uploaded: item_id={item['id']}")
    return item


def main():
    print("Daily Operations Tracker — skeleton builder")
    print("=" * 60)

    token = acquire_token()
    print("token acquired")

    item = upsert_workbook(token)
    item_id = item["id"]
    drive_id = item["parentReference"]["driveId"]
    web_url = item.get("webUrl", "")
    print(f"drive_id={drive_id}")
    print(f"item_id={item_id}")

    session_id = open_session(token, drive_id, item_id)
    print(f"workbook session open: {session_id[:12]}...")

    try:
        # Get existing sheet names
        sheets = list_worksheets(token, drive_id, item_id, session_id=session_id)
        existing = {s["name"]: s for s in sheets}
        print(f"existing sheets: {sorted(existing.keys())}")

        # Delete default Sheet1 if it has no data
        if "Sheet1" in existing and len(existing) > 1:
            delete_worksheet(token, drive_id, item_id, "Sheet1", session_id=session_id)
            print("  removed Sheet1")
            existing.pop("Sheet1", None)

        want = MONTHS + ["Summary", "Methodology", "Data_Quality"]

        for name in want:
            if name in existing:
                print(f"  sheet '{name}' exists, skipping add")
                continue
            add_worksheet(token, drive_id, item_id, name, session_id=session_id)
            print(f"  added sheet '{name}'")

        # Now remove Sheet1 if it still exists and we have other sheets
        sheets2 = list_worksheets(token, drive_id, item_id, session_id=session_id)
        names2 = {s["name"] for s in sheets2}
        if "Sheet1" in names2 and len(names2) > 1:
            delete_worksheet(token, drive_id, item_id, "Sheet1", session_id=session_id)
            print("  removed Sheet1 (post-add)")

        # Write headers + KPI label rows for each monthly sheet
        label_rows = build_kpi_label_rows()
        n_kpis = len(label_rows)

        for ym in MONTHS:
            header = build_header_row(ym)
            # header range: A1:AJ1 (36 columns: A..C labels + D..AH 31 days + AI,AJ)
            last_col = col_letter(len(header) - 1)
            write_range(
                token, drive_id, item_id, ym,
                f"A1:{last_col}1", [header], session_id,
            )
            # labels: A2:C(n+1)
            label_only = [[r[0], r[1], r[2]] for r in label_rows]
            write_range(
                token, drive_id, item_id, ym,
                f"A2:C{1 + n_kpis}", label_only, session_id,
            )
            # freeze panes at C2 (first 1 row, first 3 cols)
            freeze_panes(token, drive_id, item_id, ym, 1, 3, session_id=session_id)
            print(f"  scaffolded sheet {ym} ({n_kpis} KPI rows, {len(header)-5} day cols)")

        # Summary sheet — months in columns, KPIs in rows
        summary_header = ["KPI", "Category", "Source"] + MONTHS + ["Grand Total", "Avg/Month"]
        last_col = col_letter(len(summary_header) - 1)
        write_range(
            token, drive_id, item_id, "Summary",
            f"A1:{last_col}1", [summary_header], session_id,
        )
        summary_labels = [[r[0], r[1], r[2]] for r in label_rows]
        write_range(
            token, drive_id, item_id, "Summary",
            f"A2:C{1 + n_kpis}", summary_labels, session_id,
        )
        freeze_panes(token, drive_id, item_id, "Summary", 1, 3, session_id=session_id)
        print(f"  scaffolded Summary")

        # Methodology sheet header
        meth_header = ["KPI", "Category", "Source System", "Definition", "Query / File", "Caveats"]
        write_range(
            token, drive_id, item_id, "Methodology",
            f"A1:F1", [meth_header], session_id,
        )
        freeze_panes(token, drive_id, item_id, "Methodology", 1, 1, session_id=session_id)
        print("  scaffolded Methodology")

        # Data_Quality sheet header
        dq_header = ["Sheet", "KPI", "Date", "Issue", "Source System", "Notes"]
        write_range(
            token, drive_id, item_id, "Data_Quality",
            f"A1:F1", [dq_header], session_id,
        )
        freeze_panes(token, drive_id, item_id, "Data_Quality", 1, 1, session_id=session_id)
        print("  scaffolded Data_Quality")

    finally:
        close_session(token, drive_id, item_id, session_id)
        print("session closed")

    # Persist the address for downstream scripts
    with open(ADDRESS_JSON, "w") as f:
        json.dump({
            "created_at": dt.datetime.utcnow().isoformat(timespec="seconds") + "Z",
            "path": WORKBOOK_PATH,
            "user": WORKBOOK_USER,
            "drive_id": drive_id,
            "item_id": item_id,
            "web_url": web_url,
            "worksheets": MONTHS + ["Summary", "Methodology", "Data_Quality"],
        }, f, indent=2)
    print(f"address saved to {ADDRESS_JSON}")


if __name__ == "__main__":
    main()
