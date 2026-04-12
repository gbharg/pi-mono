"use client";

import type { Locations } from "@/lib/data";
import { fmtInt, fmtPct, fmtUsd } from "@/lib/format";

interface Props {
  data: Locations;
}

export function LocationCompare({ data }: Props) {
  const rows = data.rows;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {rows.map((r, i) => {
        const total = r.completed + r.noshows + r.cancelled;
        const ns = total ? r.noshows / total : 0;
        const cx = total ? r.cancelled / total : 0;
        const cp = total ? r.completed / total : 0;
        return (
          <div
            key={r.location}
            className="card p-5"
            style={{
              background:
                i === 0
                  ? "linear-gradient(180deg, rgba(56,189,248,0.08), rgba(15,23,42,1))"
                  : "linear-gradient(180deg, rgba(167,139,250,0.08), rgba(15,23,42,1))",
            }}
          >
            <div className="flex items-baseline justify-between">
              <div>
                <div className="section-heading">Location</div>
                <div className="text-xl font-semibold text-slate-50">
                  {r.location}
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-500">
                {i === 0 ? "Primary (McKinney, TX)" : "Satellite (Sherman, TX)"}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Stat label="Visits" value={fmtInt(r.visits)} />
              <Stat label="Unique patients" value={fmtInt(r.unique_patients)} />
              <Stat label="Gross billed" value={fmtUsd(r.gross)} />
              <Stat label="Collected" value={fmtUsd(r.collected)} />
            </div>
            <div className="mt-4">
              <div className="mb-1 text-[11px] text-slate-500">
                Visit outcomes
              </div>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  style={{ width: `${cp * 100}%` }}
                  className="bg-emerald-400"
                  title={`Completed ${fmtPct(cp)}`}
                />
                <div
                  style={{ width: `${cx * 100}%` }}
                  className="bg-amber-400"
                  title={`Cancelled ${fmtPct(cx)}`}
                />
                <div
                  style={{ width: `${ns * 100}%` }}
                  className="bg-rose-500"
                  title={`No-show ${fmtPct(ns)}`}
                />
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-slate-400">
                <span className="text-emerald-300">
                  {fmtPct(cp)} completed
                </span>
                <span className="text-amber-300">
                  {fmtPct(cx)} cancelled
                </span>
                <span className="text-rose-300">
                  {fmtPct(ns)} no-show
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="text-base font-semibold text-slate-100">{value}</div>
    </div>
  );
}
