# Linear Issues Snapshot — 2026-03-30

## PI-1 — Set up Pi as a Linear app for webhooks and events
State: In Progress

Configure Pi agent as a Linear application so it can receive webhooks and events for bidirectional sync between local project files and Linear.

## Requirements

* Register Pi as a Linear OAuth app or configure webhook endpoint
* Set up webhook receiver on iMac (Tailscale Funnel + Caddy)
* Handle is

---

## PI-10 — Audit gbharg/agents repo for features worth extending into Pi
State: Done

Use the orchestration system from [PI-9](https://linear.app/gautambh/issue/PI-9/research-orchestration-extensions-and-configure-parallel-agent-system) to run a full audit of the agents repo. Identify features worth porting to Pi.

Requirements:

* Must use the team system implemented in [PI-9](https

---

## PI-11 — Setup Linear Agent Settings
State: Done

@gautam said in [PI-1](https://linear.app/gautambh/issue/PI-1/set-up-pi-as-a-linear-app-for-webhooks-and-events#comment-07a6395c):

> In the API page, we need to add a callback and Webhook URL. Then generate the client ID, secret, app token, and user token. Only then can Pi be added as a native agen

---

## PI-12 — Setup and Configure Pi MCP
State: Done

---

## PI-13 — Implement Code Standards
State: In Progress

Attaching recommendation from coding agents who have been very miserable the past few week due to poor practices early on. 

---

## PI-14 — Pre-commit validation hook for .pi/ structure and file size limits
State: Done

Add .pi/scripts/validate-structure.sh to the pre-commit hook chain. Also enforce growth budgets: memory files max 200 lines, max 20 branches, max 10 stashes. Catches bloat and misplaced files before commit.

From post-mortem root cause #4 (unbounded growth) and #6 (incomplete manifests).

---

## PI-15 — Deploy verification gate — post-merge smoke test
State: Done

After every PR merge to main, verify the code is actually running locally. Health check all services, verify version stamps. Prevents ghost features.

From post-mortem root cause #1 (PR merged but never deployed).

---

## PI-16 — Serialized git access with flock
State: Done

Implement flock-based single-writer for all git operations in automation scripts. Prevent concurrent git operations from EOD cron, task reminder, and any future crons.

From post-mortem root cause #3 (race conditions in concurrent automation).

---

## PI-17 — E2E smoke test script for all Pi services
State: Done

Create scripts/smoke-test.sh that verifies:

1. SendBlue webhook healthy (port 3001)
2. Linear webhook healthy (port 3002)
3. MCP bridge healthy (port 3100)
4. Tailscale funnel reachable
5. Pi extension loaded
6. iMessage send/receive round trip

Run after every deploy and on daily cron.

---

## PI-18 — Memory file growth budgets with auto-curation
State: Done

Enforce line limits on memory files:

* [learnings.md](<http://learnings.md>): max 200 lines (archive older entries)
* [todo.md](<http://todo.md>): max 100 lines (archive completed items monthly)
* [changelog.md](<http://changelog.md>): max 300 lines (archive by month)

Pre-commit hook rejects overs

---

## PI-19 — Checkpoint before compaction — automatic state save
State: Done

Before any compaction event, automatically write:

1. [state.md](<http://state.md>) with current phase/progress
2. [context.md](<http://context.md>) with what's needed for next session
3. Uncommitted changes stashed with descriptive message

Implement as session_before_compact hook in pi-memory exte

---

## PI-2 — Study Pi codebase: extensions API, skills, session management, compaction
State: Done

Must understand own framework before building on it. Read and internalize: [extensions.md](<http://extensions.md>), [skills.md](<http://skills.md>), [settings.md](<http://settings.md>), [compaction.md](<http://compaction.md>), [session.md](<http://session.md>). Study examples.

---

## PI-20 — Role-based permission profiles for sub-agents
State: Done

Define explicit tool sets per agent role:

* orchestrator: read, imessage, linear tools only (no bash, no write)
* worker-full: all tools
* worker-readonly: read, grep, find, ls only
* reviewer: read, grep, find, ls, bash (git diff only)

Assign at spawn, don't inherit from parent.

From post-mortem

---

## PI-21 — Atomic git transaction wrapper
State: Todo

Wrap all git workflows (stash/add/commit/push) in a transactional helper that rolls back on failure. Never leave a stash without a pop. Prevents the 95-stash crisis and branch corruption from the agents repo.

From PR audit: PRs #499, #552.

---

## PI-22 — Cross-platform CI validation for shell scripts
State: Todo

Run all shell scripts through shellcheck. Test BSD vs GNU tool differences (sed -i, find, etc). Use gsed explicitly when GNU behavior is needed. The agents repo had multiple broken deploys from BSD sed incompatibility.

From PR audit: PRs #500, #551, #613-616.

---

## PI-23 — Duplicate PR detection gate
State: Todo

Before creating a PR, check gh pr list --head <branch> for existing open/closed PRs. If closed PRs exist, require reading their close reason before retrying. Never reuse a feature branch for unrelated work.

From PR audit: 9 duplicate clusters found, feat/ai-501 had 4 PRs for the same feature.

---

## PI-24 — Regression test requirements for new features
State: Todo

Every feature must have automated tests before merging. Define minimum test coverage policy. The agents repo memory system shipped with zero tests and needed 3 retroactive test PRs.

From PR audit: PRs #565, #566, #567, #572.

---

## PI-25 — Build compaction extension
State: Done

Refactor pi-memory extension into multi-file structure with proper compaction checkpoint, custom summary, context monitoring, and bootstrap loading.

Plan: .pi/projects/memory-compaction-system/compaction-extension/plan.md
Spec: .pi/projects/memory-compaction-system/compaction-extension/spec.md

---

## PI-26 — Create paths.ts — shared constants and helpers
State: Done

Create \~/.pi/agent/extensions/pi-memory/paths.ts with PI_DIR, MEMORY_DIR, PROJECTS_DIR constants, readFileOr() helper, and getActiveProject() function. See [spec.md](<http://spec.md>) for exact code.

---

## PI-27 — Create bootstrap.ts — session_start handler
State: Done

Create \~/.pi/agent/extensions/pi-memory/bootstrap.ts. Registers session_start handler that loads [todo.md](<http://todo.md>), active project state+context, identity files ([pi.md](<http://pi.md>), [gautam.md](<http://gautam.md>)), and [RULES.md](<http://RULES.md>). Shows status bar. See [spec.md](<

---

## PI-28 — Create monitor.ts — context usage tracking
State: Done

Create \~/.pi/agent/extensions/pi-memory/monitor.ts. Registers turn_end handler that reads ctx.getContextUsage(), calculates percentage, shows in status bar. Nudges at 50% and 60%. See [spec.md](<http://spec.md>) for exact code.

---

## PI-29 — Create checkpoint.ts — pre-compaction + shutdown
State: Done

Create \~/.pi/agent/extensions/pi-memory/checkpoint.ts. Registers session_before_compact (timestamps [state.md](<http://state.md>), git commits, returns custom summary) and session_shutdown (dirty check + EOD reminder). See [spec.md](<http://spec.md>) for exact code.

---

## PI-3 — Build memory system Pi extension
State: Done

Extension that reads [todo.md](<http://todo.md>) + project state on session_start, monitors context for compaction nudges (30/50/60), saves state on session_shutdown, announces saves.

---

## PI-30 — Rewrite index.ts — wire modules together
State: Done

Replace \~/.pi/agent/extensions/pi-memory/index.ts with new entry point that imports and registers bootstrap, monitor, and checkpoint modules. \~10 lines. See [spec.md](<http://spec.md>) for exact code.

---

## PI-31 — Create .pi/settings.json — disable auto-compaction
State: Done

Create \~/pi-mono/.pi/settings.json with {"compaction": {"enabled": false}}. Disables auto-compaction at project level.

---

## PI-32 — Review and test all extension files
State: Done

Verify: all 5 files exist, TypeScript compiles, event handlers registered correctly, no circular imports, paths resolve. Run a manual test if possible.

---

## PI-33 — Configure Linear GitHub integration
State: Done

Configure the GitHub webhook for the Linear app.

Payload URL: [client-api.linear.app/connect/github/555bdee0-543b-40cc-8a45-3993bbeb371c](<https://client-api.linear.app/connect/github/555bdee0-543b-40cc-8a45-3993bbeb371c>)

Secret: `41a23312c3d68fb43079a7c0d52bee08`

Set the content type to `applic

---

## PI-34 — Build scheduled reminder system (cron + SendBlue)
State: Todo

When I need to follow up on something at a specific time, create a cron job that fires a SendBlue iMessage at the scheduled time. Parses due dates from Linear issues or explicit reminder requests.

Gap identified during orchestration shaping session. High priority, not in scope for Linear Integratio

---

## PI-35 — Configure Linear-based delegation to external coding agents
State: Backlog

Enable Pi to delegate work to other coding agents (Claude, Codex, Gemini, Cursor) through Linear issue assignment.

* Pi creates issues with specs in the description
* Pi assigns to the target agent's Linear app user
* Linear handles session creation and activity streaming
* Pi monitors via webhook 

---

## PI-36 — Set up Pi Agent email via agent mail
State: Backlog

Get Pi Agent configured with an email address for agent mail. Enables email-based communication and notifications outside of iMessage and Linear.

---

## PI-37 — Evaluate and configure Git Notes tooling for agent session logs
State: Backlog

Decide which Git Notes approach to use for attaching agent session logs to commits.

Options to evaluate:

1. **Git AI** ([usegitai.com](<http://usegitai.com>)) — line-level attribution, multi-agent, survives rebases/squashes. Most comprehensive.
2. **Memento** — session transcripts as git notes. Pr

---

## PI-38 — Scope cloud agent environment architecture
State: Backlog

Design the cloud environment model for isolated agent execution.

Key decisions:

* Cloud provider (Codespaces, Gitpod, ephemeral VMs)
* How environments map to Linear issues (per-project? per-parent-issue?)
* PR-based merge workflow
* Scaling model: me → sub-agents, me → sub-orchestrators → workers

---

## PI-39 — Follow up: scope Cloud Agent Environments project with Gautam
State: Backlog

Reminder to pick up the Cloud Agent Environments project scoping with Gautam. Created during orchestration shaping session 2026-03-30.

---

## PI-4 — Research orchestration patterns for sub-agent coordination
State: Done

How to manage and coordinate sub-agents effectively. Study Pi subagent extension, gstack patterns, general agent orchestration.

---

## PI-40 — Set up conventional branch naming with enforcement
State: Todo

Implement conventional branch naming ([https://conventional-branch.github.io/](<https://conventional-branch.github.io/>)) for the pi-mono repo.

Tasks:

1. Document the naming convention in [RULES.md](<http://RULES.md>)
2. Set up a pre-push hook or GitHub branch protection that enforces the conventi

---

## PI-41 — Naming Conventions
State: Todo

Establish and enforce naming conventions across all systems: Linear, GitHub, and files.

---

## PI-42 — Linear naming conventions
State: Todo

Naming rules for Linear entities.

---

## PI-43 — Linear project naming convention
State: Todo

Rules for naming Linear projects. E.g. 'Cloud Agent Environments', 'Linear Integration'.

---

## PI-44 — Linear issue naming convention
State: Todo

Rules for naming Linear issues. Clear, descriptive, action-oriented titles.

---

## PI-45 — Linear sub-issue naming convention
State: Todo

Rules for naming sub-issues. Should reference parent context and be specific to the task.

---

## PI-46 — GitHub naming conventions
State: Todo

Naming rules for GitHub branches, commits, and PRs.

---

## PI-47 — Branch naming convention (conventional branch)
State: Todo

Implement conventional branch naming: [https://conventional-branch.github.io/](<https://conventional-branch.github.io/>). Already in progress as PI-40.

---

## PI-48 — Commit naming convention (conventional commits)
State: Todo

Implement conventional commits: [https://gist.github.com/qoomon/5dfcdf8eec66a051ecd85625518cfd13](<https://gist.github.com/qoomon/5dfcdf8eec66a051ecd85625518cfd13>). Format: type(scope): description. Enforce via commit-msg hook.

---

## PI-49 — File naming conventions
State: Todo

Naming rules for all file categories in .pi/ and project folders.

---

## PI-5 — Research skill generation for structured planning workflows
State: Done

How to build Pi skills for stage-gated planning (brief to PRD to spec). Study gstack structured questions, Pi [skills.md](<http://skills.md>).

---

## PI-50 — Memory file naming convention
State: Todo

Rules for files in .pi/memory/: [pi.md](<http://pi.md>), [gautam.md](<http://gautam.md>), [learnings.md](<http://learnings.md>), [changelog.md](<http://changelog.md>), etc.

---

## PI-51 — Project file naming convention
State: Todo

Rules for files in .pi/projects/<slug>/: [state.md](<http://state.md>), [context.md](<http://context.md>), [prd.md](<http://prd.md>), [decisions.md](<http://decisions.md>), [spec.md](<http://spec.md>), [review.md](<http://review.md>), sessions/.

---

## PI-52 — Script and service naming convention
State: Todo

Rules for .pi/scripts/ and .pi/services/ naming.

---

## PI-53 — Agent definition naming convention
State: Todo

Rules for \~/.pi/agent/agents/ files: [scout.md](<http://scout.md>), [worker-full.md](<http://worker-full.md>), [researcher.md](<http://researcher.md>), etc.

---

## PI-54 — Name enforcement rules
State: Todo

Pre-commit and pre-push hooks that validate naming across branches, commits, and files. Reject non-conforming names.

---

## PI-55 — Set up Git AI for tracking AI-generated code
State: Backlog

## Overview

Set up Git AI tool to track AI-generated code and conversations across the pi-mono repository. This will enable better collaboration, context restoration, and understanding of AI involvement in the codebase.

## Tasks

- [X] Research Git AI tool and existing installation
- [ ] Configure

---

## PI-56 — Build sub-agent completion protocol
State: Todo

Enforce a strict completion protocol for all sub-agents. Every sub-agent must complete these steps before exiting:

1. Commit code with conventional commit message referencing Linear issue
2. Attach session log as git note
3. Push git notes
4. Update Linear sub-issue to In Review
5. Post completion 

---

## PI-57 — Build sub-agent wrapper script
State: Todo

Script that wraps pi -p invocations. After agent exits: verifies commit was made, attaches git note with session log, pushes notes, updates Linear issue to In Review, posts completion comment. Fails loudly if any step is missing.

---

## PI-58 — Create sub-agent definition template with completion rules
State: Todo

Template for agent .md files that includes mandatory completion instructions: commit, git note, Linear update. All new agent definitions derive from this template.

---

## PI-59 — Implement git note session logging
State: Todo

After each sub-agent commit, automatically attach a git note with: agent name, task ID, duration, tools used, files changed, session transcript summary. Integrate with Git AI if evaluation recommends it (PI-37).

---

## PI-6 — Set up GitHub validation checks for .pi/ directory structure
State: Done

Pre-commit hook or GitHub Action that validates:

* Files are in expected .pi/ locations
* Project folders have required files ([state.md](<http://state.md>), [context.md](<http://context.md>))
* No orphaned files outside schema
* Tasks in [todo.md](<http://todo.md>) have matching Linear issues

Cat

---

## PI-60 — Implement Linear status auto-update on sub-agent completion
State: Todo

Sub-agent posts AgentActivity to Linear during work. On completion: updates sub-issue state to In Review, posts comment with commit SHA + git note reference. Uses app token.

---

## PI-61 — Test: verify protocol works end-to-end
State: Todo

Spawn a test sub-agent, verify: commit exists, git note attached, Linear issue updated to In Review, completion comment posted. Fail the test if any step is missing.

---

## PI-62 — Set up Reviewer as a dedicated Linear app user
State: Todo

Register a Reviewer agent in Linear (like Pi Agent, Claude, Codex). Own identity, own OAuth app user, can post reviews attributed to 'Reviewer'. Setup via Settings > API > Applications.

---

## PI-63 — Build persistent reviewer agent with memory and review skill
State: Todo

Create a reviewer agent definition with:

* Persistent memory of common bugs found (updated after each review)
* [RULES.md](<http://RULES.md>) and coding standards as core context
* Structured review checklist skill
* Knowledge of codebase conventions
* Learns patterns over time (e.g. 'sub-agents do

---

## PI-64 — Enforce reviewer completion protocol
State: Todo

The reviewer agent must follow the same completion protocol as workers:

1. Post review findings as Linear comment on the sub-issue
2. Commit review notes as git note on the reviewed commit
3. Update sub-issue: approve (stays In Review for orchestrator) or request changes (back to In Progress)
4. St

---

## PI-65 — Configure multi-agent PR review gate
State: Todo

Set up a PR review workflow where PRs to main require approval from all 4 coding agents: Gemini, Codex, Claude, and Copilot. All must pass before merge is allowed.

Two review levels:

1. Sub-issue review: dedicated Reviewer agent checks individual sub-agent work
2. Branch merge review: all 4 coding

---

## PI-66 — Configure GitHub branch protection requiring 4 agent approvals
State: Todo

Set up branch protection on main in gbharg/pi-mono:

* Require PR before merge
* Require 4 approvals from: Gemini, Codex, Claude, Copilot
* Require status checks to pass
* No direct pushes to main

---

## PI-67 — Set up agent-triggered PR review workflow
State: Todo

When a PR is opened to main, automatically request reviews from all 4 coding agents. Each agent reviews in parallel via their Linear/GitHub integration. PR can only merge when all 4 approve.

---

## PI-68 — Configure review criteria per agent
State: Todo

Define what each agent focuses on in review:

* Claude: architecture, design patterns, correctness
* Codex: code quality, best practices, security
* Gemini: testing, edge cases, error handling
* Copilot: style, consistency, documentation

---

## PI-69 — Build dedicated memory agent for auto-compaction
State: Backlog

Specialized agent triggered by hooks (pre-compaction, session end). Reads conversation, extracts decisions/learnings/commitments/state, saves to files, updates Linear, generates compaction summary.

Not a coding agent — a conversation analyst that writes structured memory files.

Related: oh-my-pi h

---

## PI-7 — Build EOD checklist automation (hook or extension)
State: Todo

Create a Pi extension or hook that surfaces the EOD checklist at session end. Could prompt me to run through it, or validate items automatically where possible (e.g. check Linear sync, verify files committed).

---

## PI-70 — Research and implement agent usage analytics
State: Backlog

Capture logs and telemetry on agent usage: token consumption, task completion times, error rates, spawn patterns, review outcomes, compaction frequency. Use data to improve workflows, optimize costs, detect failure patterns.

Research agent spawned — report at \~/research-agent-analytics.md

---

## PI-71 — Migrate from Pi to oh-my-pi (omp) harness
State: In Progress

Switch orchestrator harness from badlogic/pi-mono to can1357/oh-my-pi.

Gains: task tool with isolation backends, autonomous memory, model roles, async background jobs, nested orchestration.

Migration steps:

* Install omp (DONE)
* Copy extensions (DONE: imessage-channel, pi-memory)
* Unpack bundle

---

## PI-8 — Set up nightly cron for EOD checklist
State: Done

Cron job that runs the EOD checklist automatically each night. Should verify all items and alert via iMessage (SendBlue) if anything is unchecked. Ensures no day closes without proper save/sync.

---

## PI-9 — Research orchestration extensions and configure parallel agent system
State: Done

Research 3 orchestration packages (pi-messenger-swarm, pi-teams, taskplane) and configure the best system for parallel agent coordination. May expand scope or build custom.

Requirements:

* Evaluate each package for fit with our orchestrator role
* Configure the chosen system
* Document what works 

---

