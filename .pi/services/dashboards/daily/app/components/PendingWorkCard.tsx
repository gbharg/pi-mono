import type { PendingQueueItem } from "@/lib/types";
import { cn } from "@/lib/format";

interface Props {
  pending: PendingQueueItem[];
}

function tone(count: number): string {
  if (count === 0) return "text-emerald-400";
  if (count <= 3) return "text-amber-400";
  return "text-red-400";
}

export function PendingWorkCard({ pending }: Props) {
  if (pending.length === 0) {
    return (
      <div className="card">
        <div className="card-title">Pending Work</div>
        <div className="text-sm text-neutral-500 py-2">
          No pending-work signals reported.
        </div>
      </div>
    );
  }
  return (
    <div className="card">
      <div className="card-title">Pending Work</div>
      <ul className="space-y-2">
        {pending.map((p, i) => (
          <li
            key={i}
            className="flex items-center justify-between border-b border-neutral-800 last:border-0 pb-2 last:pb-0"
          >
            <div>
              <div className="text-sm text-neutral-100">{p.label}</div>
              <div className="text-[11px] text-neutral-500">{p.source}</div>
            </div>
            <div className="text-right">
              <div className={cn("text-2xl font-semibold tabular-nums", tone(p.count))}>
                {p.count}
              </div>
              {p.oldest_age_hours != null && p.count > 0 && (
                <div className="text-[11px] text-neutral-500">
                  oldest {p.oldest_age_hours.toFixed(0)}h
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
