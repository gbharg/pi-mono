# Git AI Quick Reference

One-page reference for common Git AI commands.

## Search for AI Context

```bash
# Check a commit
git-ai search --commit HEAD
git-ai search --commit abc1234

# Check specific code
git-ai search --file src/main.ts
git-ai search --file src/main.ts --lines 100-150

# Full conversation
git-ai search --commit abc1234 --verbose

# Just count
git-ai search --commit HEAD --count
```

## Continue Work

```bash
# Restore context to terminal
git-ai continue --commit abc1234

# Launch Claude with context
git-ai continue --commit abc1234 --launch

# Copy to clipboard
git-ai continue --commit abc1234 --clipboard
```

## Review PRs

```bash
# Check AI involvement in branch
git-ai search --commit origin/main..HEAD

# Count sessions per commit
git log origin/main..HEAD --oneline | while read sha msg; do
  count=$(git-ai search --commit $sha --count 2>/dev/null || echo "0")
  [ "$count" != "0" ] && echo "$sha: $count sessions"
done
```

## Filters

```bash
# By author
git-ai search --commit HEAD --author "Alice"

# By tool
git-ai search --commit HEAD --tool claude

# By date
git-ai search --commit HEAD --since 7d
```

## Output Formats

```bash
--json              # Full JSON
--verbose           # Include conversations
--porcelain         # Just IDs
--count             # Just the number
```

## Common Workflows

### Understand a commit
```bash
git show abc1234              # See the code
git-ai search --commit abc1234 --verbose  # See the AI context
```

### Pick up someone's work
```bash
git-ai search --commit abc1234 --verbose  # Review their session
git-ai continue --commit abc1234 --launch # Continue with Claude
```

### Debug problematic code
```bash
git blame src/main.ts -L 100,150  # Find responsible commit
git-ai search --commit <sha> --verbose  # See AI context
```

### Audit AI usage
```bash
# Recent AI sessions
git log --since="1 week ago" --oneline | \
  while read sha _; do git-ai search --commit $sha --count 2>/dev/null; done | \
  awk '{sum+=$1} END {print sum " total sessions"}'
```

## Aliases (add to .zshrc)

```bash
alias ai-check='git-ai search --commit HEAD'
alias ai-review='git-ai search --commit origin/main..HEAD'
alias ai-last='git-ai search --commit HEAD --verbose'
```

## Full Documentation

See [GIT_AI.md](GIT_AI.md) for complete documentation and advanced usage.
