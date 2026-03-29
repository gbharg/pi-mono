#!/bin/bash
# Validates .pi/ directory structure
# Run as pre-commit hook or GitHub Action

ERRORS=0
PI_DIR=".pi"

# Check required directories exist
for dir in memory projects docs; do
  if [ ! -d "$PI_DIR/$dir" ]; then
    echo "ERROR: Missing required directory $PI_DIR/$dir"
    ERRORS=$((ERRORS + 1))
  fi
done

# Check required memory files
for file in pi.md gautam.md preferences.md learnings.md todo.md changelog.md eod-checklist.md; do
  if [ ! -f "$PI_DIR/memory/$file" ]; then
    echo "ERROR: Missing required memory file $PI_DIR/memory/$file"
    ERRORS=$((ERRORS + 1))
  fi
done

# Check project index exists
if [ ! -f "$PI_DIR/projects/index.md" ]; then
  echo "ERROR: Missing project index $PI_DIR/projects/index.md"
  ERRORS=$((ERRORS + 1))
fi

# Check each project folder has required files
for project_dir in "$PI_DIR"/projects/*/; do
  [ -d "$project_dir" ] || continue
  project=$(basename "$project_dir")
  
  for file in state.md context.md; do
    if [ ! -f "$project_dir/$file" ]; then
      echo "ERROR: Project '$project' missing required file $file"
      ERRORS=$((ERRORS + 1))
    fi
  done
  
  # Check state.md has frontmatter
  if [ -f "$project_dir/state.md" ]; then
    if ! head -1 "$project_dir/state.md" | grep -q "^---"; then
      echo "WARNING: Project '$project' state.md missing YAML frontmatter"
    fi
  fi
  
  # Check sessions directory exists
  if [ ! -d "$project_dir/sessions" ]; then
    echo "WARNING: Project '$project' missing sessions/ directory"
  fi
done

# Check README exists
if [ ! -f "$PI_DIR/README.md" ]; then
  echo "WARNING: Missing $PI_DIR/README.md directory index"
fi

# Check no credentials in tracked files
if git ls-files "$PI_DIR" | xargs grep -l "lin_api_\|sb-api-secret\|SENDBLUE_API_SECRET" 2>/dev/null; then
  echo "ERROR: Credentials found in tracked files!"
  ERRORS=$((ERRORS + 1))
fi

if [ $ERRORS -gt 0 ]; then
  echo ""
  echo "FAILED: $ERRORS errors found"
  exit 1
else
  echo "OK: .pi/ structure valid"
  exit 0
fi
