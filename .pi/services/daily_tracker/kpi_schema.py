"""KPI row definitions for the Daily Operations Tracker.

Each row: (kpi_id, label, category, source)
"""

KPI_ROWS = [
    # Scheduling / Visits (AMD)
    ("SCH-1",  "Completed visits (status=3 Seen)",   "Scheduling", "AMD"),
    ("SCH-2",  "Arrived visits (status=1)",          "Scheduling", "AMD"),
    ("SCH-3",  "Cancelled (status=10)",              "Scheduling", "AMD"),
    ("SCH-4",  "No-shows (status=12)",               "Scheduling", "AMD"),
    ("SCH-5",  "Total scheduled",                    "Scheduling", "AMD"),
    ("SCH-6",  "No-show rate %",                     "Scheduling", "AMD"),
    ("SCH-7",  "Cancellation rate %",                "Scheduling", "AMD"),
    ("SCH-8",  "Same-day cancels",                   "Scheduling", "AMD"),
    ("SCH-9",  "Telehealth visits",                  "Scheduling", "AMD"),
    ("SCH-10", "In-person visits",                   "Scheduling", "AMD"),

    # Revenue (AMD)
    ("REV-1",  "Total charges posted ($)",           "Revenue", "AMD"),
    ("REV-2",  "Total payments collected ($)",       "Revenue", "AMD"),
    ("REV-3",  "Insurance payments ($)",             "Revenue", "AMD"),
    ("REV-4",  "Patient payments ($)",               "Revenue", "AMD"),
    ("REV-5",  "Copays collected ($)",               "Revenue", "AMD"),
    ("REV-6",  "Write-offs ($)",                     "Revenue", "AMD"),
    ("REV-7",  "Distinct patients billed",           "Revenue", "AMD"),
    ("REV-8",  "Average charge per visit ($)",       "Revenue", "AMD"),
    ("REV-9",  "Collection rate %",                  "Revenue", "AMD"),

    # New Patient Funnel (RC + AMD + M365)
    ("NPF-1",  "Inbound calls to main number",                      "New Patients", "RC"),
    ("NPF-2",  "New-patient inquiries (keypad 1 -> Shaye ext 201)", "New Patients", "RC"),
    ("NPF-3",  "Fax referrals received (request@ inbox)",           "New Patients", "M365"),
    ("NPF-4",  "Web form leads (shaye@ inbox)",                     "New Patients", "M365"),
    ("NPF-5",  "New patient charts created (AMD)",                  "New Patients", "AMD"),
    ("NPF-6",  "First-visit arrivals (new patient seen)",           "New Patients", "AMD"),
    ("NPF-7",  "Inquiry->booking conversion %",                     "New Patients", "AMD"),

    # Phone (RC)
    ("PHN-1",  "Total inbound calls",                     "Phone", "RC"),
    ("PHN-2",  "Answered calls",                          "Phone", "RC"),
    ("PHN-3",  "Missed calls",                            "Phone", "RC"),
    ("PHN-4",  "Voicemails left",                         "Phone", "RC"),
    ("PHN-5",  "Avg answer time (sec)",                   "Phone", "RC"),
    ("PHN-6",  "Outbound calls",                          "Phone", "RC"),
    ("PHN-7",  "Call queue 55 (Front Office) volume",     "Phone", "RC"),
    ("PHN-8",  "Longest hold (sec)",                      "Phone", "RC"),

    # Referrals / Rx / Records
    ("RX-1",   "Rx requests (prescriptions@ inbox)",      "Rx", "M365"),
    ("REC-1",  "Medical record requests (request@ inbox)","Records", "M365"),
    ("REF-1",  "Inbound referrals (fax/email)",           "Referrals", "M365"),

    # Call Intelligence
    ("CI-1",   "VM transcripts analyzed",                 "Calls", "RC"),
    ("CI-2",   "Complaints flagged",                      "Calls", "RC"),
    ("CI-3",   "Urgent keywords (ER, suicide, crisis)",   "Calls", "RC"),
]


MONTHS = [
    "2025-05", "2025-06", "2025-07", "2025-08",
    "2025-09", "2025-10", "2025-11", "2025-12",
    "2026-01", "2026-02", "2026-03", "2026-04",
]

WORKBOOK_PATH = "/Exult/Analytics/Daily_Operations_Tracker_2026.xlsx"
WORKBOOK_USER = "gautam@exulthealthcare.com"
