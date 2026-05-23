import type { Snapshot } from "@/lib/types";
import { cn, timeAgo } from "@/lib/format";

interface Props {
  sources: Snapshot["sources"];
}

const ROWS: {
  key: keyof Snapshot["sources"];
  label: string;
}[] = [
  { key: "amd", label: "AdvancedMD" },
  { key: "ringcentral", label: "RingCentral" },
  { key: "microsoft365", label: "M365 Graph" },
];

export function SourceHealthBar({ sources }: Props) {
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {ROWS.map(({ key, label }) => {
        const s = sources[key];
        const ok = !!s?.ok;
        return (
          <div
            key={key}
            className={cn(
              "flex items-center gap-2 px-2 py-1 rounded border",
              ok
                ? "border-emerald-800 bg-emerald-950/40 text-emerald-300"
                : "border-red-900 bg-red-950/40 text-red-300",
            )}
            title={s?.error || ""}
          >
            <span
              className={cn(
                "inline-block w-2 h-2 rounded-full",
                ok ? "bg-emerald-400" : "bg-red-400",
              )}
            />
            <span className="font-medium">{label}</span>
            <span className="text-neutral-400">{timeAgo(s?.fetched_at)}</span>
            {!ok && s?.error && (
              <span className="text-red-300 max-w-[18rem] truncate">
                · {s.error}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
