#!/bin/bash
# feature-manifest.sh — Create, update, and query feature manifests
# Aggregates all sessions, follow-ups, learnings, and PRs for a feature.
#
# Usage:
#   feature-manifest.sh create --slug <slug> --plan <path> --branch <branch> --agent <agent>
#   feature-manifest.sh add-session --slug <slug> --sequence <N> --agent <agent> --session-file <path> --start <ISO8601>
#   feature-manifest.sh end-session --slug <slug> --sequence <N> --end <ISO8601> --state <complete|abandoned>
#   feature-manifest.sh add-followup --slug <slug> --fu-id <FU-ID> --title <title>
#   feature-manifest.sh add-learning --slug <slug> --err-id <ERR-ID> --title <title>
#   feature-manifest.sh add-pr --slug <slug> --pr <number> --title <title>
#   feature-manifest.sh next-sequence --slug <slug> --agent <agent>
#   feature-manifest.sh complete --slug <slug>
#   feature-manifest.sh get --slug <slug>

set -euo pipefail

REPO_DIR="${MEMORY_REPO:-$HOME/openclaw}"
FEATURES_DIR="$REPO_DIR/memory/shared/features"
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)

mkdir -p "$FEATURES_DIR"

# --- Helpers ---

manifest_path() {
  echo "$FEATURES_DIR/$1.md"
}

require_slug() {
  if [ -z "${slug:-}" ]; then
    echo "Error: --slug is required" >&2
    exit 1
  fi
}

require_manifest() {
  local path
  path=$(manifest_path "$slug")
  if [ ! -f "$path" ]; then
    echo "Error: manifest not found for slug '$slug' at $path" >&2
    exit 1
  fi
}

update_frontmatter_field() {
  local file="$1" field="$2" value="$3"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/^${field}: .*/${field}: ${value}/" "$file"
  else
    sed -i "s/^${field}: .*/${field}: ${value}/" "$file"
  fi
}

# --- Commands ---

cmd_create() {
  local slug="" plan="" branch="" agent=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --slug)   slug="$2"; shift 2 ;;
      --plan)   plan="$2"; shift 2 ;;
      --branch) branch="$2"; shift 2 ;;
      --agent)  agent="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  require_slug
  local path
  path=$(manifest_path "$slug")

  # Idempotent: no-op if manifest exists
  if [ -f "$path" ]; then
    echo "Manifest already exists: $path"
    return 0
  fi

  cat > "$path" <<EOF
---
type: feature-manifest
slug: $slug
plan: ${plan:-}
branch: ${branch:-}
state: active
created_at: $NOW
updated_at: $NOW
---

# Feature: $slug

## Sessions

| # | Agent | Session File | Start | End | State |
|---|-------|-------------|-------|-----|-------|

## Follow-Ups

_(none yet)_

## Learnings

_(none yet)_

## PRs

_(none yet)_

## Daily Log Entries

_(none yet)_
EOF

  echo "Created feature manifest: $path"
}

cmd_add_session() {
  local slug="" sequence="" agent="" session_file="" start=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --slug)         slug="$2"; shift 2 ;;
      --sequence)     sequence="$2"; shift 2 ;;
      --agent)        agent="$2"; shift 2 ;;
      --session-file) session_file="$2"; shift 2 ;;
      --start)        start="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  require_slug
  require_manifest

  local path
  path=$(manifest_path "$slug")
  local row="| $sequence | $agent | $session_file | $start | — | active |"

  # Insert session row before the empty line after the table header separator
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "/^|---|-------|/a\\
$row" "$path"
  else
    sed -i "/^|---|-------|/a\\$row" "$path"
  fi

  update_frontmatter_field "$path" "updated_at" "$NOW"
  echo "Added session $sequence to $slug"
}

cmd_end_session() {
  local slug="" sequence="" end="" state=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --slug)     slug="$2"; shift 2 ;;
      --sequence) sequence="$2"; shift 2 ;;
      --end)      end="$2"; shift 2 ;;
      --state)    state="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  require_slug
  require_manifest

  local path
  path=$(manifest_path "$slug")

  # Update the row matching sequence: replace end time and state
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/| $sequence |\\(.*\\)| — | active |/| $sequence |\\1| $end | $state |/" "$path"
  else
    sed -i "s/| $sequence |\\(.*\\)| — | active |/| $sequence |\\1| $end | $state |/" "$path"
  fi

  update_frontmatter_field "$path" "updated_at" "$NOW"
  echo "Ended session $sequence ($state) in $slug"
}

cmd_add_followup() {
  local slug="" fu_id="" title=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --slug)   slug="$2"; shift 2 ;;
      --fu-id)  fu_id="$2"; shift 2 ;;
      --title)  title="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  require_slug
  require_manifest

  local path
  path=$(manifest_path "$slug")

  # Remove placeholder if present
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' '/^_(none yet)_$/{ N; /## Follow-Ups/!{ /^_(none yet)_$/d; }; }' "$path"
  else
    sed -i '/^_(none yet)_$/{ N; /## Follow-Ups/!{ /^_(none yet)_$/d; }; }' "$path"
  fi
  # Simpler approach: remove first occurrence of placeholder after Follow-Ups heading
  perl -i -0pe 's/(## Follow-Ups\n\n)_\(none yet\)_/$1/' "$path"

  # Append follow-up entry after the Follow-Ups heading
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "/^## Follow-Ups$/a\\
- [$fu_id] $title" "$path"
  else
    sed -i "/^## Follow-Ups$/a\\- [$fu_id] $title" "$path"
  fi

  update_frontmatter_field "$path" "updated_at" "$NOW"
  echo "Added follow-up $fu_id to $slug"
}

cmd_add_learning() {
  local slug="" err_id="" title=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --slug)   slug="$2"; shift 2 ;;
      --err-id) err_id="$2"; shift 2 ;;
      --title)  title="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  require_slug
  require_manifest

  local path
  path=$(manifest_path "$slug")

  # Remove placeholder if present
  perl -i -0pe 's/(## Learnings\n\n)_\(none yet\)_/$1/' "$path"

  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "/^## Learnings$/a\\
- [$err_id] $title" "$path"
  else
    sed -i "/^## Learnings$/a\\- [$err_id] $title" "$path"
  fi

  update_frontmatter_field "$path" "updated_at" "$NOW"
  echo "Added learning $err_id to $slug"
}

cmd_add_pr() {
  local slug="" pr="" title=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --slug)  slug="$2"; shift 2 ;;
      --pr)    pr="$2"; shift 2 ;;
      --title) title="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  require_slug
  require_manifest

  local path
  path=$(manifest_path "$slug")

  # Remove placeholder if present
  perl -i -0pe 's/(## PRs\n\n)_\(none yet\)_/$1/' "$path"

  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "/^## PRs$/a\\
- #$pr $title" "$path"
  else
    sed -i "/^## PRs$/a\\- #$pr $title" "$path"
  fi

  update_frontmatter_field "$path" "updated_at" "$NOW"
  echo "Added PR #$pr to $slug"
}

cmd_next_sequence() {
  local slug="" agent=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --slug)  slug="$2"; shift 2 ;;
      --agent) agent="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  require_slug
  require_manifest

  local path
  path=$(manifest_path "$slug")

  # Find max sequence number for this agent (or all agents if none specified)
  local max_seq=0
  local pattern="| [0-9]"
  if [ -n "$agent" ]; then
    pattern="| [0-9].* | $agent |"
  fi

  while IFS= read -r line; do
    local seq_num
    seq_num=$(echo "$line" | awk -F'|' '{gsub(/[ \t]+/, "", $2); print $2}')
    if [[ "$seq_num" =~ ^[0-9]+$ ]] && [ "$seq_num" -gt "$max_seq" ]; then
      max_seq=$seq_num
    fi
  done < <(grep -E "^\| [0-9]" "$path" 2>/dev/null || true)

  echo $((max_seq + 1))
}

cmd_complete() {
  local slug=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --slug) slug="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  require_slug
  require_manifest

  local path
  path=$(manifest_path "$slug")

  # Set state to complete
  update_frontmatter_field "$path" "state" "complete"
  update_frontmatter_field "$path" "updated_at" "$NOW"

  # End all active sessions
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/| — | active |/| $NOW | complete |/g" "$path"
  else
    sed -i "s/| — | active |/| $NOW | complete |/g" "$path"
  fi

  echo "Feature $slug marked complete"
}

cmd_add_mrd() {
  local slug="" mrd_path=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --slug) slug="$2"; shift 2 ;;
      --path) mrd_path="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  require_slug
  require_manifest

  local path
  path=$(manifest_path "$slug")

  # Add MRD reference after PRs section or at the end
  if grep -q '^## MRD$' "$path" 2>/dev/null; then
    # Already has MRD section, update it
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s|^MRD: .*|MRD: $mrd_path|" "$path"
    else
      sed -i "s|^MRD: .*|MRD: $mrd_path|" "$path"
    fi
  else
    # Add MRD section before Daily Log Entries
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "/^## Daily Log Entries$/i\\
\\
## MRD\\
\\
$mrd_path\\
" "$path"
    else
      sed -i "/^## Daily Log Entries$/i\\\\n## MRD\\n\\n$mrd_path\\n" "$path"
    fi
  fi

  update_frontmatter_field "$path" "updated_at" "$NOW"
  echo "Added MRD reference to $slug"
}

cmd_get() {
  local slug=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --slug) slug="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  require_slug
  require_manifest

  cat "$(manifest_path "$slug")"
}

# --- Dispatch ---

case "${1:-help}" in
  create)        shift; cmd_create "$@" ;;
  add-session)   shift; cmd_add_session "$@" ;;
  end-session)   shift; cmd_end_session "$@" ;;
  add-followup)  shift; cmd_add_followup "$@" ;;
  add-learning)  shift; cmd_add_learning "$@" ;;
  add-pr)        shift; cmd_add_pr "$@" ;;
  add-mrd)       shift; cmd_add_mrd "$@" ;;
  next-sequence) shift; cmd_next_sequence "$@" ;;
  complete)      shift; cmd_complete "$@" ;;
  get)           shift; cmd_get "$@" ;;
  help|*)
    echo "Usage: feature-manifest.sh <command> [args]"
    echo "Commands: create, add-session, end-session, add-followup, add-learning, add-pr, add-mrd, next-sequence, complete, get"
    ;;
esac
