# Data Schema Reference

## Cohort Analysis (Parquet Files)

Location: `~/claude-workspace/data/cohort_analysis/`

### visits.parquet

| Field            | Type     | Description                              |
|------------------|----------|------------------------------------------|
| visit_id         | string   | AMD visit identifier                     |
| patient_id       | string   | AMD patient ID                           |
| visit_date       | date     | Date of service                          |
| provider         | string   | Rendering provider name                  |
| visit_type       | string   | New Patient, Follow-Up, TMS, etc.        |
| status           | string   | Completed, No-Show, Cancelled, Scheduled |
| charge_amount    | float    | Total charges for the visit              |
| payment_amount   | float    | Payment collected                        |
| insurance_payer  | string   | Insurance company or "Self-Pay"          |
| cpt_codes        | list     | List of CPT codes billed                 |

### patients.parquet

| Field            | Type     | Description                              |
|------------------|----------|------------------------------------------|
| patient_id       | string   | AMD patient ID                           |
| first_name       | string   | Patient first name                       |
| last_name        | string   | Patient last name                        |
| dob              | date     | Date of birth                            |
| insurance_type   | string   | Primary insurance or "Self-Pay"          |
| first_visit      | date     | Date of first visit                      |
| last_visit       | date     | Date of most recent visit                |
| total_visits     | int      | Lifetime visit count                     |
| balance          | float    | Outstanding balance                      |

## Daily Tracker (JSON)

Location: `~/claude-workspace/data/daily_tracker/`

Files named `YYYY-MM-DD.json`. Each file contains a single JSON object with the day's operational metrics. See the parent SKILL.md for the schema.

## Reports Output

Location: `~/claude-workspace/reports/`

Generated reports are stored here in xlsx or pdf format. Naming convention: `{report-type}_{date-range}_{generated-date}.xlsx`
