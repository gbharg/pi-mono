# Project Rules

## Branch Naming

This project follows the [Conventional Branch](https://conventional-branch.github.io/) specification for consistent and meaningful branch naming.

### Format

```
<type>/<description>
```

### Supported Types

- **`main`** - The main development branch (e.g., `main`, `master`, or `develop`)
- **`feature/`** or **`feat/`** - For new features (e.g., `feature/add-login-page`, `feat/add-login-page`)
- **`bugfix/`** or **`fix/`** - For bug fixes (e.g., `bugfix/fix-header-bug`, `fix/header-bug`)
- **`hotfix/`** - For urgent fixes (e.g., `hotfix/security-patch`)
- **`release/`** - For branches preparing a release (e.g., `release/v1.2.0`)
- **`chore/`** - For non-code tasks like dependency, docs updates (e.g., `chore/update-dependencies`)

### Basic Rules

1. **Use Lowercase Alphanumerics, Hyphens, and Dots**: Always use lowercase letters (`a-z`), numbers (`0-9`), and hyphens (`-`) to separate words. Avoid special characters, underscores, or spaces. For release branches, dots (`.`) may be used in the description to represent version numbers (e.g., `release/v1.2.0`).

2. **No Consecutive, Leading, or Trailing Hyphens or Dots**: Ensure that hyphens and dots do not appear consecutively (e.g., `feature/new--login`, `release/v1.-2.0`), nor at the start or end of the description (e.g., `feature/-new-login`, `release/v1.2.0.`).

3. **Keep It Clear and Concise**: The branch name should be descriptive yet concise, clearly indicating the purpose of the work.

4. **Include Ticket Numbers**: If applicable, include the ticket number from your project management tool to make tracking easier. For example, for a ticket `issue-123`, the branch name could be `feature/issue-123-new-login`.

### Examples

#### Good Examples
- `feature/user-authentication`
- `feat/add-dashboard-widgets`
- `fix/memory-leak-in-parser`
- `bugfix/button-alignment-issue`
- `hotfix/critical-security-patch`
- `release/v2.1.0`
- `chore/update-dependencies`
- `feature/issue-456-payment-integration`

#### Bad Examples
- `feature/User_Authentication` (uppercase, underscores)
- `fix/Memory--Leak` (consecutive hyphens, uppercase)
- `feature/-new-feature` (leading hyphen)
- `bugfix/fix-bug-` (trailing hyphen)
- `my-random-branch` (no type prefix)
- `feature/new..feature` (consecutive dots outside release context)

### Integration

This naming convention integrates with:
- **CI/CD Pipelines**: Automated systems can trigger specific actions based on branch type
- **Team Collaboration**: Clear purpose indication improves team coordination
- **Git Hooks**: Pre-push hooks validate branch names against this specification

### Validation

The pre-push hook at `.husky/pre-push` validates all branch names against this convention before allowing pushes to the remote repository. Only the `main` branch is exempt from this validation.

## Commit Messages

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification for consistent and meaningful commit messages.

### Format

```
<type>(scope): <description>

[optional body]

[optional footer(s)]
```

### Supported Types

- **`feat`** - Commits that add, adjust or remove a new feature to the API or UI
- **`fix`** - Commits that fix an API or UI bug of a preceded `feat` commit
- **`refactor`** - Commits that rewrite or restructure code without altering API or UI behavior
- **`perf`** - Commits are special type of `refactor` commits that specifically improve performance
- **`style`** - Commits that address code style (e.g., white-space, formatting, missing semi-colons) and do not affect application behavior
- **`test`** - Commits that add missing tests or correct existing ones
- **`docs`** - Commits that exclusively affect documentation
- **`build`** - Commits that affect build-related components such as build tools, dependencies, project version, etc.
- **`ops`** - Commits that affect operational aspects like infrastructure, deployment scripts, CI/CD pipelines, monitoring, etc.
- **`ci`** - Commits that affect continuous integration configuration or scripts
- **`chore`** - Commits that represent tasks like initial commit, modifying `.gitignore`, etc.
- **`revert`** - Commits that revert a previous commit

### Scope

The `scope` provides additional contextual information about the affected area:
- **Optional** part of the commit message
- Should be lowercase and concise (e.g., `memory`, `linear`, `imessage`, `deps`)
- **Do not** use issue identifiers as scopes

### Description

The `description` contains a concise description of the change:
- **Mandatory** part of the commit message
- Use imperative, present tense: "change" not "changed" nor "changes"
- Think of "This commit will..." when writing the description
- Use lowercase (no capitalization of the first letter)
- **Do not** end with a period (`.`)

### Breaking Changes

Breaking changes **must** be indicated by an `!` before the `:` in the subject line:
```
feat(api)!: remove status endpoint
```

### Examples

#### Good Examples
```
feat(linear): add webhook handler for issue events
fix(memory): correct regex in getActiveProject
docs(agent): update AGENT.md with new services
chore(deps): bump express to v5
perf(parser): decrease memory footprint using HyperLogLog
feat(imessage)!: remove deprecated send method
refactor: implement fibonacci calculation as recursion
test(utils): add unit tests for string helpers
```

#### Bad Examples
```
Add new feature                    (missing type and scope)
feat(Linear): Add webhook handler  (scope capitalized, description capitalized)
fix(memory): Fixed regex bug.      (past tense, ends with period)
Feature: new login page            (wrong type, capitalized)
```

### Validation

The commit-msg hook at `.husky/commit-msg` validates all commit messages against this convention before allowing commits. Special cases like merge commits and reverts are automatically handled.