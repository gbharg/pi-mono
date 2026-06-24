# Multi-Agent Orchestration Architecture

## Overview

This repo implements a multi-agent orchestration system built on pi-mono. Pi (the orchestrator) acts as CTO, communicating with Gautam via iMessage and delegating work to specialized sub-agents. Work can originate from a direct user request, a GitHub issue, or an optional external tracker. Sub-agents execute tasks in isolated branches and submit PRs for review. The system enforces strict lifecycle protocols, conventional commit standards, and comprehensive audit trails via git notes.

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
       ├─────► Optional task tracker integration
       │       - Task state management
       │       - Agent session lifecycle
       │       - Activity streaming
       │       - Conditional state webhooks
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
               - Branch per task
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

**Flow**: Gautam → iMessage → Pi → Task/User Request → Sub-Agent → Git Branch → PR → Review → Merge → Done

**Key Principle**: Durable task state is required, but Linear is not. Pi may read board state from an optional tracker, GitHub issue state, or direct user context. When no tracker is configured, Pi operates from the current user request plus GitHub issue and PR state. Agents report progress to the surface that originated the work, and Pi never directly edits code.

## Agent Roles

| Name | Description | Model | Tools | Persistence |
|------|-------------|-------|-------|-------------|
| `worker` | General-purpose implementation | `claude-sonnet-4-5` | read, write, edit, bash | Disposable (killed after In Review) |
| `worker-full` | Full-capability implementation | `claude-sonnet-4-20250514` | read, write, edit, bash | Disposable |
| `worker-readonly` | Read-only analysis/audit | `claude-sonnet-4-20250514` | read, grep, find, ls, bash | Disposable |
| `researcher` | Topic investigation | `claude-opus-4-6` | read, grep, find, ls, bash | Persistent |
| `reviewer` | Code review specialist | `claude-sonnet-4-5` | read, bash | Persistent (learns patterns) |
| `planner` | Spec/plan creation | `claude-sonnet-4-5` | read | Disposable |
| `scout` | Fast recon/exploration | `claude-haiku-4-5` | read, bash (compressed context) | Disposable |
| `pi` (orchestrator) | Delegation & coordination | `claude-sonnet-4-20250514` | read, subagent, iMessage | Persistent (always running) |

**Agent definitions**: `~/.pi/agent/agents/<name>.md`  
**Wrapper script**: `scripts/agent-wrapper.sh`

## Lifecycle

Sub-agents follow a strict 5-phase lifecycle enforced by `scripts/agent-wrapper.sh`:

### Phase 1: Setup
- Create an agent session record when the active tracker supports it
- Generate branch name from the task title (conventional format)
- **Sequential mode**: Create branch off `main`
- **Parallel mode**: Create branch off task branch, add worktree
- Export environment variables (`AGENT_SESSION_ID`, optional `AGENT_TASK_ID`, optional tracker credentials)

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
- Post errors to the originating task surface on failure

### Phase 4: Finalization
- Attach session log as git note on last commit (truncated to 500KB or 10k lines)
- Push branch to origin
- Push git notes (`refs/notes/commits`)
- Create PR (to `main` or task branch depending on mode)
- Post handoff activity to the originating task surface
- Move the task to review when the active tracker supports states
- Post completion comment to the originating issue or PR when available

### Phase 5: Teardown
- Clean up temp files (`/tmp/agent-system-prompt-*`, `/tmp/agent-session-*.log`)
- **Sequential mode**: No teardown needed
- **Parallel mode**: Remove worktree, leave branches for orchestrator

**Critical**: Agents are killed after Phase 4. Session state persists in git notes and the originating task surface. New agent spawns reconstruct context from external state.

## Git Model

### Branch Naming (conventional-branch.github.io)
- **Sequential**: `feat/descriptive-slug` or `fix/descriptive-slug` (branch off `main`)
- **Parallel**: `feat/descriptive-slug/agent-<role>` (branch off task branch `feat/descriptive-slug`)
- **Issue-backed optional**: include the issue key when one exists, e.g. `feat/gh-123-completion-protocol`
- Examples: `feat/completion-protocol`, `feat/review-gate/agent-worker`, `fix/task-tracker-cleanup`

### Commit Conventions
Format: `type(scope): description`

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `build`, `ci`

**Required trailer**: `Co-Authored-By: agent/<role> <session-id@noreply>`

Example:
```
feat(orchestration): add completion protocol

Implements agent session lifecycle with 5-phase wrapper.

Co-Authored-By: agent/worker-full 550e8400-e29b-41d4-a716-446655440000@noreply
```

### PR Workflow

**Sequential (single agent)**:
1. Agent works on `feat/descriptive-slug` off `main`
2. Wrapper creates PR: `feat/descriptive-slug` → `main`
3. Review gates: reviewer agent → 4-agent PR review
4. Merge to `main` on approval

**Parallel (multiple agents)**:
1. Pi creates task branch `feat/descriptive-slug` off `main`
2. Each agent works on `feat/descriptive-slug/agent-<role>` in isolated worktree
3. Wrapper creates PR: `feat/descriptive-slug/agent-<role>` → `feat/descriptive-slug`
4. Pi merges agent branches into task branch after review
5. Pi creates final PR: `feat/descriptive-slug` → `main`
6. Review gates apply to final PR

**Issue-backed work**: Use `fixes #<issue-number>` or `closes #<issue-number>` in commit messages only when the issue is meant to auto-close on merge. Direct user-requested work does not require an issue link.

## Optional Task Tracker Integration

Tracker integration is optional. Linear was the original adapter, but it is no longer required for normal branch, commit, PR, or agent workflows.

### Historical Adapter State Machine

When a tracker adapter is enabled, use that tracker's states. This section is historical adapter reference only. The original Linear adapter used:

**Project States**:
```
Backlog → Shaping → Planned → In Progress → Review → Done
```

**Task States**:
```
Backlog → Todo → Plan → In Progress → In Review → Done
         ↑                                ↓
         └────────── (blocked/dependency) ─┘
```

**Rules**:
- Nothing moves to `In Progress` without a spec in `Plan` state
- Sub-agents own state up to `In Review`
- Pi owns transition to `Done` and parent task state

### Agent Session Lifecycle

1. **Creation**: Wrapper creates an agent session on the active task when supported
2. **Streaming**: Agent posts progress to the originating surface with types:
   - `response`: Status updates, handoff messages
   - `error`: Failures, validation errors
3. **Completion**: Final activity posted with PR link, commit stats
4. **Persistence**: Session ID stored in git notes; the originating tracker or PR retains the user-facing history

### Tracker as Orchestration Bus

- **No tracker configured**: Pi uses current user context plus GitHub issue and PR state; no board-state webhooks or tracker cache are required
- **Pi**: Receives webhooks for board state changes only when a tracker is configured
- **Pi cache**: Optional in-memory board state (task ID, status, assignee, delegate, due date)
- **Sub-agents**: Never read board state, only interact via their assigned task/session
- **API tokens**: Required only by the configured tracker adapter

### Comments

Comment templates are plain text to comply with the repo's no-emoji communication rule.

- **Agent start**: "Agent `<name>` started on task `<id>` (session: `<id>`)"
- **Agent complete**: "Agent `<name>` completed successfully. Pull request: `<url>`"
- **Agent error**: "Agent `<name>` failed with exit code `<code>`. See session `<id>` for details."

## Naming Conventions

| Entity | Format | Example |
|--------|--------|---------|
| Sequential branch | `type/slug` | `feat/completion-protocol` |
| Parallel task branch | `type/slug` | `feat/review-gate` |
| Parallel agent branch | `type/slug/agent-role` | `feat/review-gate/agent-reviewer` |
| Commit message | `type(scope): description` | `feat(orchestration): add wrapper` |
| Co-Authored-By | `agent/<role> <uuid@noreply>` | `agent/worker-full 550e8400@noreply` |
| Task identifier | Optional tracker or GitHub issue ID | `123` |
| Agent session ID | UUID v4 | `550e8400-e29b-41d4-a716-446655440000` |
| Session log file | `/tmp/agent-session-<uuid>.log` | `/tmp/agent-session-550e8400.log` |
| System prompt file | `/tmp/agent-system-prompt-<uuid>.txt` | `/tmp/agent-system-prompt-550e8400.txt` |

## Dependencies

### Required Tools
- `gh` (GitHub CLI) - PR creation and GitHub issue management
- `tsx` - TypeScript execution for Pi CLI
- `git` - Version control (with `git notes` support)
- `node` (v18+) - Node.js runtime
- `npm` - Package manager
- `jq` - JSON parsing in wrapper and GitHub/tracker flows
- `curl` - Local HTTP probes and optional tracker adapter calls

### Optional Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `REPO_ROOT` | Repository root path | Detected from script location |
| `MAX_LOG_SIZE` | Max session log size (bytes) | 512000 (500KB) |
| `TRACKER_API_KEY` | API key for an optional tracker adapter | unset |
| `TRACKER_APP_TOKEN` | App token for an optional tracker adapter | unset |

## Rules

### Hard Rules (All Agents)

1. **Single source of truth**: Use the originating user request, GitHub issue, or configured tracker as authoritative task state.
2. **Task context required**: Work must have an explicit user request, GitHub issue, or configured tracker task.
3. **Branch for everything**: No direct commits to `main`. No exceptions. Even one-line fixes.
4. **Conventional commits**: All commits use `type(scope): description` format.
5. **Co-Authored-By required**: All agent commits must include Co-Authored-By trailer.
6. **Link commits when appropriate**: Include `fixes #<issue-number>` or `closes #<issue-number>` only for issue-backed work intended to auto-close.
7. **No orphan commits**: Every commit must trace to explicit task context.
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
- **Trackers are async**: Process configured task queues when capacity allows.
- **One topic at a time**: Focus on a single task before moving to the next.

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
4. **Parallel review**: Independent sub-tasks reviewed in parallel, connected ones batched

### Communication

- **iMessage**: Synchronous, always respond immediately. Gautam's live line to Pi.
- **Tracker comments**: Automated, technical, concise. No emojis.
- **Tracker activities**: Real-time progress streaming when supported by the configured adapter.
- **Git notes**: Full session logs attached to commits for audit trail.

## Environment Variables

Environment variables used by the orchestration system:

```bash
# Optional - tracker API access
export TRACKER_API_KEY="..."                 # User API key for configured tracker
export TRACKER_APP_TOKEN="..."               # App token for configured tracker

# Wrapper Configuration
export MAX_LOG_SIZE=512000                   # Session log size limit (bytes)
export REPO_ROOT="/path/to/repo"             # Override repo root detection

# Agent Runtime (set by wrapper, read by agents)
export AGENT_SESSION_ID="550e8400-..."       # Agent session UUID
export AGENT_TASK_ID="123"                   # Optional; set only when task or issue ID exists
export AGENT_BRANCH="feat/descriptive-slug"  # Git branch name
```

**Security**: Never commit tokens. Store in environment or secure secret management.
