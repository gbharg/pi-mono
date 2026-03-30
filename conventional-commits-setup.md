# Conventional Commits Setup

This document summarizes the setup of conventional commit validation for the pi-mono repository.

## What Was Implemented

### 1. Commit Message Validation Hook

**File:** `.husky/commit-msg`
- Created a Git hook that validates commit messages against the conventional commits specification
- Validates the format: `type(scope): description`
- Supports breaking changes with `!` indicator
- Allows special Git operations (merge, revert, initial commit)

**Validation Rules:**
- **Types:** feat, fix, refactor, perf, style, test, docs, build, ops, chore, ci, revert
- **Scope:** Optional, lowercase alphanumeric with hyphens
- **Description:** Mandatory, imperative mood, lowercase, no period, max 100 chars

**Error Handling:**
- Provides clear error messages with examples when validation fails
- Shows the invalid commit message and expected format
- Gives specific examples of correct formatting

### 2. Documentation Updates

**File:** `.pi/RULES.md`
- Added comprehensive "Commit Messages" section
- Documents all supported commit types with explanations
- Provides clear formatting rules and guidelines
- Includes good and bad examples for reference
- Explains breaking change notation

### 3. Hook Permissions

Made the commit-msg hook executable (`chmod +x`) to ensure it runs automatically.

## Reference Implementation

The implementation follows the specification from: https://gist.github.com/qoomon/5dfcdf8eec66a051ecd85625518cfd13

### Supported Commit Types

| Type | Purpose |
|------|---------|
| `feat` | New features for API or UI |
| `fix` | Bug fixes for API or UI |
| `refactor` | Code restructuring without behavior change |
| `perf` | Performance improvements |
| `style` | Code style changes (formatting, etc.) |
| `test` | Adding or updating tests |
| `docs` | Documentation changes |
| `build` | Build system or dependency changes |
| `ops` | Operational changes (CI/CD, deployment) |
| `ci` | Continuous integration changes |
| `chore` | Maintenance tasks |
| `revert` | Reverting previous commits |

### Example Commits

```bash
# Feature addition
git commit -m "feat(linear): add webhook handler for issue events"

# Bug fix
git commit -m "fix(memory): correct regex in getActiveProject"

# Breaking change
git commit -m "feat(api)!: remove deprecated endpoint"

# Documentation
git commit -m "docs(agent): update AGENT.md with new services"

# Dependency update
git commit -m "chore(deps): bump express to v5"
```

## Testing the Setup

To test the validation:

```bash
# This will be rejected
git commit -m "Add new feature"

# This will be accepted  
git commit -m "feat(test): add validation example"
```

## Benefits

1. **Consistency:** Uniform commit message format across the project
2. **Automation:** Automatic changelog generation and semantic versioning
3. **Clarity:** Clear understanding of changes from commit history
4. **Integration:** Works with CI/CD pipelines and release automation
5. **Enforcement:** Prevents non-conforming commits from being created

The setup ensures all future commits follow the conventional commits standard while maintaining compatibility with existing Git workflows.