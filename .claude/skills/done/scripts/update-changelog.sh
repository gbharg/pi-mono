#!/usr/bin/env bash
# update-changelog.sh — Append a PR entry to AGENTS-CHANGELOG.md
#
# Usage:
#   update-changelog.sh <pr_number> <pr_title> [branch_name]
#
# The category is inferred from the branch name or PR title prefix:
#   feat/*    → Features
#   fix/*     → Fixes
#   refactor/* → Refactors
#   chore/*   → Infrastructure
#   infra/*   → Infrastructure
#
# Also handles agent-prefixed branches (codex/feat-*, claude/fix-*, gemini/refactor-*).
#
# Memory branches (memory/*, memory-*, */memory-*) are skipped.
# PRs with memory() in the title are also skipped.

set -euo pipefail

CHANGELOG="${OPENCLAW_HOME:-$HOME/openclaw}/AGENTS-CHANGELOG.md"

PR_NUMBER="${1:-}"
PR_TITLE="${2:-}"
BRANCH="${3:-}"

if [[ -z "$PR_NUMBER" || -z "$PR_TITLE" ]]; then
  echo "Usage: update-changelog.sh <pr_number> <pr_title> [branch_name]" >&2
  exit 1
fi

# Skip memory-only PRs (branch or title)
# Handles: memory/*, memory-*, codex/memory-*, claude/memory-*, gemini/memory-*
if [[ "$BRANCH" == memory/* || "$BRANCH" == memory-* || "$BRANCH" == */memory-* || "$BRANCH" == */memory/* \
   || "$PR_TITLE" == memory\(* || "$PR_TITLE" == memory:* || "$PR_TITLE" == "chore(memory)"* ]]; then
  echo "Skipping memory PR — no changelog entry needed."
  exit 0
fi

# Ensure changelog exists with header
if [[ ! -f "$CHANGELOG" ]]; then
  cat > "$CHANGELOG" <<'HEADER'
# Agents Changelog

Private fork changelog for [`gbharg/agents`](https://github.com/gbharg/agents). Tracks features, fixes, and infrastructure changes made in this fork.

Upstream product changelog: [`CHANGELOG.md`](./CHANGELOG.md)

---
HEADER
fi

# Delegate all insertion logic to Python for reliable text manipulation
python3 - "$CHANGELOG" "$PR_NUMBER" "$PR_TITLE" "$BRANCH" <<'PYEOF'
import sys
import re
from datetime import date

changelog_path = sys.argv[1]
pr_number = sys.argv[2]
pr_title = sys.argv[3]
branch = sys.argv[4]

today = date.today().isoformat()

# Detect category from branch, then title
def detect_category(branch: str, title: str) -> str:
    # Direct branch-based (feat/*, fix/*, etc.)
    if branch.startswith(("feat/", "feature/")):
        return "Features"
    if branch.startswith("fix/"):
        return "Fixes"
    if branch.startswith("refactor/"):
        return "Refactors"
    if branch.startswith(("chore/", "infra/")):
        return "Infrastructure"

    # Agent-prefixed branches (codex/feat-*, claude/fix-*, gemini/refactor-*)
    agent_match = re.match(r"^(?:codex|claude|gemini)/(\w+)", branch)
    if agent_match:
        sub = agent_match.group(1)
        agent_map = {
            "feat": "Features", "feature": "Features",
            "fix": "Fixes",
            "refactor": "Refactors",
            "chore": "Infrastructure", "infra": "Infrastructure",
        }
        if sub in agent_map:
            return agent_map[sub]
        # Check if sub starts with a known prefix (e.g., codex/feat-something)
        for prefix, cat in agent_map.items():
            if sub.startswith(prefix):
                return cat

    # Title-based (conventional commit)
    m = re.match(r"^(feat|fix|refactor|chore|infra)(\([^)]*\))?:", title)
    if m:
        prefix = m.group(1)
        return {
            "feat": "Features",
            "fix": "Fixes",
            "refactor": "Refactors",
            "chore": "Infrastructure",
            "infra": "Infrastructure",
        }.get(prefix, "Changes")

    return "Changes"

# Strip conventional commit prefix
def clean_title(title: str) -> str:
    return re.sub(r"^(feat|fix|refactor|chore|infra)(\([^)]*\))?:\s*", "", title).strip()

category = detect_category(branch, pr_title)
clean = clean_title(pr_title)
entry = f"- {clean} (#{pr_number})"

with open(changelog_path) as f:
    content = f.read()

lines = content.split("\n")

# Find date sections: list of (line_index, date_string)
date_sections = []
for i, line in enumerate(lines):
    m = re.match(r"^## (\d{4}-\d{2}-\d{2})$", line)
    if m:
        date_sections.append((i, m.group(1)))

# Find or create today's section
today_idx = None
for i, (line_idx, d) in enumerate(date_sections):
    if d == today:
        today_idx = line_idx
        break

if today_idx is None:
    # Insert new date section at the top (after ---)
    separator_idx = None
    for i, line in enumerate(lines):
        if line.strip() == "---":
            separator_idx = i
            break

    if separator_idx is not None:
        insert_pos = separator_idx + 1
    elif date_sections:
        insert_pos = date_sections[0][0]
    else:
        insert_pos = len(lines)

    new_block = ["", f"## {today}", "", f"### {category}", "", entry]
    for j, item in enumerate(new_block):
        lines.insert(insert_pos + j, item)

    with open(changelog_path, "w") as f:
        f.write("\n".join(lines))
    print(f"Created new section for {today} with {category}.")
    print(f"Changelog updated: {entry}")
    sys.exit(0)

# Today's section exists — find its boundaries
today_end = len(lines)
for line_idx, d in date_sections:
    if line_idx > today_idx:
        today_end = line_idx
        break

# Look for the category within today's section
cat_header = f"### {category}"
cat_idx = None
for i in range(today_idx, today_end):
    if lines[i].strip() == cat_header:
        cat_idx = i
        break

if cat_idx is not None:
    # Find last bullet in this category subsection
    last_bullet = None
    for i in range(cat_idx + 1, today_end):
        if lines[i].startswith("### ") or lines[i].startswith("## "):
            break
        if lines[i].startswith("- "):
            last_bullet = i

    if last_bullet is not None:
        lines.insert(last_bullet + 1, entry)
        print(f"Entry added to existing {category} section.")
    else:
        # Category header exists but no bullets yet — add after header + blank line
        lines.insert(cat_idx + 2, entry)
        print(f"Entry added to {category} section.")
else:
    # Category doesn't exist — add before the next date section
    insert_pos = today_end
    new_block = [f"### {category}", "", entry, ""]
    for j, item in enumerate(new_block):
        lines.insert(insert_pos + j, item)
    print(f"Added new {category} section under {today}.")

with open(changelog_path, "w") as f:
    f.write("\n".join(lines))
print(f"Changelog updated: {entry}")
PYEOF
