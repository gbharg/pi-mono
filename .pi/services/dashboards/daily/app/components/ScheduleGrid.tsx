"use client";
import type { DayVisits, VisitRow } from "@/lib/types";
import { cn, statusColor, statusLabel } from "@/lib/format";

interface Props {
  day: DayVisits;
  title: string;
}

// Groups visits by provider, sorts by start_hm.
export function ScheduleGrid({ day, title }: Props) {
  const byProvider = new Map<string, VisitRow[]>();
  for (const row of day.rows) {
    if (!byProvider.has(row.provider)) byProvider.set(row.provider, []);
    byProvider.get(row.provider)!.push(row);
  }
  for (const rows of byProvider.values()) {
    rows.sort((a, b) => a.start_hm.localeCompare(b.start_hm));
  }
  const providers = Array.from(byProvider.keys()).sort();

  const counts = {
    total: day.total,
    seen: day.by_status["Seen"] || 0,
    arrived: day.by_status["Arrived"] || 0,
    cancelled: day.by_status["Cancelled"] || 0,
    noshow: day.by_status["NoShow"] || 0,
    deleted: day.by_status["Deleted"] || 0,
    new_patients: day.new_patients,
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <div className="card-title mb-0">{title}</div>
          <div className="text-neutral-100 text-sm mt-1">{day.date}</div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge label="Total" value={counts.total} tone="default" />
          <Badge label="Seen" value={counts.seen} tone="good" />
          <Badge label="Arr" value={counts.arrived} tone="info" />
          <Badge label="Cxl" value={counts.cancelled} tone="warn" />
          <Badge label="NS" value={counts.noshow} tone="bad" />
          <Badge label="New" value={counts.new_patients} tone="info" />
        </div>
      </div>
      {providers.length === 0 ? (
        <div className="text-neutral-500 text-sm py-6 text-center">
          No visits recorded for this day.
        </div>
      ) : (
        <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
          {providers.map((p) => {
            const rows = byProvider.get(p)!;
            return (
              <div key={p} className="border-t border-neutral-800 pt-2">
                <div className="text-xs text-neutral-400 font-medium mb-1">
                  {p}{" "}
                  <span className="text-neutral-600">· {rows.length}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {rows.map((r) => (
                    <div
                      key={r.visit_id}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-1.5 py-1 rounded text-[11px] font-mono",
                        statusColor(r.status),
                      )}
                      title={`${r.start_time_local} ${r.patient_initials} ${r.appt_type} · ${statusLabel(r.status)}`}
                    >
                      <span>{r.start_time_local.trim()}</span>
                      <span className="opacity-80">{r.patient_initials}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Badge({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "good" | "bad" | "warn" | "info";
}) {
  const cls = {
    default: "bg-neutral-800 text-neutral-200",
    good: "bg-emerald-900/60 text-emerald-300",
    bad: "bg-red-900/60 text-red-300",
    warn: "bg-orange-900/60 text-orange-300",
    info: "bg-blue-900/60 text-blue-300",
  }[tone];
  return (
    <span className={cn("px-2 py-0.5 rounded tabular-nums", cls)}>
      {label} {value}
    </span>
  );
}
