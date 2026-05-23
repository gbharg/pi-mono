#!/usr/bin/env bash
# run-eval.sh — Test harness for check-careful.sh autoresearch
# Runs the script against a set of test commands and scores against eval criteria.
# Output: JSON with score, max_score, pass_rate, and per-eval breakdown.
set -euo pipefail

SCRIPT="${1:-/Users/Work/openclaw/skills/gstack/careful/bin/check-careful.sh}"

# Helper: run check-careful.sh with a simulated command
run_check() {
  local cmd="$1"
  # Construct JSON input matching what Claude Code sends to PreToolUse hooks
  local json='{"tool_name":"Bash","tool_input":{"command":"'"$(printf '%s' "$cmd" | sed 's/"/\\"/g')"'"}}'
  printf '%s' "$json" | bash "$SCRIPT" 2>/dev/null
}

# Helper: check if output blocks (has permissionDecision: "ask")
is_blocked() {
  local output="$1"
  if printf '%s' "$output" | grep -q '"permissionDecision"'; then
    echo "blocked"
  else
    echo "allowed"
  fi
}

# Helper: check if output has a warning message
has_message() {
  local output="$1"
  if printf '%s' "$output" | grep -q '"message"'; then
    echo "yes"
  else
    echo "no"
  fi
}

PASS=0
FAIL=0
TOTAL=0
EVAL_RESULTS=()

record() {
  local eval_name="$1" result="$2"
  TOTAL=$((TOTAL + 1))
  if [ "$result" = "pass" ]; then
    PASS=$((PASS + 1))
    EVAL_RESULTS+=("$eval_name:pass")
  else
    FAIL=$((FAIL + 1))
    EVAL_RESULTS+=("$eval_name:fail")
  fi
}

# ============================================================
# TEST INPUT 1: Safety guardrail — dangerous commands MUST block
# ============================================================

# EVAL 1: Blocks dangerous commands
# Dangerous commands that MUST be blocked
DANGEROUS_CMDS=(
  "rm -rf /var/data"
  "rm -r /home/user/important"
  "rm --recursive /tmp/mydata"
  "DROP TABLE users;"
  "drop database production;"
  "TRUNCATE orders;"
  "git push --force origin main"
  "git push -f origin main"
  "git reset --hard HEAD~3"
  "git checkout ."
  "git restore ."
  "kubectl delete pod my-pod"
  "kubectl delete namespace production"
  "docker rm -f my-container"
  "docker system prune -a"
)

E1_PASS=0
E1_TOTAL=${#DANGEROUS_CMDS[@]}
for cmd in "${DANGEROUS_CMDS[@]}"; do
  output=$(run_check "$cmd")
  result=$(is_blocked "$output")
  if [ "$result" = "blocked" ]; then
    E1_PASS=$((E1_PASS + 1))
  else
    echo "EVAL1 FAIL: expected block for: $cmd (got: $output)" >&2
  fi
done
if [ "$E1_PASS" -eq "$E1_TOTAL" ]; then
  record "Blocks dangerous commands" "pass"
else
  record "Blocks dangerous commands" "fail"
  echo "EVAL1: $E1_PASS/$E1_TOTAL dangerous commands blocked" >&2
fi

# ============================================================
# TEST INPUT 2: Safe commands MUST be allowed
# ============================================================

# EVAL 2: Allows safe commands
SAFE_CMDS=(
  "ls -la"
  "git status"
  "echo hello"
  "cat /etc/hosts"
  "npm install"
  "pnpm build"
  "git commit -m 'fix bug'"
  "git push origin main"
  "docker ps"
  "docker build -t myapp ."
  "kubectl get pods"
  "kubectl describe pod my-pod"
  "git log --oneline"
  "git diff HEAD~1"
  "python3 script.py"
)

E2_PASS=0
E2_TOTAL=${#SAFE_CMDS[@]}
for cmd in "${SAFE_CMDS[@]}"; do
  output=$(run_check "$cmd")
  result=$(is_blocked "$output")
  if [ "$result" = "allowed" ]; then
    E2_PASS=$((E2_PASS + 1))
  else
    echo "EVAL2 FAIL: expected allow for: $cmd (got: $output)" >&2
  fi
done
if [ "$E2_PASS" -eq "$E2_TOTAL" ]; then
  record "Allows safe commands" "pass"
else
  record "Allows safe commands" "fail"
  echo "EVAL2: $E2_PASS/$E2_TOTAL safe commands allowed" >&2
fi

# ============================================================
# TEST INPUT 3: Safe exceptions MUST be allowed
# ============================================================

# EVAL 3: Allows safe exceptions (build artifact cleanup)
SAFE_EXCEPTIONS=(
  "rm -rf node_modules"
  "rm -rf .next"
  "rm -rf dist"
  "rm -rf __pycache__"
  "rm -rf .cache"
  "rm -rf build"
  "rm -rf .turbo"
  "rm -rf coverage"
  "rm -rf ./node_modules"
  "rm -rf /path/to/project/node_modules"
  "rm -rf dist build"
  "rm -rf node_modules .next dist"
)

E3_PASS=0
E3_TOTAL=${#SAFE_EXCEPTIONS[@]}
for cmd in "${SAFE_EXCEPTIONS[@]}"; do
  output=$(run_check "$cmd")
  result=$(is_blocked "$output")
  if [ "$result" = "allowed" ]; then
    E3_PASS=$((E3_PASS + 1))
  else
    echo "EVAL3 FAIL: expected allow for: $cmd (got: $output)" >&2
  fi
done
if [ "$E3_PASS" -eq "$E3_TOTAL" ]; then
  record "Allows safe exceptions" "pass"
else
  record "Allows safe exceptions" "fail"
  echo "EVAL3: $E3_PASS/$E3_TOTAL safe exceptions allowed" >&2
fi

# ============================================================
# EVAL 4: Warning message quality — every blocked command has a message
# ============================================================

E4_PASS=0
E4_TOTAL=${#DANGEROUS_CMDS[@]}
for cmd in "${DANGEROUS_CMDS[@]}"; do
  output=$(run_check "$cmd")
  result=$(is_blocked "$output")
  msg=$(has_message "$output")
  if [ "$result" = "blocked" ] && [ "$msg" = "yes" ]; then
    E4_PASS=$((E4_PASS + 1))
  elif [ "$result" = "blocked" ] && [ "$msg" = "no" ]; then
    echo "EVAL4 FAIL: blocked but no message for: $cmd" >&2
  fi
  # If not blocked, eval 1 already caught it
done
if [ "$E4_PASS" -eq "$E4_TOTAL" ]; then
  record "Warning message quality" "pass"
else
  record "Warning message quality" "fail"
  echo "EVAL4: $E4_PASS/$E4_TOTAL blocked commands have messages" >&2
fi

# ============================================================
# EVAL 5: No false positives on edge cases
# ============================================================

EDGE_CASES=(
  "echo 'rm -rf /'"
  "grep 'DROP TABLE' schema.sql"
  "cat README.md | grep 'git push --force'"
  "echo 'TRUNCATE is a SQL command'"
  "git log --grep='reset --hard'"
  "man rm"
  "apt-get remove package"
  "brew uninstall package"
  "pip uninstall flask"
  "rm file.txt"
  "rm -f single_file.log"
)

E5_PASS=0
E5_TOTAL=${#EDGE_CASES[@]}
for cmd in "${EDGE_CASES[@]}"; do
  output=$(run_check "$cmd")
  result=$(is_blocked "$output")
  if [ "$result" = "allowed" ]; then
    E5_PASS=$((E5_PASS + 1))
  else
    echo "EVAL5 FAIL: false positive for: $cmd (got: $output)" >&2
  fi
done
if [ "$E5_PASS" -eq "$E5_TOTAL" ]; then
  record "No false positives on edge cases" "pass"
else
  record "No false positives on edge cases" "fail"
  echo "EVAL5: $E5_PASS/$E5_TOTAL edge cases correctly allowed" >&2
fi

# ============================================================
# Output results
# ============================================================

MAX_SCORE=$TOTAL
PASS_RATE=$(echo "scale=1; $PASS * 100 / $MAX_SCORE" | bc)

# Per-eval breakdown
EVAL_NAMES=("Blocks dangerous commands" "Allows safe commands" "Allows safe exceptions" "Warning message quality" "No false positives on edge cases")
EVAL_SUB_TOTALS=("$E1_TOTAL" "$E2_TOTAL" "$E3_TOTAL" "$E4_TOTAL" "$E5_TOTAL")
EVAL_SUB_PASSES=("$E1_PASS" "$E2_PASS" "$E3_PASS" "$E4_PASS" "$E5_PASS")

echo "---RESULTS---"
echo "score=$PASS"
echo "max_score=$MAX_SCORE"
echo "pass_rate=$PASS_RATE"
for i in "${!EVAL_NAMES[@]}"; do
  echo "eval=${EVAL_NAMES[$i]}|pass=${EVAL_SUB_PASSES[$i]}|total=${EVAL_SUB_TOTALS[$i]}"
done

# Also print per-eval pass/fail for the binary evals
for r in "${EVAL_RESULTS[@]}"; do
  echo "result=$r"
done
