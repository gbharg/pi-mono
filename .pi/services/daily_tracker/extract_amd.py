#!/usr/bin/env python3
"""Aggregate AMD visit NDJSON + historical XMLs into per-day KPI values.

Writes /Users/agent/pi-mono/.pi/services/daily_tracker/amd_daily.json
with structure: {ym: {date: {kpi_id: value, ...}, ...}, ...}
"""
from __future__ import annotations

import calendar
import datetime as dt
import json
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

NDJSON_VISITS = "/Users/agent/pi-mono/.pi/services/amd/q1_raw_phi/visit_details_all.ndjson"
XML_FILES = [
    "/tmp/amd-ltv/q2q3_2025.xml",
    "/tmp/amd-sso/q4_2025/q4_2025_raw.xml",
    "/tmp/amd-sso/q4_2025/q1_2026_raw.xml",
]
TX_DETAIL = "/tmp/amd-ltv/tx_detail.ndjson"
PATIENT_DIR = "/Users/agent/pi-mono/.pi/services/amd/q1_raw_phi/patient_directory_v2_authoritative.json"

OUT_PATH = "/Users/agent/pi-mono/.pi/services/daily_tracker/amd_daily.json"
OUT_META = "/Users/agent/pi-mono/.pi/services/daily_tracker/amd_coverage.json"

STATUS_SEEN = 3
STATUS_ARRIVED = 1
STATUS_CANCELLED = 10
STATUS_RESCHEDULED = 11
STATUS_NOSHOW = 12

MONTHS = [
    "2025-05", "2025-06", "2025-07", "2025-08",
    "2025-09", "2025-10", "2025-11", "2025-12",
    "2026-01", "2026-02", "2026-03", "2026-04",
]


def new_day_bucket() -> dict:
    return {
        "SCH-1": 0,  # Seen
        "SCH-2": 0,  # Arrived
        "SCH-3": 0,  # Cancelled
        "SCH-4": 0,  # NoShow
        "SCH-5": 0,  # Total scheduled
        "SCH-8": 0,  # Same-day cancels
        "SCH-9": 0,  # Telehealth visits (Seen only)
        "SCH-10": 0,  # In-person visits (Seen only)
        "REV-1": 0.0,  # Charges
        "REV-2": 0.0,  # Payments total
        "REV-3": 0.0,  # Ins payments
        "REV-4": 0.0,  # Patient payments
        "REV-5": 0.0,  # Copays
        "REV-6": 0.0,  # Write-offs
        "REV-7": set(),  # distinct patients billed (converted to int later)
        "NPF-5": 0,  # new patient charts
        "NPF-6": 0,  # first-visit arrivals
    }


def month_ym(d: str) -> str:
    return d[:7] if d else ""


def add_visit_ndjson(data: dict[str, dict], visit: dict, new_patient_ids: set[int] | None = None):
    sdt = visit.get("startdatetime") or ""
    if not sdt:
        return
    date = sdt[:10]
    ym = date[:7]
    if ym not in data:
        return
    if date not in data[ym]:
        data[ym][date] = new_day_bucket()
    bucket = data[ym][date]
    status = visit.get("status")
    bucket["SCH-5"] += 1
    if status == STATUS_SEEN:
        bucket["SCH-1"] += 1
        is_th = bool(visit.get("istelemedicine"))
        if is_th:
            bucket["SCH-9"] += 1
        else:
            bucket["SCH-10"] += 1
    elif status == STATUS_ARRIVED:
        bucket["SCH-2"] += 1
    elif status == STATUS_CANCELLED:
        bucket["SCH-3"] += 1
        # same-day cancel: modifieddate same as startdatetime date
        md = (visit.get("modifieddate") or "")[:10]
        if md == date:
            bucket["SCH-8"] += 1
    elif status == STATUS_NOSHOW:
        bucket["SCH-4"] += 1

    # New-patient arrivals (first-visit arrivals)
    if new_patient_ids is not None:
        pid = visit.get("patientid")
        if pid in new_patient_ids and status in (STATUS_SEEN, STATUS_ARRIVED):
            bucket["NPF-6"] += 1


def add_appt_xml(data: dict[str, dict], appt_el: ET.Element):
    sd = appt_el.attrib.get("startdate", "")  # MM/DD/YYYY
    if not sd:
        return
    try:
        m, d, y = sd.split("/")
        date = f"{y}-{m.zfill(2)}-{d.zfill(2)}"
    except ValueError:
        return
    ym = date[:7]
    if ym not in data:
        return
    if date not in data[ym]:
        data[ym][date] = new_day_bucket()
    data[ym][date]["SCH-5"] += 1  # only total scheduled; no status in XML


def add_charge(data: dict[str, dict], charge_el: ET.Element):
    dos = charge_el.attrib.get("dos", "")
    if not dos:
        return
    try:
        m, d, y = dos.split("/")
        date = f"{y}-{m.zfill(2)}-{d.zfill(2)}"
    except ValueError:
        return
    ym = date[:7]
    if ym not in data:
        return
    if date not in data[ym]:
        data[ym][date] = new_day_bucket()
    b = data[ym][date]
    try:
        fee = float(charge_el.attrib.get("fee", "0") or 0)
        paid = float(charge_el.attrib.get("paid", "0") or 0)
    except ValueError:
        fee = paid = 0.0
    b["REV-1"] += fee
    b["REV-2"] += paid
    # Without per-line pay-source we cannot split REV-3 / REV-4; leave 0
    pid = charge_el.attrib.get("patientid")
    if pid:
        b["REV-7"].add(pid)


def load_patient_new_dates() -> dict[int, str]:
    """Load patient directory to know when each patient was first created."""
    try:
        with open(PATIENT_DIR) as f:
            pd = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}
    out = {}
    # Patient directory may be a list or a dict of id->record
    if isinstance(pd, dict) and "patients" in pd:
        items = pd["patients"]
    elif isinstance(pd, dict):
        items = list(pd.values())
    else:
        items = pd
    for p in items:
        if not isinstance(p, dict):
            continue
        pid = p.get("patientid") or p.get("id") or p.get("patient_id")
        cd = p.get("createdate") or p.get("creationdate") or p.get("created")
        if pid and cd:
            try:
                out[int(pid)] = str(cd)[:10]
            except (ValueError, TypeError):
                pass
    return out


def main():
    print("AMD extractor")
    print("=" * 60)
    data: dict[str, dict[str, dict]] = {ym: {} for ym in MONTHS}

    coverage = {
        "ndjson_visits": 0,
        "xml_appts": 0,
        "tx_charges": 0,
        "by_month": defaultdict(lambda: {"ndjson": 0, "xml": 0, "tx": 0}),
    }

    # 1. First pass over NDJSON: compute each patient's earliest visit date
    #    to derive NPF-5 (new patient charts created) and NPF-6 (first visit seen).
    patient_first_visit: dict[int, tuple[str, int]] = {}  # pid -> (date, status)
    with open(NDJSON_VISITS) as f:
        for line in f:
            try:
                v = json.loads(line)
            except json.JSONDecodeError:
                continue
            pid = v.get("patientid")
            sdt = (v.get("startdatetime") or "")[:10]
            status = v.get("status")
            if not pid or not sdt:
                continue
            if pid not in patient_first_visit or sdt < patient_first_visit[pid][0]:
                patient_first_visit[pid] = (sdt, status)
    print(f"  patients with visits in ndjson: {len(patient_first_visit)}")

    # Build NPF-5 / NPF-6 counts by date
    npf5_by_date: dict[str, int] = defaultdict(int)
    npf6_by_date: dict[str, int] = defaultdict(int)
    for pid, (first_date, first_status) in patient_first_visit.items():
        if first_date[:7] not in set(MONTHS):
            continue
        npf5_by_date[first_date] += 1
        if first_status in (STATUS_SEEN, STATUS_ARRIVED):
            npf6_by_date[first_date] += 1

    # Legacy hook (not used)
    all_new_pids: set = set()

    # 2. NDJSON visit details
    with open(NDJSON_VISITS) as f:
        for line in f:
            try:
                v = json.loads(line)
            except json.JSONDecodeError:
                continue
            add_visit_ndjson(data, v, new_patient_ids=all_new_pids)
            coverage["ndjson_visits"] += 1
            d = (v.get("startdatetime") or "")[:10]
            if d[:7] in data:
                coverage["by_month"][d[:7]]["ndjson"] += 1
    print(f"  ndjson visits processed: {coverage['ndjson_visits']}")

    # NDJSON Seen counts should OVERWRITE XML's SCH-5 where ndjson has better info.
    # Strategy: track how many visits per day ndjson produced, and use that as floor.
    ndjson_total_by_day = {}
    for ym in MONTHS:
        for date, bucket in data[ym].items():
            ndjson_total_by_day[date] = bucket["SCH-5"]

    # 3. XML historical appts — only fill SCH-5 where it's higher than ndjson alone
    xml_appts_by_day = defaultdict(int)
    for xf in XML_FILES:
        if not Path(xf).exists():
            continue
        try:
            tree = ET.parse(xf)
        except ET.ParseError:
            continue
        root = tree.getroot()
        for appt in root.iter("appt"):
            sd = appt.attrib.get("startdate", "")
            if not sd:
                continue
            try:
                m, d, y = sd.split("/")
                date = f"{y}-{m.zfill(2)}-{d.zfill(2)}"
            except ValueError:
                continue
            xml_appts_by_day[date] += 1
            coverage["xml_appts"] += 1
            ym = date[:7]
            if ym in data:
                coverage["by_month"][ym]["xml"] += 1
    print(f"  xml appts processed: {coverage['xml_appts']}")

    # Apply XML totals: if XML has more appts for a given day, raise SCH-5 to that.
    # This prevents double-counting when ndjson and xml overlap (both sources often
    # refer to the same underlying appts).
    for date, xml_count in xml_appts_by_day.items():
        ym = date[:7]
        if ym not in data:
            continue
        if date not in data[ym]:
            data[ym][date] = new_day_bucket()
        ndj = ndjson_total_by_day.get(date, 0)
        # take the max — they overlap, so max is the better estimate of the true scheduled count
        data[ym][date]["SCH-5"] = max(data[ym][date]["SCH-5"], xml_count)

    # 4. tx_detail — per-charge with dos
    if Path(TX_DETAIL).exists():
        with open(TX_DETAIL) as f:
            for line in f:
                try:
                    r = json.loads(line)
                except json.JSONDecodeError:
                    continue
                xml = r.get("xml", "")
                if not xml:
                    continue
                try:
                    root = ET.fromstring(xml)
                except ET.ParseError:
                    continue
                for c in root.iter("charge"):
                    add_charge(data, c)
                    coverage["tx_charges"] += 1
                    dos = c.attrib.get("dos", "")
                    if dos:
                        try:
                            m, d, y = dos.split("/")
                            ym = f"{y}-{m.zfill(2)}"
                            if ym in data:
                                coverage["by_month"][ym]["tx"] += 1
                        except ValueError:
                            pass
    print(f"  tx charges processed: {coverage['tx_charges']}")

    # 5. NPF-5 + NPF-6 from first-visit-ever derivation
    for date, n in npf5_by_date.items():
        ym = date[:7]
        if ym in data:
            if date not in data[ym]:
                data[ym][date] = new_day_bucket()
            data[ym][date]["NPF-5"] = n
    for date, n in npf6_by_date.items():
        ym = date[:7]
        if ym in data:
            if date not in data[ym]:
                data[ym][date] = new_day_bucket()
            data[ym][date]["NPF-6"] = n

    # 6. Compute derived metrics and convert sets to counts
    for ym, days in data.items():
        for date, b in days.items():
            b["REV-7"] = len(b["REV-7"])
            total_sched = b["SCH-5"]
            if total_sched > 0:
                b["SCH-6"] = round(100.0 * b["SCH-4"] / total_sched, 1)
                b["SCH-7"] = round(100.0 * b["SCH-3"] / total_sched, 1)
            else:
                b["SCH-6"] = 0
                b["SCH-7"] = 0
            if b["SCH-1"] > 0 and b["REV-1"] > 0:
                b["REV-8"] = round(b["REV-1"] / b["SCH-1"], 2)
            else:
                b["REV-8"] = 0
            if b["REV-1"] > 0:
                b["REV-9"] = round(100.0 * b["REV-2"] / b["REV-1"], 1)
            else:
                b["REV-9"] = 0

    # 7. Write outputs
    # json can't serialize sets, which we already converted.
    with open(OUT_PATH, "w") as f:
        json.dump(data, f, indent=2, default=str)
    with open(OUT_META, "w") as f:
        json.dump({
            "ndjson_visits_total": coverage["ndjson_visits"],
            "xml_appts_total": coverage["xml_appts"],
            "tx_charges_total": coverage["tx_charges"],
            "by_month": dict(coverage["by_month"]),
            "patients_with_first_visit": len(patient_first_visit),
        }, f, indent=2)
    print(f"  wrote {OUT_PATH}")
    print(f"  wrote {OUT_META}")

    # Print a brief per-month summary for sanity check
    print()
    print(f"  {'Month':<9} {'Days':>5} {'Seen':>6} {'Canc':>6} {'NoSh':>6} {'Sched':>7} {'$Chrg':>10} {'$Paid':>10}")
    for ym in MONTHS:
        days = data[ym]
        seen = sum(b["SCH-1"] for b in days.values())
        canc = sum(b["SCH-3"] for b in days.values())
        ns = sum(b["SCH-4"] for b in days.values())
        sched = sum(b["SCH-5"] for b in days.values())
        chrg = sum(b["REV-1"] for b in days.values())
        paid = sum(b["REV-2"] for b in days.values())
        print(f"  {ym:<9} {len(days):>5} {seen:>6} {canc:>6} {ns:>6} {sched:>7} {chrg:>10.0f} {paid:>10.0f}")


if __name__ == "__main__":
    main()
