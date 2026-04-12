export const fmtInt = (n: number) =>
  Number.isFinite(n) ? n.toLocaleString("en-US") : "—";

export const fmtPct = (n: number, digits = 1) =>
  Number.isFinite(n) ? `${(n * 100).toFixed(digits)}%` : "—";

export function fmtUsd(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(n);
}

export function fmtCompactUsd(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000)
    return `$${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  return `$${n.toFixed(0)}`;
}

export function formatName(raw: string | null | undefined): string {
  if (!raw) return "—";
  // Provider names in the data often come as "LAST,FIRST" or "LAST, FIRST".
  const parts = raw.replace(/\s+/g, " ").split(",").map((s) => s.trim());
  if (parts.length >= 2) {
    const last = parts[0];
    const first = parts[1] || "";
    return (
      titleCase(first) + (last ? " " + titleCase(last) : "")
    ).trim();
  }
  return titleCase(raw.trim());
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase());
}
