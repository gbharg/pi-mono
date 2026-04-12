import type { Revenue } from "@/lib/types";
import { usd } from "@/lib/format";

interface Props {
  revenue: Revenue;
}

export function RevenueCard({ revenue }: Props) {
  const blocked = revenue.status === "blocked";
  return (
    <div className="card">
      <div className="flex items-baseline justify-between">
        <div className="card-title">Revenue pulse</div>
        {blocked && (
          <span className="text-[10px] uppercase tracking-wider text-amber-400 border border-amber-700/60 rounded px-1.5 py-0.5">
            blocked
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3 mt-2">
        <Stat label="Today" value={usd(revenue.today_collected_usd)} />
        <Stat label="MTD" value={usd(revenue.mtd_collected_usd)} />
        <Stat label="Last mo MTD" value={usd(revenue.last_month_mtd_collected_usd)} />
      </div>
      {revenue.collections_rate_pct != null && (
        <div className="text-xs text-neutral-400 mt-2">
          Collections rate MTD: {revenue.collections_rate_pct.toFixed(1)}%
        </div>
      )}
      {revenue.note && (
        <div className="text-[11px] text-neutral-500 mt-2 italic">
          {revenue.note}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="text-lg font-semibold tabular-nums text-neutral-100 mt-0.5">
        {value}
      </div>
    </div>
  );
}
