# Context — Linear Integration

## What This Project Is
Build automated two-way sync between Pi's local files and Linear, real-time sub-agent tracking reflected in Linear, and a git workflow that prevents conflicts when multiple agents work in parallel.

## What Already Exists
- Linear webhook server on port 3002 (receives Issue, Comment, Project, AgentSessionEvent events)
- MCP bridge on port 3100 (authenticated, valid through 4/5)
- Pi Agent app user in Linear (can post comments, set delegate)
- GitHub webhook sending push/PR/issue events to Linear
- Manual task creation and status updates via API

## Three Gaps to Fill
1. Automated task sync: tasks.md ↔ Linear issues (bidirectional, with IDs)
2. Sub-agent tracking: real-time visibility, status reflected in Linear comments
3. Git workflow: worktree-per-agent for parallel work, conflict-free merges

## Key Decisions from Previous Project
- All assignments route through me (orchestrator), no autonomous mode
- Linear = Gautam's source of truth, files = my team's. Always in sync.
- One file per agent, minimal context, no awareness of siblings
- Docs updated in same commit as code
