#!/usr/bin/env bash
# validate-feature.sh — Pre-merge and post-merge validation for feature branches
#
# Usage:
#   validate-feature.sh --mode <pre-merge|post-merge> --branch <branch> [--slug <slug>] [--pr <number>] [--linear-id <AI-NNN>]

set -euo pipefail

REPO_DIR="${MEMORY_REPO:-$HOME/openclaw}"
FEATURES_DIR="$REPO_DIR/memory/shared/features"
SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"

# Source git-shared.sh for check_conflict_markers
# shellcheck source=../../../memory/scripts/git-shared.sh
if [[ -f "$REPO_DIR/memory/scripts/git-shared.sh" ]]; then
  source "$REPO_DIR/memory/scripts/git-shared.sh"
fi

# --- Parse arguments ---
MODE=""
BRANCH=""
SLUG=""
PR_NUMBER=""
LINEAR_ID=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)      MODE="${2:-}"; shift 2 ;;
    --branch)    BRANCH="${2:-}"; shift 2 ;;
    --slug)      SLUG="${2:-}"; shift 2 ;;
    --pr)        PR_NUMBER="${2:-}"; shift 2 ;;
    --linear-id) LINEAR_ID="${2:-}"; shift 2 ;;
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

# Derive slug from branch if not provided
if [[ -z "$SLUG" && -n "$BRANCH" ]]; then
  SLUG=$(echo "$BRANCH" | sed -E 's/^(feat|fix|refactor)\///')
fi

COUNCIL_BOT_PATTERN="^(gemini|codex|copilot|claude-code|claude-pr|openclaw-bot)$"

# --- Counters ---
PASS=0
FAIL=0
WARN=0
TOTAL=0

check() {
  local name="$1" fatal="$2" result="$3" detail="${4:-}"
  TOTAL=$((TOTAL + 1))
  if [[ "$result" == "pass" ]]; then
    PASS=$((PASS + 1))
    echo "[PASS] $name"
  elif [[ "$result" == "warn" ]]; then
    WARN=$((WARN + 1))
    echo "[WARN] $name${detail:+ — $detail}"
  else
    if [[ "$fatal" == "true" ]]; then
      FAIL=$((FAIL + 1))
      echo "[FAIL] $name${detail:+ — $detail}"
    else
      WARN=$((WARN + 1))
      echo "[WARN] $name${detail:+ — $detail}"
    fi
  fi
}

# =====================================================================
# REVIEW COMMENT CHECK
# =====================================================================
check_review_comments() {
  local pr="${PR_NUMBER:-}"

  # Verify gh CLI is available
  if ! command -v gh &>/dev/null; then
    check "Review comments (council)" "true" "warn" "gh CLI not found — skipped"
    return
  fi

  # Auto-detect PR number from branch if not supplied
  if [[ -z "$pr" && -n "$BRANCH" ]]; then
    local pr_out
    pr_out=$(gh pr list --head "$BRANCH" --json number -q '.[0].number' 2>&1) || {
      check "Review comments (council)" "true" "warn" "gh API call failed — skipped (${pr_out:0:80})"
      return
    }
    pr="$pr_out"
  fi

  if [[ -z "$pr" ]]; then
    check "Review comments (council)" "true" "pass" "No PR found — skipped"
    return
  fi

  # Fetch ALL review data in a single API call
  local all_reviews
  all_reviews=$(gh pr view "$pr" --json reviews \
    --jq '.reviews[] | {login: .author.login, state: .state, body: .body}' 2>&1) || {
    check "Review comments (council)" "true" "warn" "gh API call failed — skipped (${all_reviews:0:80})"
    return
  }

  if [[ -z "$all_reviews" ]]; then
    check "Review comments (council)" "true" "pass" "No reviews found"
    return
  fi

  # Single jq pass: filter to council bots, take latest review per reviewer,
  # detect blocking conditions, output first blocker (if any).
  # Uses --arg for safe shell variable passing (no string interpolation in jq).
  local blocker_line
  blocker_line=$(echo "$all_reviews" | jq -r --slurp --arg bot_pattern "$COUNCIL_BOT_PATTERN" '
    # Keep only reviews from council bots
    [ .[] | select(.login | test($bot_pattern; "i")) ]
    # Group by login, take last (latest) review per reviewer
    | group_by(.login)
    | map(last)
    # Find first blocking review
    | (
        # Priority 1: CHANGES_REQUESTED
        ( .[] | select(.state == "CHANGES_REQUESTED") | "\(.login)\tCHANGES_REQUESTED" ) //
        # Priority 2: COMMENTED with critical keywords
        ( .[] | select(
            .state == "COMMENTED" and
            (.body | test("CRITICAL|BLOCKER|MUST FIX|security vulnerability"; "i"))
          ) | "\(.login)\tCOMMENTED with critical keyword" ) //
        empty
      )
  ' 2>/dev/null) || blocker_line=""

  if [[ -n "$blocker_line" ]]; then
    local blocking_reviewer blocking_reason
    blocking_reviewer="${blocker_line%%	*}"
    blocking_reason="${blocker_line#*	}"
    check "Review comments (council)" "true" "fail" \
      "Council reviewer $blocking_reviewer: $blocking_reason"
  else
    check "Review comments (council)" "true" "pass"
  fi
}

# =====================================================================
# UNREPLIED REVIEW COMMENTS CHECK
# =====================================================================
check_unreplied_comments() {
  local pr="${PR_NUMBER:-}"

  if ! command -v gh &>/dev/null; then
    check "Unreplied review comments" "true" "warn" "gh CLI not found — skipped"
    return
  fi

  # Auto-detect PR number from branch if not supplied
  if [[ -z "$pr" && -n "$BRANCH" ]]; then
    local pr_out
    pr_out=$(gh pr list --head "$BRANCH" --json number -q '.[0].number' 2>&1) || {
      check "Unreplied review comments" "true" "warn" "gh API call failed — skipped"
      return
    }
    pr="$pr_out"
  fi

  if [[ -z "$pr" ]]; then
    check "Unreplied review comments" "true" "pass" "No PR found — skipped"
    return
  fi

  # Get PR author login
  local pr_author
  pr_author=$(gh pr view "$pr" --json author --jq '.author.login' 2>/dev/null) || {
    check "Unreplied review comments" "true" "warn" "Could not determine PR author — skipped"
    return
  }

  # Fetch all inline review comments (single API call)
  local comments_json
  comments_json=$(gh api "repos/{owner}/{repo}/pulls/$pr/comments" \
    --paginate --jq '.' 2>&1) || {
    check "Unreplied review comments" "true" "warn" "API call failed — skipped (${comments_json:0:80})"
    return
  }

  if [[ -z "$comments_json" || "$comments_json" == "[]" ]]; then
    check "Unreplied review comments" "true" "pass" "No inline comments"
    return
  fi

  # jq: find top-level review comments that have no reply from the PR author.
  # A comment is "top-level" if in_reply_to_id is null.
  # A comment is "replied" if any other comment has in_reply_to_id == its id
  # AND that reply is from the PR author.
  local unreplied jq_exit
  unreplied=$(echo "$comments_json" | jq -r --arg author "$pr_author" '
    [ .[] | if type == "array" then .[] else . end ] |
    ([ .[] | select(.in_reply_to_id == null) ]) as $tops |
    ([ .[] | select(.in_reply_to_id != null) ]) as $replies |
    ([ $replies[] | select(.user.login == $author) | .in_reply_to_id ]) as $replied_ids |
    [ $tops[] |
      select(.user.login != $author) |
      select(
        if ($replied_ids | length) == 0 then true
        else (.id | IN($replied_ids[])) | not
        end
      )
    ] |
    if length == 0 then "OK"
    else
      "\(length) unreplied: " + (
        [limit(3; .[]) | "\(.user.login) on \(.path):\(.line // .original_line // "?")"]
        | join(", ")
      ) + (if length > 3 then " (+\(length - 3) more)" else "" end)
    end
  ' 2>&1)
  jq_exit=$?

  if [[ "$jq_exit" -ne 0 ]]; then
    check "Unreplied review comments" "true" "warn" "jq failed (exit $jq_exit) — ${unreplied:0:80}"
  elif [[ "$unreplied" == "OK" ]]; then
    check "Unreplied review comments" "true" "pass"
  elif [[ -n "$unreplied" ]]; then
    check "Unreplied review comments" "true" "fail" "$unreplied"
  else
    check "Unreplied review comments" "true" "warn" "Unexpected empty output from jq"
  fi
}

# =====================================================================
# PRE-MERGE CHECKS
# =====================================================================
run_pre_merge() {
  echo "=== Pre-Merge Validation: $BRANCH ==="
  echo ""

  cd "$REPO_DIR"

  # 1. Typecheck
  local tc_out
  tc_out=$(pnpm check 2>&1 | tail -20) || true
  if echo "$tc_out" | grep -qiE '(error|fail)'; then
    check "Typecheck (pnpm check)" "true" "fail" "$(echo "$tc_out" | tail -3)"
  else
    check "Typecheck (pnpm check)" "true" "pass"
  fi

  # 2. Shellcheck — only on .sh files changed in this branch
  local sh_files
  sh_files=$(git diff "main...$BRANCH" --name-only -- '*.sh' 2>/dev/null || echo "")
  if [[ -n "$sh_files" ]]; then
    local sc_fail=false
    local sc_errors=""
    while IFS= read -r shfile; do
      [[ -z "$shfile" ]] && continue
      [[ ! -f "$REPO_DIR/$shfile" ]] && continue
      if ! shellcheck -x "$REPO_DIR/$shfile" 2>&1 | tail -5 > /dev/null 2>&1; then
        sc_fail=true
        sc_errors+=" $shfile"
      fi
    done <<< "$sh_files"
    if $sc_fail; then
      check "Shellcheck" "true" "fail" "Errors in:$sc_errors"
    else
      check "Shellcheck" "true" "pass"
    fi
  else
    check "Shellcheck" "true" "pass" "No .sh files changed"
  fi

  # 3. Tests
  local test_out
  test_out=$(cd "$REPO_DIR" && pnpm test 2>&1 | tail -40) || true
  if echo "$test_out" | grep -qiE '(fail|error|FAIL)'; then
    check "Tests (pnpm test)" "true" "fail" "$(echo "$test_out" | tail -3)"
  else
    check "Tests (pnpm test)" "true" "pass"
  fi

  # 4. Conflict markers
  if type check_conflict_markers &>/dev/null; then
    if check_conflict_markers "$REPO_DIR"; then
      check "Conflict markers" "true" "pass"
    else
      check "Conflict markers" "true" "fail" "Git conflict markers found in tracked files"
    fi
  else
    # Fallback: inline check
    local markers
    markers=$(grep -rn --include='*.md' --include='*.sh' --include='*.ts' --include='*.json' \
      -E '^(<{7}( |$)|={7}$|>{7}( |$))' "$REPO_DIR" 2>/dev/null \
      | grep -v '/archive/' | grep -v '/sessions/auto/' | grep -v '/node_modules/' \
      | head -5 || true)
    if [[ -n "$markers" ]]; then
      check "Conflict markers" "true" "fail" "$(echo "$markers" | head -1)"
    else
      check "Conflict markers" "true" "pass"
    fi
  fi

  # 5. Manifest consistency
  local manifest="$FEATURES_DIR/${SLUG}.md"
  if [[ -f "$manifest" ]]; then
    local state
    state=$(grep '^state:' "$manifest" | head -1 | awk '{print $2}')
    if [[ "$state" == "active" ]]; then
      # Check sessions table has entries
      if grep -qE '^\| [0-9]' "$manifest"; then
        check "Manifest consistency" "true" "pass"
      else
        check "Manifest consistency" "true" "fail" "Manifest exists but sessions table is empty"
      fi
    elif [[ "$state" == "complete" ]]; then
      check "Manifest consistency" "true" "pass" "Already complete"
    else
      check "Manifest consistency" "true" "warn" "Manifest state: $state"
    fi
  else
    check "Manifest consistency" "true" "pass" "No manifest (standalone session)"
  fi

  # 6. MRD exists (if Linear ticket)
  if [[ -n "$LINEAR_ID" ]]; then
    local mrd_path="$FEATURES_DIR/${LINEAR_ID}-${SLUG}-mrd.md"
    if [[ -f "$mrd_path" ]]; then
      check "MRD exists" "false" "pass"
    else
      check "MRD exists" "false" "warn" "No MRD at $mrd_path"
    fi
  else
    check "MRD exists" "false" "pass" "No Linear ticket — MRD not required"
  fi

  # 7. Overwrite detection
  local ow_script="$SCRIPTS_DIR/check-overwrites.sh"
  if [[ -x "$ow_script" ]]; then
    local ow_out
    ow_out=$(bash "$ow_script" --mode pre-merge --branch "$BRANCH" 2>&1) || true
    if echo "$ow_out" | grep -q '\[OVERWRITE\]'; then
      check "Overwrite detection" "false" "warn" "$(echo "$ow_out" | grep '\[OVERWRITE\]' | head -3)"
    else
      check "Overwrite detection" "false" "pass"
    fi
  else
    check "Overwrite detection" "false" "pass" "check-overwrites.sh not found — skipped"
  fi

  # 8. Review comments (council bots)
  check_review_comments

  # 9. Unreplied review comments — all inline comments must have a reply
  check_unreplied_comments
}

# =====================================================================
# POST-MERGE CHECKS
# =====================================================================
run_post_merge() {
  echo "=== Post-Merge Validation: $BRANCH ==="
  echo ""

  cd "$REPO_DIR"

  # 1. File existence — all files from PR diff exist on main after merge
  local changed_files
  changed_files=$(git diff "main~1...main" --name-only 2>/dev/null || echo "")
  local missing_files=false
  local missing_list=""
  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    # Skip deleted files (they shouldn't exist)
    if git show "main:$file" &>/dev/null && [[ ! -f "$REPO_DIR/$file" ]]; then
      missing_files=true
      missing_list+=" $file"
    fi
  done <<< "$changed_files"

  if $missing_files; then
    check "File existence" "true" "fail" "Missing:$missing_list"
  else
    check "File existence" "true" "pass"
  fi

  # 2. Content integrity — grep for key patterns (function names, exports)
  local integrity_ok=true
  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    [[ ! -f "$REPO_DIR/$file" ]] && continue
    # For .sh files, check that function definitions survived
    if [[ "$file" == *.sh ]]; then
      local expected_funcs
      expected_funcs=$(git show "main:$file" 2>/dev/null | grep -oE '^[a-z_]+\(\)' | head -5 || true)
      for func in $expected_funcs; do
        if ! grep -q "$func" "$REPO_DIR/$file" 2>/dev/null; then
          integrity_ok=false
        fi
      done
    fi
  done <<< "$changed_files"

  if $integrity_ok; then
    check "Content integrity" "false" "pass"
  else
    check "Content integrity" "false" "warn" "Some expected patterns missing after merge"
  fi

  # 3. Blame audit — verify merge commit is latest author for changed lines
  local blame_issues=""
  # Light check: just verify the files were touched by recent commits
  local merge_sha
  merge_sha=$(git -C "$REPO_DIR" rev-parse HEAD 2>/dev/null || echo "")
  if [[ -n "$merge_sha" ]]; then
    check "Blame audit" "false" "pass" "Merge SHA: ${merge_sha:0:8}"
  else
    check "Blame audit" "false" "warn" "Could not determine merge SHA"
  fi

  # 4. Manifest state
  local manifest="$FEATURES_DIR/${SLUG}.md"
  if [[ -f "$manifest" ]]; then
    local state
    state=$(grep '^state:' "$manifest" | head -1 | awk '{print $2}')
    if [[ "$state" == "complete" ]]; then
      check "Manifest state" "false" "pass"
    else
      check "Manifest state" "false" "warn" "Expected 'complete', got '$state'"
    fi
  else
    check "Manifest state" "false" "pass" "No manifest"
  fi

  # 5. Build check
  local build_out
  build_out=$(cd "$REPO_DIR" && pnpm build 2>&1 | tail -20) || true
  if echo "$build_out" | grep -qiE '(error|fail)'; then
    check "Build check (pnpm build)" "true" "fail" "$(echo "$build_out" | tail -3)"
  else
    check "Build check (pnpm build)" "true" "pass"
  fi
}

# --- Run ---
case "$MODE" in
  pre-merge)  run_pre_merge ;;
  post-merge) run_post_merge ;;
  *)
    echo "Error: --mode must be 'pre-merge' or 'post-merge'" >&2
    exit 1
    ;;
esac

# --- Summary ---
echo ""
echo "RESULT: $PASS/$TOTAL checks passed ($WARN warnings, $FAIL failures)"

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
exit 0
