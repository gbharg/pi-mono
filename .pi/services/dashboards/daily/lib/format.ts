import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...xs: ClassValue[]) {
  return twMerge(clsx(xs));
}

export function usd(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function intf(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US");
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (!isFinite(then)) return "never";
  const diff = Math.max(0, Date.now() - then);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function statusColor(code: number): string {
  // Tailwind class fragments for the status bar / badge
  switch (code) {
    case 0: return "bg-neutral-500 text-neutral-50";         // Made
    case 1: return "bg-blue-500 text-white";                 // Arrived
    case 2: return "bg-amber-500 text-white";                // Other
    case 3: return "bg-emerald-600 text-white";              // Seen
    case 5: return "bg-purple-500 text-white";               // Moved
    case 10: return "bg-orange-600 text-white";              // Cancelled
    case 11: return "bg-neutral-700 text-neutral-200 line-through"; // Deleted
    case 12: return "bg-red-600 text-white";                 // NoShow
    default: return "bg-neutral-600 text-neutral-100";
  }
}

export function statusLabel(code: number): string {
  switch (code) {
    case 0: return "Made";
    case 1: return "Arrived";
    case 2: return "Other";
    case 3: return "Seen";
    case 5: return "Moved";
    case 10: return "Cancelled";
    case 11: return "Deleted";
    case 12: return "NoShow";
    default: return `?${code}`;
  }
}
