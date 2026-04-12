// Daily Ops Dashboard — shared types between refresher (Python) and the Next.js app.
// The refresher POSTs a `Snapshot` to /api/ingest; the UI polls /api/snapshot.
//
// PHI rule: counts + masked identifiers only. NEVER full name, DOB, chart#.

export type IsoString = string; // e.g. "2026-04-11T06:00:00Z"

export interface SourceHealth {
  ok: boolean;
  error?: string | null;
  fetched_at?: IsoString | null;
  latency_ms?: number | null;
}

// One visit row for the provider/time grid.
// Status codes (AMD): 0=Made 1=Arrived 2=Other 3=Seen 5=Moved 10=Cancelled 11=Deleted 12=NoShow
export type VisitStatusCode = 0 | 1 | 2 | 3 | 5 | 10 | 11 | 12;

export interface VisitRow {
  visit_id: string;               // AMD appt id (ok to show — not PHI)
  start_time_local: string;       // "7:00PM"
  start_hm: string;               // "19:00" (24h for sort/plot)
  provider: string;               // "TODD, JERRITT"
  appt_type: string;              // "TH-THERAPY INDIVIDUAL"
  location: string;               // "EXULT HEALTHCARE" | "MDPA"
  status: VisitStatusCode;
  status_label: "Made" | "Arrived" | "Other" | "Seen" | "Moved" | "Cancelled" | "Deleted" | "NoShow";
  patient_initials: string;       // "H.E."
  patient_chart_last4: string;    // last 4 of AMD patient id
  is_new_patient: boolean;        // inferred from appt_type contains NEW
}

export interface DayVisits {
  date: string;                   // "2026-04-11"
  total: number;
  by_status: Record<string, number>;  // { Made: 3, Seen: 9, ... }
  by_provider: Record<string, number>;
  by_location: Record<string, number>;
  new_patients: number;
  rows: VisitRow[];
}

export interface CallBucket {
  bucket_start: IsoString;        // ISO of 15-min bucket start
  inbound: number;
  outbound: number;
  missed: number;
}

export interface MissedCall {
  masked_number: string;          // "***-***-1837"
  at: IsoString;
  duration_sec: number;
}

export interface PhoneActivity {
  today_total: number;
  today_inbound: number;
  today_outbound: number;
  today_missed: number;
  yesterday_total: number;
  yesterday_missed: number;
  last4h_buckets: CallBucket[];   // 15-min buckets for last 4 hours
  recent_missed: MissedCall[];    // up to 10
}

export interface FunnelDay {
  date: string;                   // "2026-04-11"
  inquiries: number;              // emails to request@ / inbound calls of type "new"
  booked: number;                 // new-patient visit booked for that day
  arrived: number;                // appts with status Arrived/Seen
  first_charge: number;           // UNKNOWN without billing access; set 0 until unblocked
}

export interface NewPatientFunnel {
  today: FunnelDay;
  last_30d: FunnelDay[];
  conversion_inquiry_to_booked_pct: number | null;
}

export interface PendingQueueItem {
  label: string;                  // e.g. "Rx requests >24h"
  count: number;
  oldest_age_hours: number | null;
  source: string;                 // which mailbox / tag
}

export interface Revenue {
  today_collected_usd: number | null;    // null when AMD billing blocked
  mtd_collected_usd: number | null;
  last_month_mtd_collected_usd: number | null;
  collections_rate_pct: number | null;
  status: "live" | "blocked" | "inferred";
  note?: string;
}

export interface VoicemailEntry {
  id: string;
  masked_from: string;
  at: IsoString;
  duration_sec: number;
  transcript_available: boolean;
  transcript_summary?: string | null;
}

export interface VoicemailBlock {
  status: "live" | "transcripts_unavailable" | "error";
  note?: string;
  entries: VoicemailEntry[];
}

export interface Snapshot {
  generated_at: IsoString;
  schema_version: 1;
  timezone: string;               // "America/Chicago"
  today_date: string;             // "2026-04-11"
  yesterday_date: string;         // "2026-04-10"

  hero: {
    visits_seen_today: number;
    visits_scheduled_today: number;
    collections_today_usd: number | null;
    collections_mtd_usd: number | null;
    new_patients_today: number;
    missed_calls_today: number;
  };

  today: DayVisits;
  yesterday: DayVisits;

  phone: PhoneActivity;

  funnel: NewPatientFunnel;

  pending: PendingQueueItem[];

  revenue: Revenue;

  voicemails: VoicemailBlock;

  sources: {
    amd: SourceHealth;
    ringcentral: SourceHealth;
    microsoft365: SourceHealth;
  };
}

export function emptySnapshot(today: string, yesterday: string): Snapshot {
  const blank: DayVisits = {
    date: today,
    total: 0,
    by_status: {},
    by_provider: {},
    by_location: {},
    new_patients: 0,
    rows: [],
  };
  return {
    generated_at: new Date().toISOString(),
    schema_version: 1,
    timezone: "America/Chicago",
    today_date: today,
    yesterday_date: yesterday,
    hero: {
      visits_seen_today: 0,
      visits_scheduled_today: 0,
      collections_today_usd: null,
      collections_mtd_usd: null,
      new_patients_today: 0,
      missed_calls_today: 0,
    },
    today: { ...blank, date: today },
    yesterday: { ...blank, date: yesterday },
    phone: {
      today_total: 0,
      today_inbound: 0,
      today_outbound: 0,
      today_missed: 0,
      yesterday_total: 0,
      yesterday_missed: 0,
      last4h_buckets: [],
      recent_missed: [],
    },
    funnel: {
      today: { date: today, inquiries: 0, booked: 0, arrived: 0, first_charge: 0 },
      last_30d: [],
      conversion_inquiry_to_booked_pct: null,
    },
    pending: [],
    revenue: {
      today_collected_usd: null,
      mtd_collected_usd: null,
      last_month_mtd_collected_usd: null,
      collections_rate_pct: null,
      status: "blocked",
      note: "AMD billing API not yet unblocked.",
    },
    voicemails: {
      status: "transcripts_unavailable",
      note: "RC transcripts pending scope grant.",
      entries: [],
    },
    sources: {
      amd: { ok: false, error: "no data yet" },
      ringcentral: { ok: false, error: "no data yet" },
      microsoft365: { ok: false, error: "no data yet" },
    },
  };
}
