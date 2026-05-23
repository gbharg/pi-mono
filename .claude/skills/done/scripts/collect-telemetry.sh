#!/usr/bin/env bash
# collect-telemetry.sh — Extract token usage telemetry from Claude Code session transcripts
#
# Usage:
#   collect-telemetry.sh [--transcript <path>] [--agent <agent-id>]
#
# Outputs JSON to stdout. All diagnostic messages go to stderr.

set -euo pipefail

TRANSCRIPT=""
AGENT=""
TRANSCRIPT_DIR="$HOME/.claude/projects/-Users-Work"

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --transcript)
      TRANSCRIPT="${2:-}"
      shift 2
      ;;
    --agent)
      AGENT="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown option: $1" >&2
      echo "Usage: collect-telemetry.sh [--transcript <path>] [--agent <agent-id>]" >&2
      exit 1
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Discover transcript
# ---------------------------------------------------------------------------
if [[ -z "$TRANSCRIPT" ]]; then
  if [[ -d "$TRANSCRIPT_DIR" ]]; then
    # Find most recent .jsonl by modification time
    TRANSCRIPT=$(find "$TRANSCRIPT_DIR" -maxdepth 1 -name '*.jsonl' -type f -print0 \
      | xargs -0 ls -t 2>/dev/null | head -1 || true)
  fi
fi

# ---------------------------------------------------------------------------
# Output zeroed/estimated if no transcript available
# ---------------------------------------------------------------------------
output_empty() {
  cat <<'EMPTY'
{
  "input_tokens": 0,
  "output_tokens": 0,
  "cache_read_tokens": 0,
  "cache_write_tokens": 0,
  "total_tokens": 0,
  "estimated_cost_usd": 0,
  "message_count": 0,
  "tool_call_count": 0,
  "models": [],
  "duration_minutes": 0,
  "estimated": true
}
EMPTY
}

if [[ -z "$TRANSCRIPT" || ! -f "$TRANSCRIPT" ]]; then
  echo "No transcript found; outputting zeroed values." >&2
  output_empty
  exit 0
fi

echo "Reading transcript: $TRANSCRIPT" >&2

# ---------------------------------------------------------------------------
# Check for jq availability
# ---------------------------------------------------------------------------
HAS_JQ=false
if command -v jq &>/dev/null; then
  HAS_JQ=true
fi

# ---------------------------------------------------------------------------
# Parse transcript with Python (always available on macOS, handles JSONL well)
# Falls back cleanly; jq is used for final formatting if available.
# ---------------------------------------------------------------------------
TELEMETRY_JSON=$(python3 - "$TRANSCRIPT" "$AGENT" <<'PYEOF'
import json
import sys
from datetime import datetime

transcript_path = sys.argv[1]
agent_id = sys.argv[2] if len(sys.argv) > 2 else ""

input_tokens = 0
output_tokens = 0
cache_read_tokens = 0
cache_write_tokens = 0
message_count = 0
tool_call_count = 0
models = set()
first_ts = None
last_ts = None

def parse_iso(ts_str):
    """Parse ISO 8601 timestamp, handling Z suffix and fractional seconds."""
    if not ts_str:
        return None
    ts_str = ts_str.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(ts_str)
    except (ValueError, TypeError):
        return None

with open(transcript_path, "r") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue

        obj_type = obj.get("type", "")

        # Track timestamps from all lines that have them
        ts = parse_iso(obj.get("timestamp", "") or obj.get("createdAt", ""))
        if ts is not None:
            if first_ts is None or ts < first_ts:
                first_ts = ts
            if last_ts is None or ts > last_ts:
                last_ts = ts

        # Count user + assistant messages
        if obj_type in ("user", "assistant"):
            message_count += 1

        # Process assistant messages for usage + tool calls
        if obj_type == "assistant":
            msg = obj.get("message", {})
            if not isinstance(msg, dict):
                continue

            # Model (skip synthetic/internal model markers)
            model = msg.get("model", "")
            if model and not model.startswith("<"):
                models.add(model)

            # Usage
            usage = msg.get("usage", {})
            if isinstance(usage, dict):
                input_tokens += usage.get("input_tokens", 0)
                output_tokens += usage.get("output_tokens", 0)
                cache_read_tokens += usage.get("cache_read_input_tokens", 0)
                cache_write_tokens += usage.get("cache_creation_input_tokens", 0)

            # Tool calls in content
            content = msg.get("content", [])
            if isinstance(content, list):
                for item in content:
                    if isinstance(item, dict) and item.get("type") == "tool_use":
                        tool_call_count += 1

# Duration
duration_minutes = 0
if first_ts and last_ts:
    delta = last_ts - first_ts
    duration_minutes = round(delta.total_seconds() / 60)

# Total tokens
total_tokens = input_tokens + output_tokens + cache_read_tokens + cache_write_tokens

# Pricing: (input, output, cache_read, cache_write) per 1M tokens
PRICING = {
    "claude-opus-4-6":   (15.0,  75.0, 1.875,  18.75),
    "claude-sonnet-4-6": (3.0,   15.0, 0.375,  3.75),
    "claude-haiku-4-5":  (0.80,  4.0,  0.08,   1.0),
}
DEFAULT_PRICING = (15.0, 75.0, 1.875, 18.75)  # Opus

def get_pricing(model_name):
    """Match model name to pricing. Handles partial matches."""
    model_lower = model_name.lower()
    for key, rates in PRICING.items():
        if key in model_lower or key.replace("-", "") in model_lower.replace("-", ""):
            return rates
    # Broader partial matching
    if "opus" in model_lower:
        return PRICING["claude-opus-4-6"]
    if "sonnet" in model_lower:
        return PRICING["claude-sonnet-4-6"]
    if "haiku" in model_lower:
        return PRICING["claude-haiku-4-5"]
    return DEFAULT_PRICING

# Pick pricing from the first model, default to Opus
if models:
    pricing = get_pricing(next(iter(models)))
else:
    pricing = DEFAULT_PRICING

cost = (
    input_tokens * pricing[0]
    + output_tokens * pricing[1]
    + cache_read_tokens * pricing[2]
    + cache_write_tokens * pricing[3]
) / 1_000_000

# Round cost to 2 decimal places
cost = round(cost, 2)

result = {
    "input_tokens": input_tokens,
    "output_tokens": output_tokens,
    "cache_read_tokens": cache_read_tokens,
    "cache_write_tokens": cache_write_tokens,
    "total_tokens": total_tokens,
    "estimated_cost_usd": cost,
    "message_count": message_count,
    "tool_call_count": tool_call_count,
    "models": sorted(models),
    "duration_minutes": duration_minutes,
    "estimated": False,
}

print(json.dumps(result))
PYEOF
)

# ---------------------------------------------------------------------------
# Pretty-print with jq if available, otherwise output raw JSON
# ---------------------------------------------------------------------------
if [[ "$HAS_JQ" == true ]]; then
  echo "$TELEMETRY_JSON" | jq .
else
  echo "$TELEMETRY_JSON"
fi
