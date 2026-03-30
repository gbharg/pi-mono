# Git Hooks

This directory contains git hooks enforced via Husky.

## Hook Chain

1. **Git** → `.git/ai/hooks/*` (Git AI intercepts all hooks for session tracking)
2. **Git AI** → `.husky/_/*` (Husky stubs)
3. **Husky** → `.husky/*` (Main validation hooks)

## Enforced Conventions

### Branch Naming (`pre-push`)

**Format:** `type/description`

**Valid types:** `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `perf`

**Description rules:**
- Kebab-case (lowercase, hyphens only)
- No consecutive hyphens
- No leading/trailing hyphens

**Examples:**
- ✅ `feat/linear-webhook`
- ✅ `fix/subagent-hang`
- ✅ `docs/changelog-audit`
- ❌ `feat/Linear-Webhook` (uppercase)
- ❌ `feature/new-thing` (wrong type)
- ❌ `fix/memory--leak` (consecutive hyphens)

**Exempt:** `main`, `master`, `develop` branches

### Commit Messages (`commit-msg`)

**Format:** `type(scope): description`

**Valid types:** `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `perf`

**Scope:** Optional, lowercase with hyphens (e.g., `ai`, `coding-agent`, `memory`)

**Description:** Imperative mood, lowercase, no period

**Examples:**
- ✅ `feat(ai): add bedrock provider`
- ✅ `fix(coding-agent): prevent subagent hang`
- ✅ `docs: update changelog`
- ✅ `feat(api)!: remove deprecated endpoint` (breaking change)
- ❌ `Add new feature` (no type)
- ❌ `feat: Add feature` (capital letter)

**Exempt:** Merge commits (starting with "Merge")

### Pre-commit Checks (`pre-commit`)

Runs:
1. `npm run check` (formatting, linting, type checking)
2. Browser smoke tests (if ai/web-ui files changed)
3. Auto-restages formatted files

## Configuration

Husky is configured via:
- `package.json`: `"prepare": "husky"` script
- `.husky/` directory: Hook scripts
- `.husky/_/` directory: Husky v9 stubs (managed by Husky)

## Disabling Hooks (Not Recommended)

To bypass hooks temporarily:
```bash
HUSKY=0 git commit -m "message"
```

**Warning:** This bypasses all validation. Use only in emergencies.
