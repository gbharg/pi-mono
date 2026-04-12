import { cn } from "@/lib/format";

interface Props {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "good" | "warn" | "bad" | "muted";
}

export function KpiCard({ label, value, sub, tone = "default" }: Props) {
  const toneCls = {
    default: "text-neutral-100",
    good: "text-emerald-400",
    warn: "text-amber-400",
    bad: "text-red-400",
    muted: "text-neutral-500",
  }[tone];
  return (
    <div className="card">
      <div className="card-title">{label}</div>
      <div className={cn("kpi-value", toneCls)}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}
