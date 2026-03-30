# Git AI - Tracking AI-Generated Code

Git AI tracks AI-generated code and the conversations that produced it, enabling better collaboration and context restoration.

## Overview

Git AI automatically captures AI coding sessions (from Claude, Cursor, etc.) and stores them as Git notes. This allows you to:

- **Search** - Find AI conversations that produced specific code
- **Continue** - Restore AI session context to continue someone's work
- **Review** - Understand AI involvement in commits and PRs
- **Audit** - Track which code was AI-generated vs human-written

## Installation Status

✅ Git AI is already installed system-wide at `~/.git-ai/`  
✅ Configuration completed for pi-mono repository  
✅ Git notes rewriting enabled for seamless git operations

## Quick Start

### Search for AI Context

```bash
# Check if a commit has AI context
git-ai search --commit HEAD

# See AI context for specific lines
git-ai search --file packages/coding-agent/src/index.ts --lines 100-150

# Find all AI sessions that touched a file
git-ai search --file src/main.ts

# Full conversation details
git-ai search --commit abc1234 --verbose
```

### Continue Previous Work

```bash
# Continue from a commit's AI session
git-ai continue --commit abc1234

# Launch Claude with restored context
git-ai continue --commit abc1234 --launch

# Copy context to clipboard
git-ai continue --commit abc1234 --clipboard
```

### Review AI Involvement

```bash
# Check AI involvement in recent commits
git log --oneline -10 | while read sha msg; do
  count=$(git-ai search --commit $sha --count 2>/dev/null || echo "0")
  [ "$count" != "0" ] && echo "$sha ($count sessions): $msg"
done

# AI involvement in a PR
git-ai search --commit origin/main..HEAD
```

## Common Workflows

### 1. Understanding a Commit

When reviewing someone's commit:

```bash
# Quick summary
git-ai search --commit abc1234

# Full conversation
git-ai search --commit abc1234 --verbose

# Machine-readable
git-ai search --commit abc1234 --json | jq '.prompts[] | {tool, model, author}'
```

### 2. Picking Up Someone's Work

To continue where a teammate left off:

```bash
# See what they were working on
git-ai search --commit abc1234 --verbose

# Restore their context
git-ai continue --commit abc1234 --launch
```

### 3. PR Review Process

Check AI involvement before reviewing:

```bash
# Get all commits in current branch
BASE=$(git merge-base HEAD origin/main)
git-ai search --commit $BASE..HEAD

# Count AI sessions per commit
git log $BASE..HEAD --oneline | while read sha msg; do
  count=$(git-ai search --commit $sha --count 2>/dev/null || echo "0")
  echo "$sha: $count AI session(s)"
done
```

### 4. Debugging Code

When investigating a bug in specific lines:

```bash
# Find AI context for problematic lines
git-ai search --file src/parser.ts --lines 150-200

# See the full conversation that created it
PROMPT_ID=$(git-ai search --file src/parser.ts --lines 150-200 --porcelain | head -1)
git-ai show-prompt $PROMPT_ID
```

### 5. Auditing AI Usage

Track AI involvement across the project:

```bash
# AI sessions in last week
git log --since="1 week ago" --oneline | while read sha msg; do
  git-ai search --commit $sha --count 2>/dev/null
done | awk '{sum+=$1} END {print sum " total AI sessions"}'

# AI involvement by file
for file in $(git ls-files '*.ts'); do
  count=$(git-ai search --file "$file" --count 2>/dev/null || echo "0")
  [ "$count" != "0" ] && echo "$file: $count sessions"
done
```

## Command Reference

### git-ai search

Find AI prompt sessions by various criteria.

**Basic usage:**
```bash
git-ai search --commit <sha>           # Search by commit
git-ai search --file <path>            # Search by file
git-ai search --lines <range>          # Filter to specific lines (with --file)
git-ai search --pattern "keyword"      # Full-text search
```

**Filters:**
```bash
--author <name>     # Filter by human author
--tool <name>       # Filter by tool (claude, cursor, etc.)
--since <date>      # Only recent prompts
--until <date>      # Only older prompts
```

**Output formats:**
```bash
--json              # Full JSON output
--verbose           # Include full transcripts
--porcelain         # Machine-readable IDs only
--count             # Just the count
```

### git-ai continue

Restore AI session context for continuation.

**Basic usage:**
```bash
git-ai continue --commit <sha>         # Continue from commit
git-ai continue --file <path>          # Continue from file
git-ai continue --prompt-id <id>       # Continue specific prompt
```

**Output modes:**
```bash
--launch            # Spawn agent CLI with context
--clipboard         # Copy to clipboard
--json              # Structured JSON output
```

### git-ai show-prompt

View full transcript of a specific prompt.

```bash
git-ai show-prompt <prompt_id>
git-ai show-prompt <prompt_id> --json
```

## Integration with Pi Workflow

### Conventional Commits

Git AI integrates seamlessly with conventional commits:

```bash
# After AI session, commit with proper format
git commit -m "feat(coding-agent): add new tool PI-55"

# The AI context is automatically attached as git notes
git-ai search --commit HEAD
```

### Pre-commit Hooks

Git AI hooks run automatically (configured by husky):

```bash
# Hooks are in .husky/
# post-commit - Captures AI sessions
# post-rewrite - Updates notes after rebase/amend
```

### CI/CD Integration

Add AI tracking to your CI pipeline:

```bash
# In .github/workflows/ci.yml
- name: Check AI involvement
  run: |
    PROMPT_COUNT=$(git-ai search --commit ${{ github.sha }} --count || echo "0")
    echo "AI sessions in this commit: $PROMPT_COUNT"
```

## Configuration

### Repository Configuration

Git AI configuration is stored in `.git/config`:

```ini
[notes]
    rewrite = true          # Preserve notes during rebase
    rewriteRef = refs/notes/*
```

### Global Configuration

System-wide config at `~/.git-ai/config.json`:

```json
{
  "git_path": "/opt/homebrew/bin/git",
  "api_base_url": "https://usegitai.com"
}
```

## Best Practices

### 1. Regular Searches

When reviewing code, check for AI context:

```bash
# Add to your code review checklist
git-ai search --commit <pr-commit> --verbose
```

### 2. Context Restoration

Before making changes to AI-generated code:

```bash
# Understand the original intent
git-ai search --file <file> --lines <lines> --verbose
```

### 3. Team Communication

Reference AI sessions in PR descriptions:

```markdown
## AI Context

This PR includes AI-generated code. View context:
- Commit abc1234: `git-ai search --commit abc1234 --verbose`
- Prompt ID: xyz789
```

### 4. Documentation

When AI helps with complex logic:

```typescript
// AI-assisted implementation
// Context: git-ai show-prompt abc123
function complexAlgorithm() {
  // ...
}
```

## Troubleshooting

### No AI context found

```bash
# Ensure git-ai is in PATH
which git-ai

# Check git notes exist
git notes list

# Verify configuration
git config --get notes.rewrite
```

### Notes not preserved after rebase

```bash
# Re-enable notes rewriting
git config --local notes.rewrite.rebase true
git config --local notes.rewrite.amend true
```

### Large prompt history

```bash
# Limit output
git-ai search --commit HEAD --max-messages 10

# Use count first
git-ai search --file <file> --count
```

## Privacy and Security

- **Local only** - AI conversations stored as git notes (local by default)
- **Push control** - Use `git push origin refs/notes/*` to share notes
- **Sensitive data** - Review notes before pushing: `git notes show`
- **Cleanup** - Remove notes: `git notes remove`

## Advanced Usage

### Custom Scripts

Create shortcuts for common operations:

```bash
# ~/.zshrc or ~/.bashrc
alias ai-check='git-ai search --commit HEAD'
alias ai-review='git-ai search --commit origin/main..HEAD'

ai-blame() {
  git-ai search --file "$1" --lines "$2" --verbose
}
```

### JSON Processing

Extract specific information:

```bash
# Get all models used
git-ai search --commit HEAD~10..HEAD --json | \
  jq -r '.prompts[].model' | sort -u

# Find Claude sessions only
git-ai search --commit HEAD~10..HEAD --json | \
  jq '.prompts[] | select(.tool == "claude")'
```

### Integration with Other Tools

```bash
# Combine with gh CLI
gh pr view 123 --json commits -q '.commits[].oid' | \
  while read sha; do
    git-ai search --commit $sha
  done

# Combine with git blame
git blame -L 100,150 src/main.ts | \
  awk '{print $1}' | sort -u | \
  while read sha; do
    git-ai search --commit $sha
  done
```

## Resources

- **Git AI Skill**: `/Users/agent/.agents/skills/git-ai-search/SKILL.md`
- **Configuration**: `~/.git-ai/config.json`
- **Git Notes**: `man git-notes`
- **Linear Issue**: [PI-55](https://linear.app/gautambh/issue/PI-55)

## Support

For issues or questions:
1. Check the [git-ai-search skill documentation](/Users/agent/.agents/skills/git-ai-search/SKILL.md)
2. Review git notes: `git notes list`
3. Check configuration: `git-ai --version && git config --list | grep notes`
4. Create an issue on Linear with the `tooling` label
