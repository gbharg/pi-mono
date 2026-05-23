import type { VoicemailBlock } from "@/lib/types";
import { cn } from "@/lib/format";

interface Props {
  vm: VoicemailBlock;
}

export function VoicemailCard({ vm }: Props) {
  const disabled = vm.status !== "live";
  return (
    <div className="card">
      <div className="flex items-baseline justify-between">
        <div className="card-title">Recent voicemails</div>
        {disabled && (
          <span className="text-[10px] uppercase tracking-wider text-amber-400 border border-amber-700/60 rounded px-1.5 py-0.5">
            {vm.status === "transcripts_unavailable" ? "transcripts off" : "error"}
          </span>
        )}
      </div>
      {vm.note && (
        <div className="text-[11px] text-neutral-500 mt-1 italic">{vm.note}</div>
      )}
      {vm.entries.length === 0 ? (
        <div className="text-sm text-neutral-500 py-4 text-center">
          No voicemails yet.
        </div>
      ) : (
        <ul className="mt-2 space-y-2 max-h-56 overflow-y-auto">
          {vm.entries.map((e) => (
            <li
              key={e.id}
              className={cn(
                "text-xs border-b border-neutral-800 last:border-0 pb-2 last:pb-0",
              )}
            >
              <div className="flex justify-between font-mono">
                <span>{e.masked_from}</span>
                <span className="text-neutral-500">
                  {Math.round(e.duration_sec)}s ·{" "}
                  {new Date(e.at).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "America/Chicago",
                  })}
                </span>
              </div>
              {e.transcript_summary ? (
                <div className="text-neutral-300 mt-0.5">{e.transcript_summary}</div>
              ) : (
                <div className="text-neutral-500 italic mt-0.5">
                  transcript unavailable
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
