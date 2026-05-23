#!/bin/bash
# follow-ups.sh — Manage centralized follow-up tracking for /done sessions
# Usage:
#   follow-ups.sh add "<title>" "<details>" [--agent <agent>] [--priority <p>] [--source <slug>]
#   follow-ups.sh complete <FU-ID> [--reason "<why>"]
#   follow-ups.sh cancel <FU-ID> [--reason "<why>"]
#   follow-ups.sh list [--status open|stale|all] [--agent <agent>]
#   follow-ups.sh stale [--days <N>]     # mark items older than N days as stale (default: 7)
#   follow-ups.sh carry-forward           # output open items for context bootstrap
#   follow-ups.sh count                   # count open items by priority

set -euo pipefail

REPO_DIR="${MEMORY_REPO:-$HOME/openclaw}"
FU_FILE="$REPO_DIR/memory/shared/follow-ups/FOLLOW-UPS.md"
ARCHIVE_FILE="$REPO_DIR/memory/shared/follow-ups/archive.md"
DATE=$(date +%Y-%m-%d)
DATE_COMPACT=$(date +%Y%m%d)

mkdir -p "$(dirname "$FU_FILE")"
[ -f "$FU_FILE" ] || cat > "$FU_FILE" <<'INIT'
---
type: follow-ups
description: Centralized tracker for incomplete, deferred, and future work items
updated: DATEHERE
limit: 150
---

# Follow-Ups

Active follow-up items extracted from session wrap-ups. Managed by `follow-ups.sh`.
INIT

[ -f "$ARCHIVE_FILE" ] || cat > "$ARCHIVE_FILE" <<'INIT'
---
type: follow-ups-archive
description: Completed and cancelled follow-up items
updated: DATEHERE
---

# Follow-Ups Archive
INIT

# --- Helpers ---

extract_fu_id() {
  echo "$1" | sed -n 's/.*\(FU-[0-9]*-[0-9]*\).*/\1/p'
}

extract_date() {
  echo "$1" | sed -n 's/.*\([0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]\).*/\1/p' | head -1
}

next_id() {
  local last_num
  last_num=$(grep "FU-${DATE_COMPACT}-" "$FU_FILE" 2>/dev/null \
    | sed -n "s/.*FU-${DATE_COMPACT}-\([0-9]*\).*/\1/p" \
    | sort -n | tail -1)
  if [ -z "$last_num" ]; then
    echo "001"
  else
    printf "%03d" $((10#$last_num + 1))
  fi
}

update_timestamp() {
  local file="$1"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/^updated: .*/updated: $DATE/" "$file"
  else
    sed -i "s/^updated: .*/updated: $DATE/" "$file"
  fi
}

# --- Commands ---

cmd_add() {
  local title="$1"
  local details="${2:-}"
  local agent="claude-code"
  local priority="medium"
  local source=""

  shift 2 2>/dev/null || shift 1 2>/dev/null || true

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --agent)   agent="$2"; shift 2 ;;
      --priority) priority="$2"; shift 2 ;;
      --source)  source="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  local id="FU-${DATE_COMPACT}-$(next_id)"
  local source_line=""
  [ -n "$source" ] && source_line=" | Source: $source"

  {
    echo ""
    echo "## [$id] $title | $agent | $priority | open"
    echo ""
    echo "Created: ${DATE}${source_line}"
    [ -n "$details" ] && echo "$details"
    echo "Updated: $DATE"
  } >> "$FU_FILE"

  update_timestamp "$FU_FILE"
  echo "Added: [$id] $title ($priority)"

  # Prompt agent to create a corresponding Linear issue
  local linear_priority="Medium"
  case "$priority" in
    critical) linear_priority="Urgent" ;;
    high)     linear_priority="High" ;;
    medium)   linear_priority="Medium" ;;
    low)      linear_priority="Low" ;;
  esac

  echo ""
  echo "<linear-required>"
  echo "Create a Linear issue for this follow-up on the OpenClaw team:"
  echo "  Title: $title"
  echo "  Priority: $linear_priority"
  echo "  Status: Backlog"
  echo "  Label: follow-up"
  echo "  Description: $details"
  echo "  Cross-ref: $id"
  echo "</linear-required>"
}

cmd_complete() {
  local fu_id="$1"
  local reason=""
  shift
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --reason) reason="$2"; shift 2 ;;
      *) reason="$1"; shift ;;
    esac
  done

  local entry
  entry=$(awk "/^## \\[$fu_id\\]/{found=1} found{print} found && /^Updated:/{found=0}" "$FU_FILE")

  if [ -z "$entry" ]; then
    echo "Error: $fu_id not found in $FU_FILE"
    exit 1
  fi

  local archived_entry
  archived_entry=$(echo "$entry" | sed "s/| open$/| done/" | sed "s/| in-progress$/| done/" | sed "s/| stale$/| done/")
  archived_entry="$archived_entry"$'\n'"Completed: $DATE"
  [ -n "$reason" ] && archived_entry="$archived_entry | $reason"

  { echo ""; echo "$archived_entry"; } >> "$ARCHIVE_FILE"

  perl -i -0pe "s/\n## \\[$fu_id\\][^\n]*\n((?!## \\[FU-).*\n)*//g" "$FU_FILE"

  update_timestamp "$FU_FILE"
  update_timestamp "$ARCHIVE_FILE"
  echo "Completed: [$fu_id] -> archived"
}

cmd_cancel() {
  local fu_id="$1"
  local reason=""
  shift
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --reason) reason="$2"; shift 2 ;;
      *) reason="$1"; shift ;;
    esac
  done

  local entry
  entry=$(awk "/^## \\[$fu_id\\]/{found=1} found{print} found && /^Updated:/{found=0}" "$FU_FILE")

  if [ -z "$entry" ]; then
    echo "Error: $fu_id not found"
    exit 1
  fi

  local archived_entry
  archived_entry=$(echo "$entry" | sed "s/| open$/| cancelled/" | sed "s/| in-progress$/| cancelled/" | sed "s/| stale$/| cancelled/")
  archived_entry="$archived_entry"$'\n'"Cancelled: $DATE"
  [ -n "$reason" ] && archived_entry="$archived_entry | $reason"

  { echo ""; echo "$archived_entry"; } >> "$ARCHIVE_FILE"

  perl -i -0pe "s/\n## \\[$fu_id\\][^\n]*\n((?!## \\[FU-).*\n)*//g" "$FU_FILE"

  update_timestamp "$FU_FILE"
  update_timestamp "$ARCHIVE_FILE"
  echo "Cancelled: [$fu_id] -> archived"
}

cmd_list() {
  local status="open"
  local agent=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --status) status="$2"; shift 2 ;;
      --agent)  agent="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  local results
  if [ "$status" = "all" ]; then
    results=$(grep "^## \[FU-" "$FU_FILE" 2>/dev/null || true)
  else
    results=$(grep "^## \[FU-" "$FU_FILE" 2>/dev/null | grep "| $status$" || true)
  fi

  if [ -n "$agent" ]; then
    results=$(echo "$results" | grep "| $agent |" || true)
  fi

  if [ -z "$results" ]; then
    echo "No ${status} follow-ups found."
  else
    echo "$results"
  fi
}

cmd_stale() {
  local days="7"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --days) days="$2"; shift 2 ;;
      *) days="$1"; shift ;;
    esac
  done

  local cutoff
  if [[ "$OSTYPE" == "darwin"* ]]; then
    cutoff=$(date -v-${days}d +%Y-%m-%d)
  else
    cutoff=$(date -d "-${days} days" +%Y-%m-%d)
  fi

  local changed=0

  while IFS= read -r line; do
    local fu_id
    fu_id=$(extract_fu_id "$line")
    [ -z "$fu_id" ] && continue

    echo "$line" | grep -qE "\| (open|in-progress)$" || continue

    local updated_line updated_date
    updated_line=$(awk "/^## \\[$fu_id\\]/{found=1} found && /^Updated:/{print; found=0}" "$FU_FILE")
    updated_date=$(extract_date "$updated_line")
    [ -z "$updated_date" ] && continue

    if [[ "$updated_date" < "$cutoff" ]] || [[ "$updated_date" == "$cutoff" ]]; then
      if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/## \\[$fu_id\\]\\(.*\\)| open$/## [$fu_id]\\1| stale/" "$FU_FILE"
        sed -i '' "s/## \\[$fu_id\\]\\(.*\\)| in-progress$/## [$fu_id]\\1| stale/" "$FU_FILE"
      else
        sed -i "s/## \\[$fu_id\\]\\(.*\\)| open$/## [$fu_id]\\1| stale/" "$FU_FILE"
        sed -i "s/## \\[$fu_id\\]\\(.*\\)| in-progress$/## [$fu_id]\\1| stale/" "$FU_FILE"
      fi
      echo "Stale: [$fu_id] (last updated: $updated_date)"
      changed=$((changed + 1))
    fi
  done < <(grep "^## \[FU-" "$FU_FILE" 2>/dev/null)

  if [ "$changed" -eq 0 ]; then
    echo "No items to mark stale (threshold: ${days} days)"
  else
    update_timestamp "$FU_FILE"
    echo "Marked $changed item(s) as stale"
  fi
}

cmd_carry_forward() {
  echo "### Pending Follow-Ups"
  echo ""

  local count=0
  local lines
  lines=$(grep "^## \[FU-" "$FU_FILE" 2>/dev/null || true)
  [ -z "$lines" ] && { echo "No pending follow-ups."; return 0; }

  while IFS= read -r line; do
    [ -z "$line" ] && continue
    local fu_id title priority status
    fu_id=$(extract_fu_id "$line")
    [ -z "$fu_id" ] && continue

    title=$(echo "$line" | sed 's/^## \[FU-[0-9-]*\] //' | sed 's/ |.*//')
    priority=$(echo "$line" | grep -oE '(critical|high|medium|low)' | head -1 || true)
    status=$(echo "$line" | sed 's/.*| //')

    case "$status" in
      open|in-progress|stale|blocked) ;;
      *) continue ;;
    esac

    local marker="- [ ]"
    case "$status" in
      stale)       marker="- [!]" ;;
      in-progress) marker="- [~]" ;;
      blocked)     marker="- [x]" ;;
    esac

    echo "$marker [$fu_id] $title ($priority, $status)"
    count=$((count + 1))
  done <<< "$lines"

  if [ "$count" -eq 0 ]; then
    echo "No pending follow-ups."
  fi
}

cmd_count() {
  echo "Follow-up counts:"
  for p in critical high medium low; do
    local n
    n=$(grep "^## \[FU-" "$FU_FILE" 2>/dev/null | grep "| $p |" | grep -c "| open$" || true)
    [ "$n" -gt 0 ] && echo "  $p: $n open"
  done
  local stale
  stale=$(grep "^## \[FU-" "$FU_FILE" 2>/dev/null | grep -c "| stale$" || true)
  [ "$stale" -gt 0 ] && echo "  stale: $stale"
  local total
  total=$(grep -c "^## \[FU-" "$FU_FILE" 2>/dev/null || true)
  echo "  total active: $total"
}

# --- Dispatch ---

case "${1:-help}" in
  add)           shift; cmd_add "$@" ;;
  complete)      shift; cmd_complete "$@" ;;
  cancel)        shift; cmd_cancel "$@" ;;
  list)          shift; cmd_list "$@" ;;
  stale)         shift; cmd_stale "$@" ;;
  carry-forward) cmd_carry_forward ;;
  count)         cmd_count ;;
  help|*)
    echo "Usage: follow-ups.sh <command> [args]"
    echo "Commands: add, complete, cancel, list, stale, carry-forward, count"
    ;;
esac
