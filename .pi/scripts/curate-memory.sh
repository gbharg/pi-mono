#!/bin/bash
# Auto-curate memory files — archive entries beyond line limits
# Run weekly or when pre-commit rejects oversized files

PI_DIR="/Users/agent/pi-mono/.pi"
ARCHIVE_DIR="$PI_DIR/memory/archive"
mkdir -p "$ARCHIVE_DIR"
DATE=$(date +%Y-%m)

curate_file() {
  local file="$1"
  local max_lines="$2"
  local name=$(basename "$file" .md)
  
  if [ ! -f "$file" ]; then return; fi
  
  local lines=$(wc -l < "$file" | tr -d ' ')
  if [ "$lines" -le "$max_lines" ]; then
    echo "  ✓ $name: $lines lines (limit $max_lines)"
    return
  fi
  
  echo "  ↻ $name: $lines lines → archiving to keep $max_lines"
  
  # Archive the excess (older entries at the top)
  local archive_file="$ARCHIVE_DIR/${name}-${DATE}.md"
  local keep_from=$((lines - max_lines + 1))
  
  # Append overflow to archive
  head -n $((keep_from - 1)) "$file" >> "$archive_file"
  
  # Keep only the recent entries
  tail -n "$max_lines" "$file" > "$file.tmp"
  mv "$file.tmp" "$file"
  
  echo "  ✓ Archived $(($lines - $max_lines)) lines to $archive_file"
}

echo "Memory curation — $(date)"
curate_file "$PI_DIR/memory/learnings.md" 200
curate_file "$PI_DIR/memory/todo.md" 100
curate_file "$PI_DIR/memory/changelog.md" 300
echo "Done."
