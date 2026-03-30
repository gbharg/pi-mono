# Subagent Extension Setup

## Overview
Pi extension that spawns isolated pi subprocesses for delegated tasks. Each agent runs with its own context window, tools, and model.

## Installation (symlinks from pi-mono examples)
```bash
# Extension
~/.pi/agent/extensions/subagent/index.ts → ~/pi-mono/packages/coding-agent/examples/extensions/subagent/index.ts
~/.pi/agent/extensions/subagent/agents.ts → ~/pi-mono/packages/coding-agent/examples/extensions/subagent/agents.ts

# Agent definitions
~/.pi/agent/agents/scout.md → ~/pi-mono/.../subagent/agents/scout.md
~/.pi/agent/agents/planner.md → ~/pi-mono/.../subagent/agents/planner.md
~/.pi/agent/agents/reviewer.md → ~/pi-mono/.../subagent/agents/reviewer.md
~/.pi/agent/agents/worker.md → ~/pi-mono/.../subagent/agents/worker.md

# Custom agent (not symlinked, standalone)
~/.pi/agent/agents/researcher.md — Opus 4.6, for background research tasks

# Workflow prompts
~/.pi/agent/prompts/implement.md → ~/pi-mono/.../subagent/prompts/implement.md
~/.pi/agent/prompts/scout-and-plan.md → ~/pi-mono/.../subagent/prompts/scout-and-plan.md
~/.pi/agent/prompts/implement-and-review.md → ~/pi-mono/.../subagent/prompts/implement-and-review.md
```

## Available Agents
| Agent | Model | Tools | Purpose |
|-------|-------|-------|---------|
| scout | Haiku 4.5 | read, grep, find, ls, bash | Fast codebase recon |
| planner | Sonnet | read, grep, find, ls | Implementation plans |
| reviewer | Sonnet | read, grep, find, ls, bash | Code review |
| worker | Sonnet | all default | General execution |
| researcher | Opus 4.6 | read, grep, find, ls, bash | Background research |

## Usage
Requires /reload after install to activate the tool in Pi session.

```
# Single agent
Use scout to find all authentication code

# Background research (how we used it 2026-03-29)
Spawned researcher agent via: pi -p "<prompt>" --model claude-opus-4-6
Output to ~/research-memory-structure.md
```

## Notes
- Extension needs /reload to be available as a Pi tool (not yet done as of 2026-03-29)
- Parallel mode: up to 8 tasks, 4 concurrent
- Chain mode: sequential with {previous} placeholder
- Agents discovered fresh on each invocation (can edit mid-session)
