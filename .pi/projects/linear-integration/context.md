# Context — Linear Integration / Orchestration System

## What This Project Is
Design and build the orchestration system that connects Pi, Linear, GitHub, and sub-agents into a unified workflow. Linear is the task system, GitHub is the code system, sub-agents are the execution layer, Pi is the orchestrator.

## Current State
Phase: Shaping complete. Ready to write specs and implement.

## Core Decisions (see decisions.md for full list with rationale)
- Everything = Linear issue. iMessage = sync. Linear = async.
- Always branch off main. No project branches. PR to merge.
- Sub-agents: kill after In Review. Sessions in git notes + Linear.
- Two review gates: Reviewer agent + 4-agent PR review (Gemini/Codex/Claude/Copilot)
- Cloud envs for code changes. Research/planning = local.
- Three roles: researcher (persistent), worker (disposable), reviewer (persistent)
- Conventional branch naming + conventional commits
- todo.md = auto-generated cache from Linear

## Implementation Queue (Linear issues)
- PI-56: Sub-agent completion protocol (wrapper, git notes, Linear updates)
- PI-65: Multi-agent PR review gate (branch protection, 4 approvals)
- PI-41: Naming conventions (Linear, GitHub, files)
- PI-34: Scheduled reminder system
- PI-38: Cloud agent environments (separate project)
- PI-62-64: Reviewer as persistent Linear agent

## Open Research (agents running)
- Proof SDK alternatives (Linear docs vs Notion)
- Sub-agent roles (Intent, Droid patterns)
