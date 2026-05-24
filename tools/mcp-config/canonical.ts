/**
 * Canonical JSON serialization for .mcp.json output.
 *
 * Goal: byte-identical, reproducible output across runs/hosts.
 * Rules:
 *   - Object keys sorted alphabetically at every level.
 *   - 2-space indentation.
 *   - Arrays preserve insertion order (semantic — args order matters).
 *   - Trailing newline.
 *   - Standard JSON.stringify escaping (no extra unicode work needed).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [k: string]: Json };

function sortKeys(value: Json): Json {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value !== null && typeof value === "object") {
    const out: { [k: string]: Json } = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = sortKeys(value[key]);
    }
    return out;
  }
  return value;
}

export function canonicalize(value: Json): string {
  const sorted = sortKeys(value);
  return JSON.stringify(sorted, null, 2) + "\n";
}
