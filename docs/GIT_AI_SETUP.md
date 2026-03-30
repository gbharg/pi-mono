# Git AI Setup Guide

Complete setup instructions for Git AI in the pi-mono repository.

## Current Status

✅ **Git AI is fully configured for this repository**

- Git AI binary installed at `~/.git-ai/` and `/Users/agent/.local/bin/git-ai`
- Repository configured with git notes rewriting
- Git hooks installed for automatic tracking
- Documentation created

## What is Git AI?

Git AI tracks AI-generated code and the conversations that produced it. It:
- Automatically captures AI coding sessions (Claude, Cursor, etc.)
- Stores conversations as Git notes (not in commit history)
- Enables searching and restoring AI context
- Helps with code review and collaboration

## For New Team Members

### Quick Verification

Check if Git AI is working:

```bash
cd pi-mono
git-ai --version
git-ai search --commit HEAD --count
```

If you get "command not found", Git AI needs to be installed on your machine.

### Installation (if needed)

```bash
# macOS (Homebrew)
brew install git-ai

# Or download from https://usegitai.com
```

### Repository Setup

The repository is already configured, but verify:

```bash
cd pi-mono

# Check git notes configuration
git config --get notes.rewrite.rebase  # Should be: true

# Ensure hooks are installed
git-ai git-hooks ensure
```

## How It Works

### Automatic Tracking

Git AI automatically tracks AI sessions when you:
1. Use Claude Code (pi CLI)
2. Use Cursor
3. Use other supported AI tools

The tracking happens via git hooks that run after commits.

### Git Notes Storage

AI conversations are stored as git notes:
- **Local by default** - Not pushed unless you explicitly push notes
- **Not in commit history** - Doesn't affect commit SHAs
- **Preserved during rebase** - Configuration ensures notes follow commits

### Sharing Notes (Optional)

To share AI context with team:

```bash
# Push notes to remote
git push origin refs/notes/*

# Pull notes from remote
git fetch origin refs/notes/*:refs/notes/*
```

## Configuration Details

### Repository Config

Located in `.git/config`:

```ini
[notes]
    rewrite = true
    rewriteRef = refs/notes/*

[notes "rewrite"]
    rebase = true
    amend = true
```

These settings ensure git notes are preserved during git operations like rebase and amend.

### Global Config

System-wide configuration at `~/.git-ai/config.json`:

```json
{
  "git_path": "/opt/homebrew/bin/git",
  "api_base_url": "https://usegitai.com"
}
```

## Usage Examples

### Basic Search

```bash
# Check if current commit has AI context
git-ai search --commit HEAD

# View full conversation
git-ai search --commit HEAD --verbose

# Check a specific file
git-ai search --file packages/coding-agent/src/index.ts
```

### Continue Previous Work

```bash
# Restore context from a commit
git-ai continue --commit abc1234

# Launch Claude with restored context
git-ai continue --commit abc1234 --launch
```

### PR Review

```bash
# Check AI involvement in current branch
git-ai search --commit origin/main..HEAD

# Review specific commit
git-ai search --commit abc1234 --verbose
```

## Integration with Project Workflow

### Conventional Commits

Git AI works seamlessly with conventional commits:

```bash
# Make changes with AI assistance
# ... work in Claude/Cursor ...

# Commit following conventions
git commit -m "feat(coding-agent): add new tool PI-55"

# AI context is automatically attached as git notes
git-ai search --commit HEAD  # See the AI context
```

### Branch Naming

Follow project conventions:

```bash
# Create feature branch
git checkout -b feat/new-feature-pi-123

# Work with AI assistance
# ... AI sessions are automatically tracked ...

# Push code (notes are local by default)
git push origin feat/new-feature-pi-123
```

### Code Review

When reviewing PRs:

1. Check the code changes
2. Check AI involvement: `git-ai search --commit <sha>`
3. Review AI context if needed: `git-ai search --commit <sha> --verbose`
4. Use context to understand design decisions

## Troubleshooting

### Command not found

```bash
# Check if git-ai is in PATH
which git-ai

# If not, add to PATH (in ~/.zshrc or ~/.bashrc)
export PATH="$HOME/.local/bin:$PATH"
```

### No AI context found

This is normal if:
- The commit wasn't made with AI assistance
- Git AI wasn't installed when the commit was made
- The AI tool isn't supported by Git AI

To manually add context (for existing commits):
- Continue work with AI and reference the original commit
- Git AI will link the new conversation to related code

### Notes not preserved after rebase

```bash
# Re-enable notes rewriting
cd pi-mono
git config --local notes.rewrite.rebase true
git config --local notes.rewrite.amend true
git config --local notes.rewriteRef "refs/notes/*"
```

### Can't see teammate's AI context

Git notes are local by default. Ask your teammate to push notes:

```bash
# They push notes
git push origin refs/notes/*

# You fetch notes
git fetch origin refs/notes/*:refs/notes/*
```

## Best Practices

### 1. Regular Context Checks

Before working on code, check for AI context:

```bash
git-ai search --file <file> --verbose
```

### 2. Reference in PRs

When submitting AI-assisted PRs, mention it:

```markdown
## Changes
- Implemented new feature with AI assistance
- AI context: `git-ai search --commit abc1234 --verbose`
```

### 3. Understand Before Committing

Review AI suggestions carefully:
1. Understand what the code does
2. Test thoroughly
3. Commit with proper conventional commit message
4. Reference Linear issue in commit message

### 4. Privacy Awareness

Remember:
- Git notes are local by default
- Don't push notes if they contain sensitive information
- Review notes before sharing: `git notes show <commit>`

## Advanced Configuration

### Custom Hooks

Git AI hooks are in `.git/hooks/`. To customize:

```bash
# View installed hooks
ls -la .git/hooks/ | grep git-ai

# Edit hooks (careful!)
# They're generated by git-ai, so changes may be overwritten
```

### Selective Tracking

To disable tracking temporarily:

```bash
# Temporarily disable hooks
git -c core.hooksPath=/dev/null commit -m "feat: test"

# Or uninstall hooks
git-ai uninstall-hooks
```

### Integration with CI/CD

Add to `.github/workflows/`:

```yaml
- name: Check AI involvement
  run: |
    PROMPT_COUNT=$(git-ai search --commit ${{ github.sha }} --count || echo "0")
    if [ "$PROMPT_COUNT" -gt 0 ]; then
      echo "::notice::This commit includes $PROMPT_COUNT AI session(s)"
      git-ai search --commit ${{ github.sha }}
    fi
```

## Resources

- **Documentation**: [GIT_AI.md](GIT_AI.md) - Complete usage guide
- **Quick Reference**: [GIT_AI_QUICKREF.md](GIT_AI_QUICKREF.md) - Command cheat sheet
- **Linear Issue**: [PI-55](https://linear.app/gautambh/issue/PI-55) - Setup tracking
- **Git AI Skill**: `/Users/agent/.agents/skills/git-ai-search/SKILL.md`

## Support

For issues:
1. Check this documentation
2. Check git-ai version: `git-ai --version`
3. Check git notes config: `git config --list | grep notes`
4. Create Linear issue with `tooling` label
5. Ask in team Discord/Slack

## Verification Checklist

After setup, verify:

- [ ] `git-ai --version` works
- [ ] `git-ai search --commit HEAD` runs without error
- [ ] `git config --get notes.rewrite.rebase` returns `true`
- [ ] `.git/hooks/` contains git-ai hooks
- [ ] Can search for AI context in recent commits
- [ ] Can continue from previous commits

If all items pass, Git AI is properly configured! 🎉
