#!/usr/bin/env python3
"""Re-aggregate REV-1..REV-9 rows from the FULL tx_detail parquet files.

The v1 extract_amd.py used a sample of 100 patients from /tmp/amd-ltv/tx_detail.ndjson.
This script uses the authoritative full backfill at:
  /Users/agent/pi-mono/.pi/services/cohort_analysis/raw/tx_detail_charges.parquet   (7754 rows)
  /Users/agent/pi-mono/.pi/services/cohort_analysis/raw/tx_detail_payments.parquet  (11490 rows)

It writes REV cells (rows 11..19) directly into each monthly workbook sheet,
preserving the existing AMD SCH-*, NPF-5/6 and all other rows.

REV-1 = sum(fee)     grouped by dos (charges table)
REV-2 = sum(paid)    grouped by dos (charges table) — authoritative; charges.paid
        already reconciles all payment + writeoff adjustments.
REV-3 = insurance payments: sum(|amount|) from payments where source='2' (insurance side)
        grouped by payment_date.  source='2' is where carrier remits (e.g. Aetna EOB).
REV-4 = patient payments: sum(|amount|) where source='1' (patient side), paycode IN
        ('PP','#PTPORTAL','#TELEH'), grouped by payment_date.
REV-5 = copays (digital collection channel): paycode IN ('#PTPORTAL','#TELEH') subset
        of REV-4 — these are at-time-of-visit or portal copays.
REV-6 = write-offs: (fee - paid) per dos from charges (contractual + bad-debt writeoffs)
REV-7 = distinct patient_id count per dos
REV-8 = average charge per SCH-1 (seen) — recomputed from existing amd_daily.json SCH-1
REV-9 = collection rate: paid/fee * 100 per dos

Writes are performed DIRECTLY to the workbook (no intermediate amd_daily.json change)
so the numeric totals visible in the sheet reflect the full backfill.
"""
from __future__ import annotations

import calendar
import json
import sys
import time
from collections import defaultdict

import duckdb

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
CHARGES = "/Users/agent/pi-mono/.pi/services/cohort_analysis/raw/tx_detail_charges.parquet"
PAYMENTS = "/Users/agent/pi-mono/.pi/services/cohort_analysis/raw/tx_detail_payments.parquet"
OUT_JSON = "/Users/agent/pi-mono/.pi/services/daily_tracker/rev_rerun_daily.json"

REV_IDS = ["REV-1", "REV-2", "REV-3", "REV-4", "REV-5", "REV-6", "REV-7", "REV-8", "REV-9"]


def us_to_iso(mdy: str) -> str | None:
    if not mdy or len(mdy) != 10:
        return None
    try:
        m, d, y = mdy.split("/")
        return f"{y}-{m.zfill(2)}-{d.zfill(2)}"
    except ValueError:
        return None


def aggregate() -> dict:
    """Return {ym: {date: {REV-1..9}}} aggregated from parquet."""
    con = duckdb.connect()

    # Charges rolled up by dos
    rows_c = con.execute(
        """
        SELECT
            dos,
            SUM(fee)               as fee,
            SUM(paid)              as paid,
            SUM(fee - paid)        as writeoff,
            COUNT(DISTINCT patient_id) as pats
        FROM read_parquet(?)
        WHERE dos IS NOT NULL AND dos <> '' AND LENGTH(dos) = 10
        GROUP BY dos
        """,
        [CHARGES],
    ).fetchall()

    # Payments rolled up by payment_date, split by source
    # AMD convention: source='1' = patient-side apply, source='2' = insurance-side apply
    rows_p = con.execute(
        """
        SELECT
            payment_date,
            SUM(CASE WHEN source = '2' AND amount < 0 THEN -amount ELSE 0 END)  as ins_pay,
            SUM(CASE WHEN source = '1' AND paycode IN ('PP','#PTPORTAL','#TELEH')
                     AND amount < 0 THEN -amount ELSE 0 END) as pat_pay,
            SUM(CASE WHEN source = '1' AND paycode IN ('#PTPORTAL','#TELEH')
                     AND amount < 0 THEN -amount ELSE 0 END) as copay
        FROM read_parquet(?)
        WHERE payment_date IS NOT NULL AND payment_date <> '' AND LENGTH(payment_date) = 10
        GROUP BY payment_date
        """,
        [PAYMENTS],
    ).fetchall()
    con.close()

    data: dict = {ym: {} for ym in MONTHS}

    for dos, fee, paid, writeoff, pats in rows_c:
        iso = us_to_iso(dos)
        if not iso:
            continue
        ym = iso[:7]
        if ym not in data:
            continue
        bucket = data[ym].setdefault(iso, {})
        bucket["REV-1"] = round(float(fee), 2)
        bucket["REV-2"] = round(float(paid), 2)
        bucket["REV-6"] = round(float(writeoff), 2)
        bucket["REV-7"] = int(pats)
        bucket["REV-9"] = round(100.0 * float(paid) / float(fee), 1) if fee else 0

    for pdt, ins_pay, pat_pay, copay in rows_p:
        iso = us_to_iso(pdt)
        if not iso:
            continue
        ym = iso[:7]
        if ym not in data:
            continue
        bucket = data[ym].setdefault(iso, {})
        bucket["REV-3"] = round(float(ins_pay or 0), 2)
        bucket["REV-4"] = round(float(pat_pay or 0), 2)
        bucket["REV-5"] = round(float(copay or 0), 2)

    # REV-8: avg charge per seen visit — derive from existing amd_daily.json SCH-1
    try:
        amd = json.load(open(AMD_DAILY))
    except FileNotFoundError:
        amd = {}
    for ym in MONTHS:
        days = data[ym]
        amd_days = amd.get(ym, {})
        for date, bucket in days.items():
            sch1 = int((amd_days.get(date) or {}).get("SCH-1") or 0)
            if sch1 > 0 and bucket.get("REV-1"):
                bucket["REV-8"] = round(bucket["REV-1"] / sch1, 2)
            else:
                bucket["REV-8"] = 0

    return data


def row_index_for_kpi(kpi_id: str) -> int:
    """Return 1-indexed workbook row number for a KPI (header is row 1)."""
    for idx, (k, *_rest) in enumerate(KPI_ROWS):
        if k == kpi_id:
            return idx + 2  # row 1 is header, so KPI 0 -> row 2
    raise KeyError(kpi_id)


def write_rev_to_workbook(data: dict) -> None:
    addr = json.load(open(ADDRESS))
    drive_id = addr["drive_id"]
    item_id = addr["item_id"]

    token = acquire_token()
    session_id = open_session(token, drive_id, item_id)
    print(f"session open: {session_id[:12]}")
    t0 = time.time()

    try:
        for ym in MONTHS:
            if time.time() - t0 > 45 * 60:
                token = acquire_token()
                t0 = time.time()
            y, m = map(int, ym.split("-"))
            n_days = calendar.monthrange(y, m)[1]
            days = [f"{y:04d}-{m:02d}-{d:02d}" for d in range(1, n_days + 1)]

            for kpi_id in REV_IDS:
                row_vals = []
                for date in days:
                    v = data[ym].get(date, {}).get(kpi_id)
                    row_vals.append(v if v is not None else 0)
                # pad to 31 day columns
                while len(row_vals) < 31:
                    row_vals.append("")
                numeric = [x for x in row_vals if isinstance(x, (int, float))]
                total = round(sum(numeric), 2) if numeric else 0
                avg = round(sum(numeric) / len(numeric), 2) if numeric else 0
                row_vals.extend([total, avg])

                row_num = row_index_for_kpi(kpi_id)
                first_col = col_letter(3)  # D
                last_col = col_letter(3 + 33 - 1)  # AJ
                addr_range = f"{first_col}{row_num}:{last_col}{row_num}"
                write_range(
                    token, drive_id, item_id, ym, addr_range, [row_vals], session_id,
                )
            print(f"  {ym}: wrote {len(REV_IDS)} REV rows")
            time.sleep(0.15)
    finally:
        close_session(token, drive_id, item_id, session_id)
        print("session closed")


def main():
    print("rerun_rev — full tx_detail aggregation")
    print("=" * 60)
    data = aggregate()

    # Log per-month totals for sanity
    print(f"  {'Month':<9} {'Charges':>12} {'Paid':>12} {'Writeoff':>12} {'Ins':>12} {'Pat':>12}")
    grand = defaultdict(float)
    for ym in MONTHS:
        ch = sum(b.get("REV-1", 0) for b in data[ym].values())
        pd_ = sum(b.get("REV-2", 0) for b in data[ym].values())
        wo = sum(b.get("REV-6", 0) for b in data[ym].values())
        ins = sum(b.get("REV-3", 0) for b in data[ym].values())
        pat = sum(b.get("REV-4", 0) for b in data[ym].values())
        grand["ch"] += ch
        grand["pd"] += pd_
        grand["wo"] += wo
        grand["ins"] += ins
        grand["pat"] += pat
        print(f"  {ym:<9} {ch:>12.0f} {pd_:>12.0f} {wo:>12.0f} {ins:>12.0f} {pat:>12.0f}")
    print(f"  {'TOTAL':<9} {grand['ch']:>12.0f} {grand['pd']:>12.0f} {grand['wo']:>12.0f} {grand['ins']:>12.0f} {grand['pat']:>12.0f}")

    with open(OUT_JSON, "w") as f:
        json.dump(data, f, indent=2)
    print(f"saved -> {OUT_JSON}")

    write_rev_to_workbook(data)
    print("done.")


if __name__ == "__main__":
    main()
