interface KpiTileProps {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}

export function KpiTile({ label, value, sub, accent }: KpiTileProps) {
  return (
    <div className="kpi-tile">
      <div className="section-heading">{label}</div>
      <div
        className="mt-2 text-3xl font-semibold tracking-tight text-slate-50"
        style={{ color: accent }}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}
