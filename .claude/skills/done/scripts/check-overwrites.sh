#!/usr/bin/env bash
# check-overwrites.sh — 3-layer overwrite detection for feature branches
#
# Usage:
#   check-overwrites.sh --mode <pre-merge|post-merge> --branch <branch> [--base <base-branch>] [--depth <N>]
#
# Layers:
#   1. Diff comparison — detects when PR deletes lines recently added by another PR
#   2. Content grep — detects conflict markers, cross-ticket TODOs, duplicate exports
#   3. Blame audit (post-merge only) — verifies feature lines survived the merge

set -euo pipefail

REPO_DIR="${MEMORY_REPO:-$HOME/openclaw}"

# --- Parse arguments ---
MODE=""
BRANCH=""
BASE="main"
DEPTH=5

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)   MODE="${2:-}"; shift 2 ;;
    --branch) BRANCH="${2:-}"; shift 2 ;;
    --base)   BASE="${2:-}"; shift 2 ;;
    --depth)  DEPTH="${2:-5}"; shift 2 ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$MODE" ]]; then
  echo "Error: --mode is required (pre-merge or post-merge)" >&2
  exit 1
fi

if [[ -z "$BRANCH" ]]; then
  BRANCH=$(git -C "$REPO_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
fi

cd "$REPO_DIR"

FOUND=0

# =====================================================================
# Layer 1: Diff comparison
# Detect when this PR deletes lines that were added by a recent PR on base
# =====================================================================
layer1_diff() {
  echo "--- Layer 1: Diff comparison ---" >&2

  local changed_files
  changed_files=$(git diff "${BASE}...${BRANCH}" --name-only 2>/dev/null || echo "")

  # Get recent merge commits on base (last N PRs)
  local recent_merges
  recent_merges=$(git log "$BASE" --merges --oneline -"$DEPTH" --format='%H' 2>/dev/null || echo "")

  if [[ -z "$recent_merges" || -z "$changed_files" ]]; then
    return
  fi

  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    [[ ! -f "$REPO_DIR/$file" ]] && continue

    # Get deleted lines from this PR for this file
    local deleted_lines
    deleted_lines=$(git diff "${BASE}...${BRANCH}" -- "$file" 2>/dev/null \
      | grep -n '^-[^-]' | head -20 || true)

    if [[ -z "$deleted_lines" ]]; then
      continue
    fi

    # For each deleted line, check blame on base to see if it came from a recent PR
    while IFS= read -r del_line; do
      [[ -z "$del_line" ]] && continue
      local content
      content="${del_line#*:-}"

      # Check if any recent merge added this line
      for merge_sha in $recent_merges; do
        local parent
        parent=$(git log --format='%P' -1 "$merge_sha" 2>/dev/null | awk '{print $1}')
        [[ -z "$parent" ]] && continue

        if git diff "${parent}..${merge_sha}" -- "$file" 2>/dev/null | grep -qF "+${content}"; then
          local short_sha="${merge_sha:0:8}"
          local merge_title
          merge_title=$(git log --format='%s' -1 "$merge_sha" 2>/dev/null | head -c 60)
          echo "[OVERWRITE] $file — deletes line added by $short_sha ($merge_title)"
          FOUND=$((FOUND + 1))
          break
        fi
      done
    done <<< "$deleted_lines"
  done <<< "$changed_files"
}

# =====================================================================
# Layer 2: Content grep
# Detect conflict markers, cross-ticket TODOs, duplicate exports
# =====================================================================
layer2_grep() {
  echo "--- Layer 2: Content grep ---" >&2

  local changed_files
  changed_files=$(git diff "${BASE}...${BRANCH}" --name-only 2>/dev/null || echo "")

  if [[ -z "$changed_files" ]]; then
    return
  fi

  # Detect the current ticket from branch name
  local current_ticket
  current_ticket=$(echo "$BRANCH" | grep -oE 'AI-[0-9]+' | head -1 || echo "")

  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    [[ ! -f "$REPO_DIR/$file" ]] && continue

    # 2a. Conflict markers (should never appear in committed code)
    local conflicts
    conflicts=$(grep -n -E '^(<{7}( |$)|={7}$|>{7}( |$))' "$REPO_DIR/$file" 2>/dev/null || true)
    if [[ -n "$conflicts" ]]; then
      while IFS= read -r cline; do
        local linenum
        linenum=$(echo "$cline" | cut -d: -f1)
        echo "[OVERWRITE] $file:$linenum — conflict marker found"
        FOUND=$((FOUND + 1))
      done <<< "$conflicts"
    fi

    # 2b. Cross-ticket TODO collision
    if [[ -n "$current_ticket" ]]; then
      local cross_todos
      cross_todos=$(grep -n 'TODO(AI-' "$REPO_DIR/$file" 2>/dev/null \
        | grep -v "TODO($current_ticket" || true)
      if [[ -n "$cross_todos" ]]; then
        while IFS= read -r tline; do
          local linenum
          linenum=$(echo "$tline" | cut -d: -f1)
          local todo_ref
          todo_ref=$(echo "$tline" | grep -oE 'TODO\(AI-[0-9]+\)' | head -1)
          echo "[OVERWRITE] $file:$linenum — cross-ticket TODO: $todo_ref (current: $current_ticket)"
          FOUND=$((FOUND + 1))
        done <<< "$cross_todos"
      fi
    fi

    # 2c. Duplicate function/export names within same file
    if [[ "$file" == *.ts || "$file" == *.js ]]; then
      local dup_exports
      dup_exports=$(grep -oE 'export (function|const|class|type|interface) [a-zA-Z_]+' "$REPO_DIR/$file" 2>/dev/null \
        | sort | uniq -d || true)
      if [[ -n "$dup_exports" ]]; then
        echo "[OVERWRITE] $file — duplicate exports: $dup_exports"
        FOUND=$((FOUND + 1))
      fi
    fi

    if [[ "$file" == *.sh ]]; then
      local dup_funcs
      dup_funcs=$(grep -oE '^[a-z_]+\(\)' "$REPO_DIR/$file" 2>/dev/null \
        | sort | uniq -d || true)
      if [[ -n "$dup_funcs" ]]; then
        echo "[OVERWRITE] $file — duplicate functions: $dup_funcs"
        FOUND=$((FOUND + 1))
      fi
    fi
  done <<< "$changed_files"
}

# =====================================================================
# Layer 3: Blame audit (post-merge only)
# Verify feature lines survived the merge
# =====================================================================
layer3_blame() {
  echo "--- Layer 3: Blame audit ---" >&2

  local changed_files
  changed_files=$(git diff "${BASE}~1...${BASE}" --name-only 2>/dev/null || echo "")

  if [[ -z "$changed_files" ]]; then
    return
  fi

  # Get the merge commit and the feature branch commits
  local merge_sha
  merge_sha=$(git -C "$REPO_DIR" rev-parse HEAD 2>/dev/null || echo "")

  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    [[ ! -f "$REPO_DIR/$file" ]] && continue

    # Check that the file's blame includes commits from the branch
    local branch_commits
    branch_commits=$(git log "${BASE}~${DEPTH}..${BASE}" --format='%H' -- "$file" 2>/dev/null | head -5 || echo "")

    if [[ -z "$branch_commits" ]]; then
      continue
    fi

    # Sample blame to check if branch commits appear
    local blame_shas
    blame_shas=$(git blame --porcelain "$REPO_DIR/$file" 2>/dev/null \
      | grep -E '^[0-9a-f]{40}' | awk '{print $1}' | sort -u | head -20 || true)

    local any_match=false
    for commit in $branch_commits; do
      if echo "$blame_shas" | grep -q "${commit:0:40}"; then
        any_match=true
        break
      fi
    done

    if ! $any_match && [[ -n "$branch_commits" ]]; then
      echo "[OVERWRITE] $file — no branch commits visible in blame (may have been overwritten by merge)"
      FOUND=$((FOUND + 1))
    fi
  done <<< "$changed_files"
}

# --- Run layers based on mode ---
case "$MODE" in
  pre-merge)
    layer1_diff
    layer2_grep
    ;;
  post-merge)
    layer1_diff
    layer2_grep
    layer3_blame
    ;;
  *)
    echo "Error: --mode must be 'pre-merge' or 'post-merge'" >&2
    exit 1
    ;;
esac

# --- Exit ---
if [[ "$FOUND" -gt 0 ]]; then
  echo "" >&2
  echo "Found $FOUND overwrite issue(s)" >&2
  exit 1
fi

echo "Clean — no overwrites detected" >&2
exit 0
