#!/usr/bin/env python3
"""
Build aggregate JSON files for the Exult Healthcare Historical Analytics dashboard.

READ-ONLY access to parquet sources at /Users/agent/pi-mono/.pi/services/cohort_analysis/raw/.
Writes JSON to ./public/data/.

NO PHI: aggregate counts only. No names, no DOB, no chart numbers, no addresses.
"""
from __future__ import annotations

import json
import math
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import duckdb

HERE = Path(__file__).resolve().parent
RAW = Path("/Users/agent/pi-mono/.pi/services/cohort_analysis/raw")
OUT = HERE / "public" / "data"
OUT.mkdir(parents=True, exist_ok=True)

con = duckdb.connect()

# ---- Helpers -----------------------------------------------------------------

def dump(name: str, payload):
    path = OUT / f"{name}.json"
    with path.open("w") as f:
        json.dump(payload, f, indent=2, default=str)
    print(f"  -> wrote {path.relative_to(HERE)} ({path.stat().st_size} bytes)")


def q(sql: str):
    return con.execute(sql).fetchdf()


def p(raw_name: str) -> str:
    return str(RAW / raw_name)


# ---- Build register ----------------------------------------------------------

# Register parquet files as views so we can reuse SQL across steps.
con.execute(f"CREATE VIEW patients AS SELECT * FROM read_parquet('{p('patients.parquet')}')")
con.execute(f"CREATE VIEW visits AS SELECT * FROM read_parquet('{p('visits.parquet')}')")
con.execute(f"CREATE VIEW visits_hist AS SELECT * FROM read_parquet('{p('visits_historical.parquet')}')")
con.execute(f"CREATE VIEW tx_summary AS SELECT * FROM read_parquet('{p('tx_summary.parquet')}')")
con.execute(f"CREATE VIEW charges AS SELECT * FROM read_parquet('{p('tx_detail_charges.parquet')}')")
con.execute(f"CREATE VIEW payments AS SELECT * FROM read_parquet('{p('tx_detail_payments.parquet')}')")
con.execute(f"CREATE VIEW providers_ref AS SELECT * FROM read_parquet('{p('providers.parquet')}')")
con.execute(f"CREATE VIEW facilities_ref AS SELECT * FROM read_parquet('{p('facilities.parquet')}')")

# Combined visits: historical (back to 2025-04) + rich (current).
# Dedupe by visit_id, prefer rich (has richer status info).
con.execute(
    """
    CREATE VIEW visits_all AS
    WITH rich AS (
      SELECT
        visit_id::VARCHAR AS visit_id,
        patient_id::VARCHAR AS patient_id,
        CAST(visit_date AS DATE) AS visit_date,
        provider,
        provider_code,
        facility AS location,
        facility_code,
        appointment_type,
        status::VARCHAR AS status_code,
        CASE status::VARCHAR
          WHEN '0' THEN 'Scheduled'
          WHEN '1' THEN 'Confirmed'
          WHEN '2' THEN 'Cancelled'
          WHEN '3' THEN 'Completed'
          WHEN '10' THEN 'No-Show'
          WHEN '11' THEN 'Cancelled'
          WHEN '12' THEN 'Rescheduled'
          ELSE 'Unknown'
        END AS status_label,
        'rich' AS src
      FROM visits
      WHERE visit_date IS NOT NULL
    ),
    hist AS (
      SELECT
        visit_id::VARCHAR AS visit_id,
        patient_id::VARCHAR AS patient_id,
        CAST(visit_date AS DATE) AS visit_date,
        provider_profile_desc AS provider,
        NULL AS provider_code,
        location,
        NULL AS facility_code,
        appointment_type,
        NULL AS status_code,
        'Historical' AS status_label,
        'hist' AS src
      FROM visits_hist
      WHERE visit_date IS NOT NULL
    ),
    union_all AS (
      SELECT * FROM rich
      UNION ALL
      SELECT * FROM hist WHERE visit_id NOT IN (SELECT visit_id FROM rich)
    )
    SELECT * FROM union_all
    """
)

# Patient-level earliest visit date for cohorts (exclude obvious test records)
TEST_PATIENT_FILTER = """
  patient_id::VARCHAR NOT IN (
    SELECT patient_id::VARCHAR FROM patients
    WHERE lower(coalesce(last_name,'')) IN ('test','testuser','ztest','zztest')
       OR lower(coalesce(first_name,'')) IN ('test','ztest','zztest')
       OR lower(coalesce(first_name,'')) LIKE 'test%'
  )
"""

con.execute(
    f"""
    CREATE VIEW patient_cohort AS
    SELECT
      patient_id,
      MIN(visit_date) AS first_visit_date,
      strftime(MIN(visit_date), '%Y-%m') AS cohort_month
    FROM visits_all
    WHERE visit_date >= DATE '2025-04-01' AND visit_date <= DATE '2026-03-31'
      AND {TEST_PATIENT_FILTER.strip()}
    GROUP BY patient_id
    """
)

# ---- KPIs --------------------------------------------------------------------

print("Building kpis.json ...")
kpi_counts = q(
    """
    SELECT
      (SELECT count(*) FROM patients) AS total_patients,
      (SELECT count(DISTINCT patient_id) FROM visits_all) AS patients_with_visits,
      (SELECT count(*) FROM visits_all) AS total_visits_all,
      (SELECT count(*) FROM visits_all WHERE visit_date <= DATE '2026-04-10') AS total_visits_to_date,
      (SELECT count(*) FROM visits_hist) AS hist_visits,
      (SELECT count(*) FROM visits) AS rich_visits,
      (SELECT count(*) FROM tx_summary) AS tx_summary_patients,
      (SELECT sum(sum_pat_charges + sum_ins_charges) FROM tx_summary) AS gross_charges,
      (SELECT sum(sum_pat_payments + sum_ins_payments) FROM tx_summary) AS total_collected,
      (SELECT sum(sum_pat_writeoffs + sum_ins_writeoffs) FROM tx_summary) AS total_writeoffs,
      (SELECT sum(total_balance) FROM tx_summary) AS outstanding_balance,
      (SELECT count(*) FROM tx_summary
        WHERE (sum_pat_charges + sum_ins_charges) = 0) AS zero_charge_patients,
      (SELECT count(*) FROM tx_summary
        WHERE (sum_pat_charges + sum_ins_charges) > 0) AS billed_patients
    """
).iloc[0]

visit_status = q(
    """
    SELECT status_label, count(*) n
    FROM visits_all
    WHERE visit_date BETWEEN DATE '2025-04-01' AND DATE '2026-04-10'
    GROUP BY 1 ORDER BY n DESC
    """
).to_dict("records")

kpis = {
    "snapshot_date": "2026-04-10",
    "date_range": {"start": "2025-04-01", "end": "2026-03-31"},
    "total_patients": int(kpi_counts["total_patients"]),
    "patients_with_visits": int(kpi_counts["patients_with_visits"]),
    "total_visits": int(kpi_counts["total_visits_all"]),
    "total_visits_to_date": int(kpi_counts["total_visits_to_date"]),
    "rich_visits": int(kpi_counts["rich_visits"]),
    "historical_visits": int(kpi_counts["hist_visits"]),
    "gross_billed": float(kpi_counts["gross_charges"] or 0),
    "total_collected": float(kpi_counts["total_collected"] or 0),
    "total_writeoffs": float(kpi_counts["total_writeoffs"] or 0),
    "outstanding_balance": float(kpi_counts["outstanding_balance"] or 0),
    "net_collection_rate": (
        float(kpi_counts["total_collected"] or 0)
        / float(kpi_counts["gross_charges"] or 1)
    ),
    "billed_patients": int(kpi_counts["billed_patients"]),
    "zero_charge_patients": int(kpi_counts["zero_charge_patients"]),
    "tx_summary_patients": int(kpi_counts["tx_summary_patients"]),
    "visit_status_breakdown": visit_status,
}
dump("kpis", kpis)

# ---- Cohort retention --------------------------------------------------------

print("Building cohort_retention.json ...")
# For each cohort patient, for each of their visits, compute months_since_first.
cohort_matrix = q(
    f"""
    WITH pc AS (
      SELECT * FROM patient_cohort
    ),
    visits_cohort AS (
      SELECT
        pc.cohort_month,
        pc.patient_id,
        v.visit_date,
        date_diff('month', pc.first_visit_date, v.visit_date) AS months_since
      FROM visits_all v
      JOIN pc USING (patient_id)
      WHERE v.visit_date BETWEEN DATE '2025-04-01' AND DATE '2026-04-10'
    )
    SELECT
      cohort_month,
      months_since,
      count(DISTINCT patient_id) AS retained
    FROM visits_cohort
    WHERE months_since >= 0 AND months_since <= 12
    GROUP BY 1,2
    ORDER BY 1,2
    """
).to_dict("records")

cohort_sizes = q(
    """
    SELECT cohort_month, count(*) AS cohort_size
    FROM patient_cohort
    GROUP BY 1 ORDER BY 1
    """
).to_dict("records")

size_map = {r["cohort_month"]: int(r["cohort_size"]) for r in cohort_sizes}
matrix: dict[str, dict[int, int]] = defaultdict(dict)
for row in cohort_matrix:
    matrix[row["cohort_month"]][int(row["months_since"])] = int(row["retained"])

# Also compute: which cohort-month/age cells are feasible given today=2026-04-10.
TODAY = datetime(2026, 4, 10)

def month_diff(start_ym: str) -> int:
    y, m = map(int, start_ym.split("-"))
    start = datetime(y, m, 1)
    return (TODAY.year - start.year) * 12 + (TODAY.month - start.month)

cohort_rows = []
for cm in sorted(size_map.keys()):
    size = size_map[cm]
    if size == 0:
        continue
    max_age = month_diff(cm)
    cells = []
    for age in range(0, 13):
        if age > max_age:
            cells.append({"age": age, "count": None, "pct": None, "status": "future"})
            continue
        n = matrix[cm].get(age, 0)
        cells.append({
            "age": age,
            "count": n,
            "pct": round(n / size, 4) if size else 0,
            "status": "actual",
        })
    cohort_rows.append({"cohort_month": cm, "cohort_size": size, "cells": cells})

dump("cohort_retention", {"cohorts": cohort_rows, "max_age_shown": 12})

# ---- Cohort LTV --------------------------------------------------------------

print("Building cohort_ltv.json ...")
# Join charges (gross) and tx_summary (collected + writeoffs) at the patient level,
# then roll up to cohort month.
# For LTV we use lifetime collected payments -- best proxy for "revenue realised".
ltv = q(
    """
    WITH pc AS (SELECT * FROM patient_cohort),
    pat_totals AS (
      SELECT
        patient_id,
        COALESCE(sum_pat_charges, 0) + COALESCE(sum_ins_charges, 0) AS gross,
        COALESCE(sum_pat_payments, 0) + COALESCE(sum_ins_payments, 0) AS collected
      FROM tx_summary
    ),
    joined AS (
      SELECT
        pc.cohort_month,
        pc.patient_id,
        COALESCE(t.gross, 0) AS gross,
        COALESCE(t.collected, 0) AS collected
      FROM pc LEFT JOIN pat_totals t USING (patient_id)
    )
    SELECT
      cohort_month,
      count(*) AS cohort_size,
      sum(CASE WHEN gross > 0 THEN 1 ELSE 0 END) AS billed_patients,
      round(avg(collected), 2) AS mean_ltv_all,
      round(
        avg(CASE WHEN gross > 0 THEN collected END), 2
      ) AS mean_ltv_billed,
      round(
        quantile_cont(collected, 0.5), 2
      ) AS median_ltv,
      round(
        quantile_cont(CASE WHEN gross > 0 THEN collected END, 0.9), 2
      ) AS p90_ltv_billed,
      round(sum(collected), 2) AS total_collected,
      round(sum(gross), 2) AS total_gross
    FROM joined
    GROUP BY 1
    ORDER BY 1
    """
).to_dict("records")
dump("cohort_ltv", {"rows": ltv})

# ---- Providers ---------------------------------------------------------------

print("Building providers.json ...")
provider_rows = q(
    f"""
    WITH pv AS (
      SELECT
        coalesce(nullif(provider,''), 'Unknown') AS provider,
        coalesce(provider_code,'') AS provider_code,
        patient_id,
        visit_id,
        visit_date,
        status_label
      FROM visits_all
      WHERE visit_date BETWEEN DATE '2025-04-01' AND DATE '2026-04-10'
        AND {TEST_PATIENT_FILTER.strip()}
    ),
    provider_visits AS (
      SELECT
        provider,
        count(*) AS total_visits,
        count(DISTINCT patient_id) AS unique_patients,
        sum(CASE WHEN status_label = 'No-Show' THEN 1 ELSE 0 END) AS noshows,
        sum(CASE WHEN status_label = 'Completed' THEN 1 ELSE 0 END) AS completed
      FROM pv
      GROUP BY 1
    ),
    first_visit AS (
      SELECT
        coalesce(nullif(provider,''), 'Unknown') AS provider,
        patient_id,
        MIN(visit_date) AS first_date_with_provider
      FROM pv
      GROUP BY 1,2
    ),
    new_patients AS (
      SELECT provider, count(*) AS new_patients
      FROM first_visit
      WHERE first_date_with_provider BETWEEN DATE '2025-04-01' AND DATE '2026-03-31'
      GROUP BY 1
    ),
    provider_ltv AS (
      -- patient's primary provider = provider with most visits
      -- assign each patient to their most-frequent provider, then average their LTV
      SELECT
        provider,
        count(*) AS assigned_patients,
        round(avg(collected), 2) AS mean_ltv,
        round(quantile_cont(collected, 0.5), 2) AS median_ltv
      FROM (
        SELECT
          pv.patient_id,
          argmax(pv.provider, cnt) AS provider,
          ts.collected
        FROM (
          SELECT provider, patient_id, count(*) AS cnt
          FROM pv GROUP BY 1,2
        ) pv
        LEFT JOIN (
          SELECT patient_id,
            COALESCE(sum_pat_payments,0) + COALESCE(sum_ins_payments,0) AS collected
          FROM tx_summary
        ) ts USING (patient_id)
        GROUP BY pv.patient_id, ts.collected
      )
      GROUP BY 1
    )
    SELECT
      pv.provider,
      pv.total_visits,
      pv.unique_patients,
      pv.noshows,
      pv.completed,
      coalesce(np.new_patients, 0) AS new_patients,
      pl.assigned_patients,
      coalesce(pl.mean_ltv, 0) AS mean_ltv,
      coalesce(pl.median_ltv, 0) AS median_ltv
    FROM provider_visits pv
    LEFT JOIN new_patients np USING (provider)
    LEFT JOIN provider_ltv pl USING (provider)
    ORDER BY pv.total_visits DESC
    """
).to_dict("records")

dump("providers", {"rows": provider_rows})

# ---- Service line (CPT) ------------------------------------------------------

print("Building services.json ...")
# Categorize CPT codes into buckets
category_sql = """
CASE
  WHEN proc_code IN ('99214','99214T') THEN 'E&M Est 30min'
  WHEN proc_code IN ('99215','99215T') THEN 'E&M Est 40min'
  WHEN proc_code IN ('99213','99213T') THEN 'E&M Est 20min'
  WHEN proc_code IN ('99204','99204T') THEN 'E&M New 45min'
  WHEN proc_code IN ('99205','99205T') THEN 'E&M New 60min'
  WHEN proc_code IN ('90837','90837T') THEN 'Psychotherapy 60min'
  WHEN proc_code IN ('90834','90834T') THEN 'Psychotherapy 45min'
  WHEN proc_code IN ('90833','90833T') THEN 'Add-on Psychotherapy 30min'
  WHEN proc_code IN ('90791','90791T') THEN 'Psych Diagnostic Eval'
  WHEN proc_code IN ('90868','90867') THEN 'TMS Treatment'
  WHEN proc_code IN ('S9480','S9480T') THEN 'Intensive OP'
  WHEN proc_code IN ('UDS') THEN 'Urine Drug Screen'
  WHEN proc_code LIKE '$CNS%' THEN 'No-Show Fee'
  ELSE 'Other'
END AS category
"""

services = q(
    f"""
    WITH c AS (
      SELECT *, {category_sql} FROM charges WHERE coalesce(void, '') NOT IN ('1','true','True','YES','yes')
    )
    SELECT
      category,
      count(*) AS charge_count,
      count(DISTINCT patient_id) AS unique_patients,
      round(sum(fee), 2) AS gross,
      round(sum(paid), 2) AS collected,
      round(avg(fee), 2) AS avg_fee,
      round(
        CASE WHEN sum(fee) > 0 THEN sum(paid) / sum(fee) ELSE 0 END, 4
      ) AS net_collection_rate
    FROM c
    GROUP BY 1
    ORDER BY gross DESC
    """
).to_dict("records")

top_codes = q(
    f"""
    SELECT proc_code,
           MAX(description) AS description,
           count(*) AS charge_count,
           count(DISTINCT patient_id) AS unique_patients,
           round(sum(fee), 2) AS gross,
           round(sum(paid), 2) AS collected
    FROM charges
    WHERE coalesce(void, '') NOT IN ('1','true','True','YES','yes')
    GROUP BY 1
    ORDER BY gross DESC
    LIMIT 15
    """
).to_dict("records")

dump("services", {"categories": services, "top_codes": top_codes})

# ---- Locations ---------------------------------------------------------------

print("Building locations.json ...")
loc_visits = q(
    """
    SELECT
      location,
      count(*) AS visits,
      count(DISTINCT patient_id) AS unique_patients,
      sum(CASE WHEN status_label = 'Completed' THEN 1 ELSE 0 END) AS completed,
      sum(CASE WHEN status_label = 'No-Show' THEN 1 ELSE 0 END) AS noshows,
      sum(CASE WHEN status_label = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled
    FROM visits_all
    WHERE visit_date BETWEEN DATE '2025-04-01' AND DATE '2026-04-10'
      AND location IS NOT NULL
    GROUP BY 1
    ORDER BY visits DESC
    """
).to_dict("records")

loc_revenue = q(
    """
    SELECT fac_name AS location,
           round(sum(fee), 2) AS gross,
           round(sum(paid), 2) AS collected,
           count(*) AS charges
    FROM charges
    WHERE coalesce(void, '') NOT IN ('1','true','True','YES','yes') AND fac_name IS NOT NULL
    GROUP BY 1
    ORDER BY gross DESC
    """
).to_dict("records")

# merge revenue into visit rows by matching location substrings
rev_map = {r["location"]: r for r in loc_revenue}
for row in loc_visits:
    match = rev_map.get(row["location"]) or rev_map.get(row["location"].split(",")[0])
    row["gross"] = float(match["gross"]) if match else 0
    row["collected"] = float(match["collected"]) if match else 0

dump("locations", {"rows": loc_visits})

# ---- Revenue waterfall -------------------------------------------------------

print("Building revenue_waterfall.json ...")
wf = q(
    """
    SELECT
      round(sum(sum_pat_charges + sum_ins_charges), 2) AS gross_billed,
      round(sum(sum_pat_writeoffs + sum_ins_writeoffs), 2) AS writeoffs,
      round(sum(sum_pat_payments + sum_ins_payments), 2) AS collected,
      round(sum(total_balance), 2) AS outstanding
    FROM tx_summary
    """
).iloc[0]
dump(
    "revenue_waterfall",
    {
        "gross_billed": float(wf["gross_billed"] or 0),
        "writeoffs": float(wf["writeoffs"] or 0),
        "outstanding": float(wf["outstanding"] or 0),
        "collected": float(wf["collected"] or 0),
    },
)

# ---- Data quality ------------------------------------------------------------

print("Building data_quality.json ...")
dq = q(
    f"""
    SELECT
      (SELECT count(*) FROM patients) AS total_patients,
      (SELECT count(*) FROM patients WHERE patient_id::VARCHAR NOT IN (SELECT DISTINCT patient_id::VARCHAR FROM visits_all)) AS patients_no_visits,
      (SELECT count(*) FROM patients WHERE patient_id::VARCHAR NOT IN (SELECT patient_id::VARCHAR FROM tx_summary)) AS patients_missing_tx_summary,
      (SELECT count(*) FROM tx_summary WHERE (sum_pat_charges + sum_ins_charges) = 0) AS zero_charge_shells,
      (SELECT count(*) FROM patients
        WHERE lower(coalesce(last_name,'')) IN ('test','testuser','ztest','zztest')
           OR lower(coalesce(first_name,'')) LIKE 'test%') AS test_patients,
      (SELECT count(DISTINCT visit_id) FROM visits_hist) AS hist_visits,
      (SELECT count(DISTINCT visit_id) FROM visits) AS rich_visits,
      (SELECT count(*) FROM visits_hist WHERE visit_id::VARCHAR IN (SELECT visit_id::VARCHAR FROM visits)) AS overlap_visits
    """
).iloc[0]

notes = [
    {
        "metric": "Patients without recent visits",
        "count": int(dq["patients_no_visits"]),
        "note": "Of 1,952 total patients, these have no scheduled or historical visit. Likely historical / inactive / intake-failures.",
    },
    {
        "metric": "Patients missing tx_summary",
        "count": int(dq["patients_missing_tx_summary"]),
        "note": "tx_summary was pulled only for patients that had visits or charges. Gap between patient roster and financial ledger.",
    },
    {
        "metric": "Shell accounts (zero lifetime charges)",
        "count": int(dq["zero_charge_shells"]),
        "note": "Patients with a chart in AMD but no billed charges ever. Primary cleanup target.",
    },
    {
        "metric": "Test / seed patient records",
        "count": int(dq["test_patients"]),
        "note": "Records with names like TEST, ZTEST, etc. Excluded from cohort + provider analytics.",
    },
    {
        "metric": "Historical visits (XML backfill)",
        "count": int(dq["hist_visits"]),
        "note": "From 2025-04 onwards. Lacks no-show status -- historical cancel/noshow is unresolved.",
    },
    {
        "metric": "Rich visits (REST pull)",
        "count": int(dq["rich_visits"]),
        "note": "Full detail including status, carrier, provider code, telemedicine flag. Covers 2025-05 onwards.",
    },
    {
        "metric": "Visit IDs in BOTH sources",
        "count": int(dq["overlap_visits"]),
        "note": "Deduplicated in the combined view -- rich data takes precedence.",
    },
]
dump("data_quality", {"notes": notes})

# ---- Meta --------------------------------------------------------------------

print("Building meta.json ...")
meta = {
    "generated_at": datetime.now(timezone.utc).isoformat(),
    "snapshot_date": "2026-04-10",
    "office": "Exult Healthcare (McKinney, TX) -- office 161112",
    "source_dir": str(RAW),
    "source_files": sorted(p.name for p in RAW.glob("*.parquet")),
    "notes": [
        "READ-ONLY snapshot. No live API calls.",
        "PHI REDACTED: aggregate counts only. No patient names, DOB, chart numbers, or addresses.",
        "Combined visit universe: historical XML backfill (2025-04 to 2026-03) + REST rich pull (2025-05 onwards). Deduplicated by visit_id; REST data wins on overlaps.",
        "Cohort definition: first visit date within 2025-04-01 .. 2026-03-31, test-seed patients excluded.",
        "LTV uses lifetime collected payments per patient (tx_summary sum_pat_payments + sum_ins_payments).",
        "Service-line rollup excludes voided charges. Includes no-show fee codes ($CNS*).",
    ],
}
dump("meta", meta)

print("Done.")
