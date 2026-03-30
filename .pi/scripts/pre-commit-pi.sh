#!/bin/bash
# Pre-commit check for .pi/ directory
# Validates structure and enforces growth budgets
# Called by the main pre-commit hook or manually

PI_DIR=".pi"
ERRORS=0

# Only run if .pi/ files are staged
STAGED_PI=$(git diff --cached --name-only -- "$PI_DIR/" 2>/dev/null)
if [ -z "$STAGED_PI" ]; then
  exit 0
fi

# Structure validation
if ! "$PI_DIR/scripts/validate-structure.sh" > /dev/null 2>&1; then
  echo "❌ .pi/ structure validation failed"
  ERRORS=$((ERRORS + 1))
fi

# Growth budgets (line limits)
check_lines() {
  local file="$1"
  local max="$2"
  local name="$3"
  if [ -f "$file" ]; then
    local lines=$(wc -l < "$file" | tr -d ' ')
    if [ "$lines" -gt "$max" ]; then
      echo "❌ $name has $lines lines (max $max). Archive older entries."
      ERRORS=$((ERRORS + 1))
    fi
  fi
}

check_lines "$PI_DIR/memory/learnings.md" 200 "learnings.md"
check_lines "$PI_DIR/memory/todo.md" 100 "todo.md"
check_lines "$PI_DIR/memory/changelog.md" 300 "changelog.md"

# Check no oversized files
for f in $STAGED_PI; do
  if [ -f "$f" ]; then
    size=$(wc -c < "$f" | tr -d ' ')
    if [ "$size" -gt 51200 ]; then  # 50KB
      echo "❌ $f is $(($size / 1024))KB (max 50KB)"
      ERRORS=$((ERRORS + 1))
    fi
  fi
done

if [ $ERRORS -gt 0 ]; then
  echo ""
  echo "Pi pre-commit: $ERRORS issue(s) found"
  exit 1
fi
