#!/usr/bin/env bash
# generate-mrd.sh — Generate a Merge Request Description (MRD) on feature complete
#
# Usage:
#   generate-mrd.sh --slug <slug> --linear-id <AI-NNN> --pr <number> --branch <branch> [--telemetry-file <path>]

set -euo pipefail

REPO_DIR="${MEMORY_REPO:-$HOME/openclaw}"
FEATURES_DIR="$REPO_DIR/memory/shared/features"
SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# --- Parse arguments ---
SLUG=""
LINEAR_ID=""
PR_NUMBER=""
BRANCH=""
TELEMETRY_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --slug)       SLUG="${2:-}"; shift 2 ;;
    --linear-id)  LINEAR_ID="${2:-}"; shift 2 ;;
    --pr)         PR_NUMBER="${2:-}"; shift 2 ;;
    --branch)     BRANCH="${2:-}"; shift 2 ;;
    --telemetry-file) TELEMETRY_FILE="${2:-}"; shift 2 ;;
    *)
      echo "Unknown option: $1" >&2
      echo "Usage: generate-mrd.sh --slug <slug> --linear-id <AI-NNN> --pr <number> --branch <branch> [--telemetry-file <path>]" >&2
      exit 1
      ;;
  esac
done

# --- Validate ---
if [[ -z "$LINEAR_ID" ]]; then
  echo "Error: --linear-id is required" >&2
  exit 1
fi

if [[ -z "$SLUG" ]]; then
  echo "Error: --slug is required" >&2
  exit 1
fi

if [[ -z "$BRANCH" ]]; then
  BRANCH="feat/$SLUG"
fi

MANIFEST="$FEATURES_DIR/${SLUG}.md"
MRD_PATH="$FEATURES_DIR/${LINEAR_ID}-${SLUG}-mrd.md"

mkdir -p "$FEATURES_DIR"

# --- Tag detection from changed file paths ---
detect_tags() {
  local files="$1"
  local tags=()

  if echo "$files" | grep -q 'skills/done/'; then
    tags+=("done-workflow")
  fi
  if echo "$files" | grep -q 'memory/scripts/'; then
    tags+=("memory-infra")
  fi
  if echo "$files" | grep -q 'memory/shared/'; then
    tags+=("shared-memory")
  fi
  if echo "$files" | grep -qE 'skills/[^/]+/scripts/'; then
    tags+=("skill-scripts")
  fi
  if echo "$files" | grep -q 'config/'; then
    tags+=("config")
  fi
  if echo "$files" | grep -q 'src/'; then
    tags+=("core")
  fi
  if echo "$files" | grep -q 'ui/'; then
    tags+=("ui")
  fi
  if echo "$files" | grep -qE '^scripts/'; then
    tags+=("infra")
  fi
  if echo "$files" | grep -qE '(tests/|\.test\.)'; then
    tags+=("testing")
  fi

  # Output as JSON array items
  local first=true
  for tag in "${tags[@]}"; do
    if $first; then
      printf '"%s"' "$tag"
      first=false
    else
      printf ', "%s"' "$tag"
    fi
  done
}

# --- Build implementation details from git diff ---
build_implementation_details() {
  local base="${1:-main}"
  local branch_ref="${2:-HEAD}"

  cd "$REPO_DIR"
  local stat_output
  stat_output=$(git diff "${base}...${branch_ref}" --stat 2>/dev/null || echo "")

  if [[ -z "$stat_output" ]]; then
    echo "No file changes detected."
    return
  fi

  local changed_files
  changed_files=$(git diff "${base}...${branch_ref}" --name-only 2>/dev/null || echo "")

  local log_output
  log_output=$(git log "${base}..${branch_ref}" --oneline 2>/dev/null || echo "")

  while IFS= read -r file; do
    [[ -z "$file" ]] && continue

    # Check if file is new (doesn't exist on base)
    local prefix=""
    if ! git show "${base}:${file}" &>/dev/null; then
      prefix=":new: "
    fi

    # Get a summary of changes for this file
    local additions deletions
    additions=$(git diff "${base}...${branch_ref}" --numstat -- "$file" 2>/dev/null | awk '{print $1}')
    deletions=$(git diff "${base}...${branch_ref}" --numstat -- "$file" 2>/dev/null | awk '{print $2}')

    echo "- ${prefix}\`${file}\` (+${additions:-0}/-${deletions:-0})"
  done <<< "$changed_files"
}

# --- Build sessions table from feature manifest ---
build_sessions_table() {
  if [[ ! -f "$MANIFEST" ]]; then
    echo "| # | Agent | Start | End |"
    echo "|---|-------|-------|-----|"
    echo "| — | — | — | — |"
    return
  fi

  echo "| # | Agent | Start | End |"
  echo "|---|-------|-------|-----|"

  # Extract session rows from manifest
  grep -E '^\| [0-9]' "$MANIFEST" 2>/dev/null | while IFS= read -r line; do
    local seq agent start end
    seq=$(echo "$line" | awk -F'|' '{gsub(/[ \t]+/, "", $2); print $2}')
    agent=$(echo "$line" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $3); print $3}')
    start=$(echo "$line" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $5); print $5}')
    end=$(echo "$line" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $6); print $6}')
    echo "| $seq | $agent | $start | $end |"
  done
}

# --- Build telemetry section ---
build_telemetry_section() {
  if [[ -n "$TELEMETRY_FILE" && -f "$TELEMETRY_FILE" ]]; then
    if command -v jq &>/dev/null; then
      local input_t output_t cache_r total_t cost msgs models
      input_t=$(jq -r '.input_tokens // 0' "$TELEMETRY_FILE")
      output_t=$(jq -r '.output_tokens // 0' "$TELEMETRY_FILE")
      cache_r=$(jq -r '.cache_read_tokens // 0' "$TELEMETRY_FILE")
      total_t=$(jq -r '.total_tokens // 0' "$TELEMETRY_FILE")
      cost=$(jq -r '.estimated_cost_usd // 0' "$TELEMETRY_FILE")
      msgs=$(jq -r '.message_count // 0' "$TELEMETRY_FILE")
      models=$(jq -r '(.models // []) | join(", ")' "$TELEMETRY_FILE")

      # Format numbers with commas
      input_t=$(printf "%'d" "$input_t" 2>/dev/null || echo "$input_t")
      output_t=$(printf "%'d" "$output_t" 2>/dev/null || echo "$output_t")
      total_t=$(printf "%'d" "$total_t" 2>/dev/null || echo "$total_t")

      echo "| Metric | Value |"
      echo "|--------|-------|"
      echo "| Total tokens | $total_t |"
      echo "| Input tokens | $input_t |"
      echo "| Output tokens | $output_t |"
      echo "| Estimated cost | \$$cost |"
      echo "| Messages sent | $msgs |"
      echo "| Models used | $models |"
    else
      echo "| Metric | Value |"
      echo "|--------|-------|"
      echo "| Data | See telemetry file: $TELEMETRY_FILE |"
    fi
  else
    echo "Not available"
  fi
}

# --- Extract follow-ups from manifest ---
extract_section() {
  local file="$1" heading="$2"
  if [[ ! -f "$file" ]]; then
    echo "None"
    return
  fi

  local in_section=false
  local content=""
  while IFS= read -r line; do
    if [[ "$line" == "## $heading" ]]; then
      in_section=true
      continue
    fi
    if $in_section; then
      if [[ "$line" == "## "* ]]; then
        break
      fi
      if [[ "$line" != "_(none yet)_" && -n "$line" ]]; then
        content+="$line"$'\n'
      fi
    fi
  done < "$file"

  if [[ -z "$content" ]]; then
    echo "None"
  else
    echo "$content"
  fi
}

# --- Build the MRD ---
echo "Generating MRD for $LINEAR_ID ($SLUG)..." >&2

cd "$REPO_DIR"
CHANGED_FILES=$(git diff "main...${BRANCH}" --name-only 2>/dev/null || echo "")
TAGS=$(detect_tags "$CHANGED_FILES")

# Feature title from manifest or slug
TITLE="$SLUG"
if [[ -f "$MANIFEST" ]]; then
  MANIFEST_TITLE=$(grep -m1 '^# Feature:' "$MANIFEST" 2>/dev/null | sed 's/^# Feature: //' || echo "")
  if [[ -n "$MANIFEST_TITLE" ]]; then
    TITLE="$MANIFEST_TITLE"
  fi
fi

IMPL_DETAILS=$(build_implementation_details "main" "$BRANCH")
SESSIONS_TABLE=$(build_sessions_table)
TELEMETRY=$(build_telemetry_section)
FOLLOWUPS=$(extract_section "$MANIFEST" "Follow-Ups")
LEARNINGS=$(extract_section "$MANIFEST" "Learnings")

cat > "$MRD_PATH" <<MRDEOF
---
title: $TITLE
type: mrd
linear_id: $LINEAR_ID
feature_slug: $SLUG
tags: ["mrd", "$LINEAR_ID", $TAGS]
branch: $BRANCH
pr: #${PR_NUMBER:-0}
generated_at: $NOW
---

## Story

[$LINEAR_ID](https://linear.app/gautambh/issue/$LINEAR_ID)

## Context

Session coherence for the /done workflow. Adds feature manifests, named sessions, MRD generation, pre/post-merge validation, overwrite checks, and token/cost telemetry. Connects plans, sessions, follow-ups, and daily log entries into a retrievable whole per feature.

## Implementation Details

$IMPL_DETAILS

## Sessions

$SESSIONS_TABLE

## Telemetry

$TELEMETRY

## Follow-Ups

$FOLLOWUPS

## Learnings

$LEARNINGS
MRDEOF

echo "MRD written to: $MRD_PATH" >&2

# --- Register MRD in feature manifest ---
if [[ -f "$MANIFEST" ]] && [[ -f "$SCRIPTS_DIR/feature-manifest.sh" ]]; then
  bash "$SCRIPTS_DIR/feature-manifest.sh" add-mrd --slug "$SLUG" --path "$MRD_PATH" 2>/dev/null || true
fi

# --- Update PR body ---
if [[ -n "$PR_NUMBER" ]] && command -v gh &>/dev/null; then
  gh pr edit "$PR_NUMBER" --repo gbharg/agents --body "$(cat "$MRD_PATH")" 2>/dev/null || \
    echo "Warning: could not update PR body" >&2
fi

echo "Done." >&2
