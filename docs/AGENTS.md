# Multi-Agent Orchestration Architecture

## Overview

This repo implements a multi-agent orchestration system built on pi-mono. Pi (the orchestrator) acts as CTO, communicating with Gautam via iMessage and delegating work to specialized sub-agents. Linear serves as the orchestration bus and single source of truth for task state. All work flows through Linear issues, with sub-agents executing tasks in isolated branches and submitting PRs for review. The system enforces strict lifecycle protocols, conventional commit standards, and comprehensive audit trails via git notes.

## Architecture

```
┌─────────────┐
│   Gautam    │ (CEO - sets priorities)
└──────┬──────┘
       │ iMessage (synchronous)
       ▼
┌─────────────┐
│     Pi      │ (Orchestrator - CTO role)
│             │ Tools: read, subagent delegation
└──────┬──────┘
       │
       ├─────► Linear API (async orchestration bus)
       │       - Issue state management
       │       - AgentSession lifecycle
       │       - Activity streaming
       │       - Board state webhooks
       │
       └─────► Sub-Agents (spawned via scripts/agent-wrapper.sh)
               │
               ├─► worker, worker-full (implementation)
               ├─► worker-readonly (analysis/audit)
               ├─► researcher (investigation)
               ├─► reviewer (code review)
               ├─► planner (specs)
               └─► scout (recon)
                   │
                   ▼
               Git Operations
               - Branch per issue
               - Conventional commits
               - Co-Authored-By trailers
               - Git notes for session logs
               - PR to main (or task branch)
                   │
                   ▼
               GitHub PR Review
               - reviewer agent (fast pass)
               - 4-agent review (Gemini, Codex, Claude, Copilot)
               - Branch protection on main
```

**Flow**: Gautam → iMessage → Pi → Linear Issue → Sub-Agent → Git Branch → PR → Review → Merge → Done

**Key Principle**: Linear is the single source of truth. Pi reads board state via webhooks, spawns agents assigned to Linear issues, agents report progress via AgentActivity API, and Pi never directly edits code.

## Agent Roles

| Name | Description | Model | Tools | Persistence |
|------|-------------|-------|-------|-------------|
| `worker` | General-purpose implementation | `claude-sonnet-4-5` | read, write, edit, bash | Disposable (killed after In Review) |
| `worker-full` | Full-capability implementation | `claude-sonnet-4-20250514` | read, write, edit, bash | Disposable |
| `worker-readonly` | Read-only analysis/audit | `claude-sonnet-4-20250514` | read, grep, find, ls, bash | Disposable |
| `researcher` | Topic investigation | `claude-opus-4-6` | read, grep, find, ls, bash | Persistent (Linear app user) |
| `reviewer` | Code review specialist | `claude-sonnet-4-5` | read, bash | Persistent (learns patterns) |
| `planner` | Spec/plan creation | `claude-sonnet-4-5` | read | Disposable |
| `scout` | Fast recon/exploration | `claude-haiku-4-5` | read, bash (compressed context) | Disposable |
| `pi` (orchestrator) | Delegation & coordination | `claude-sonnet-4-20250514` | read, subagent, iMessage | Persistent (always running) |

**Agent definitions**: `~/.pi/agent/agents/<name>.md`  
**Wrapper script**: `scripts/agent-wrapper.sh`

## Lifecycle

Sub-agents follow a strict 5-phase lifecycle enforced by `scripts/agent-wrapper.sh`:

### Phase 1: Setup
- Create Linear AgentSession on issue
- Generate branch name from issue title (conventional format)
- **Sequential mode**: Create branch off `main`
- **Parallel mode**: Create branch off task branch, add worktree
- Export environment variables (`AGENT_SESSION_ID`, `AGENT_ISSUE_ID`, `LINEAR_API_KEY`, `LINEAR_APP_TOKEN`)

### Phase 2: Execution
- Parse agent definition (`~/.pi/agent/agents/<name>.md`)
- Extract model, tools, system prompt
- Spawn Pi CLI with agent configuration
- Stream output to log file (`/tmp/agent-session-<session-id>.log`)
- Capture exit code

### Phase 3: Verification
- Check agent exit code (must be 0)
- Verify new commits exist (`git rev-list --count`)
- Validate conventional commit format (`type(scope): description`)
- Verify Co-Authored-By trailer on all commits
- Post errors to Linear AgentActivity and issue comments on failure

### Phase 4: Finalization
- Attach session log as git note on last commit (truncated to 500KB or 10k lines)
- Push branch to origin
- Push git notes (`refs/notes/commits`)
- Create PR (to `main` or task branch depending on mode)
- Post handoff activity to Linear session
- Move issue to `In Review` state
- Post completion comment to issue

### Phase 5: Teardown
- Clean up temp files (`/tmp/agent-system-prompt-*`, `/tmp/agent-session-*.log`)
- **Sequential mode**: No teardown needed
- **Parallel mode**: Remove worktree, leave branches for orchestrator

**Critical**: Agents are killed after Phase 4. Session state persists in git notes and Linear. New agent spawns reconstruct context from external state.

## Git Model

### Branch Naming (conventional-branch.github.io)
- **Sequential**: `feat/PI-XXX-description` (branch off `main`)
- **Parallel**: `feat/PI-XXX/agent-<role>` (branch off task branch `feat/PI-XXX-description`)
- Examples: `feat/pi-56-completion-protocol`, `feat/pi-65/agent-worker`, `fix/pi-72-linear-cleanup`

### Commit Conventions
Format: `type(scope): description`

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `build`, `ci`

**Required trailer**: `Co-Authored-By: agent/<role> <session-id@noreply>`

Example:
```
feat(orchestration): add completion protocol

Implements Linear AgentSession lifecycle with 5-phase wrapper.

Co-Authored-By: agent/worker-full 550e8400-e29b-41d4-a716-446655440000@noreply
```

### PR Workflow

**Sequential (single agent)**:
1. Agent works on `feat/PI-XXX-description` off `main`
2. Wrapper creates PR: `feat/PI-XXX-description` → `main`
3. Review gates: reviewer agent → 4-agent PR review
4. Merge to `main` on approval

**Parallel (multiple agents)**:
1. Pi creates task branch `feat/PI-XXX-description` off `main`
2. Each agent works on `feat/PI-XXX/agent-<role>` in isolated worktree
3. Wrapper creates PR: `feat/PI-XXX/agent-<role>` → `feat/PI-XXX-description`
4. Pi merges agent branches into task branch after review
5. Pi creates final PR: `feat/PI-XXX-description` → `main`
6. Review gates apply to final PR

**Always**: Every commit links to Linear issue via `fixes #PI-XXX` in commit message.

## Linear Integration

### State Machine

**Project States**:
```
Backlog → Shaping → Planned → In Progress → Review → Done
```

**Issue States**:
```
Backlog → Todo → Plan → In Progress → In Review → Done
         ↑                                ↓
         └────────── (blocked/dependency) ─┘
```

**Rules**:
- Nothing moves to `In Progress` without a spec in `Plan` state
- Sub-agents own state up to `In Review`
- Pi owns transition to `Done` and parent issue state

### AgentSession Lifecycle

1. **Creation**: Wrapper calls `agentSessionCreateOnIssue` mutation on issue
2. **Streaming**: Agent posts progress via `agentActivityCreate` with types:
   - `response`: Status updates, handoff messages
   - `error`: Failures, validation errors
3. **Completion**: Final activity posted with PR link, commit stats
4. **Persistence**: Session ID stored in git notes, Linear retains full history

### Linear as Orchestration Bus

- **Pi**: Receives webhooks for board state changes (issue created, status updated, assigned)
- **Pi cache**: In-memory board state (issue ID, status, assignee, delegate, due date)
- **Sub-agents**: Never read board state, only interact via their assigned issue session
- **API tokens**: `LINEAR_API_KEY` for Pi queries, `LINEAR_APP_TOKEN` for agent sessions

### Comments

- **Agent start**: "🔄 Agent `<name>` started on issue PI-XXX (session: `<id>`)"
- **Agent complete**: "✅ Agent `<name>` completed successfully. Pull request: `<url>`"
- **Agent error**: "❌ Agent `<name>` failed with exit code `<code>`. See session `<id>` for details."

## Naming Conventions

| Entity | Format | Example |
|--------|--------|---------|
| Sequential branch | `type/PI-XXX-slug` | `feat/pi-56-completion-protocol` |
| Parallel task branch | `type/PI-XXX-slug` | `feat/pi-65-review-gate` |
| Parallel agent branch | `type/PI-XXX/agent-role` | `feat/pi-65/agent-reviewer` |
| Commit message | `type(scope): description` | `feat(orchestration): add wrapper` |
| Co-Authored-By | `agent/<role> <uuid@noreply>` | `agent/worker-full 550e8400@noreply` |
| Issue identifier | `PI-XXX` | `PI-56` |
| Agent session ID | UUID v4 | `550e8400-e29b-41d4-a716-446655440000` |
| Session log file | `/tmp/agent-session-<uuid>.log` | `/tmp/agent-session-550e8400.log` |
| System prompt file | `/tmp/agent-system-prompt-<uuid>.txt` | `/tmp/agent-system-prompt-550e8400.txt` |

## Dependencies

### Required Tools
- `gh` (GitHub CLI) - PR creation, issue management
- `jq` - JSON parsing for Linear API responses
- `curl` - Linear API calls
- `tsx` - TypeScript execution for Pi CLI
- `git` - Version control (with `git notes` support)
- `node` (v18+) - Node.js runtime
- `npm` - Package manager

### Required Environment Variables
| Variable | Description | Used By |
|----------|-------------|---------|
| `LINEAR_API_KEY` | User API key for Pi board queries | Pi, wrapper setup |
| `LINEAR_APP_TOKEN` | App token for AgentSession API | Wrapper, sub-agents |
| `LINEAR_TEAM_ID` | Linear team UUID | Wrapper (defaults to pi-mono team) |
| `LINEAR_STATE_IN_REVIEW` | State ID for In Review | Wrapper (defaults to pi-mono state) |

### Optional Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `REPO_ROOT` | Repository root path | Detected from script location |
| `MAX_LOG_SIZE` | Max session log size (bytes) | 512000 (500KB) |

## Rules

### Hard Rules (All Agents)

1. **Single source of truth**: Linear is authoritative for task state. Never use custom IDs.
2. **Everything is an issue**: All work that results in action must have a Linear issue.
3. **Branch for everything**: No direct commits to `main`. No exceptions. Even one-line fixes.
4. **Conventional commits**: All commits use `type(scope): description` format.
5. **Co-Authored-By required**: All agent commits must include Co-Authored-By trailer.
6. **Link commits to issues**: Include `fixes #PI-XXX` or `closes #PI-XXX` in commit messages.
7. **No orphan commits**: Every commit must trace to a Linear issue.
8. **Kill after In Review**: Sub-agents are terminated after finalization. Never kept alive.
9. **No solo scoping**: Always check scope with Gautam before executing.
10. **Spec gates execution**: Nothing moves to In Progress without a plan/spec.

### Git Safety (Parallel Agents)

Multiple agents may work simultaneously. **NEVER**:
- `git add -A` or `git add .` (stages other agents' work)
- `git reset --hard` (destroys uncommitted changes)
- `git checkout .` (destroys uncommitted changes)
- `git clean -fd` (deletes untracked files)
- `git stash` (stashes all changes including others' work)
- `git commit --no-verify` (bypasses required checks)

**Always**:
- `git add <specific-files>` for files YOU changed only
- `git status` before committing to verify staging
- `git pull --rebase && git push origin main` (never bare `git push`)

### Pi Orchestrator Restrictions

- **Tools**: read, subagent delegation only. NO write, edit, or bash.
- **Never auto-execute**: Plans must be reviewed by Gautam before execution.
- **iMessage = synchronous**: Always acknowledge immediately before starting work.
- **Linear = async**: Process Linear queue when capacity allows.
- **One topic at a time**: Focus on single issue before moving to next.

### Sub-Agent Constraints

- **Minimal scope**: One file per agent. No sibling awareness.
- **No cross-scope changes**: Report dependencies, don't implement them.
- **Commit frequently**: Commit every time something works.
- **No refactoring**: Stay within task scope. No renames, restructures, or abstraction layers.
- **No dependencies without approval**: Note new package installs in output.
- **Report blockers**: If task requires changes outside scope, hand back to Pi.

### Review Gates

1. **First gate**: `reviewer` agent (fast, cheap, learns patterns)
2. **Second gate**: 4-agent PR review (Gemini, Codex, Claude, Copilot) on PRs to `main`
3. **Branch protection**: `main` requires all 4 approvals
4. **Parallel review**: Independent sub-issues reviewed in parallel, connected ones batched

### Communication

- **iMessage**: Synchronous, always respond immediately. Gautam's live line to Pi.
- **Linear comments**: Automated, technical, concise. No emojis.
- **Linear activities**: Real-time progress streaming via AgentActivity API.
- **Git notes**: Full session logs attached to commits for audit trail.

## Environment Variables

All environment variables used by the orchestration system:

```bash
# Required - Linear API Access
export LINEAR_API_KEY="lin_api_..."          # User API key (Pi board queries)
export LINEAR_APP_TOKEN="lin_app_..."        # App token (AgentSession API)

# Required - Linear Team Configuration
export LINEAR_TEAM_ID="e368d033-..."         # Team UUID (defaults to pi-mono)
export LINEAR_STATE_IN_REVIEW="e85f987d-..." # In Review state ID

# Optional - Wrapper Configuration
export MAX_LOG_SIZE=512000                   # Session log size limit (bytes)
export REPO_ROOT="/path/to/repo"             # Override repo root detection

# Agent Runtime (set by wrapper, read by agents)
export AGENT_SESSION_ID="550e8400-..."       # Linear AgentSession UUID
export AGENT_ISSUE_ID="PI-56"                # Linear issue identifier
export AGENT_BRANCH="feat/pi-56-..."         # Git branch name
```

**How to obtain tokens**:
- `LINEAR_API_KEY`: Linear Settings → API → Personal API Keys
- `LINEAR_APP_TOKEN`: Linear Settings → Integrations → Create OAuth App → App Token
- Team/State IDs: Query Linear GraphQL API or inspect browser network requests

**Security**: Never commit tokens. Store in environment or secure secret management.
