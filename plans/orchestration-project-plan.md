# Pi Orchestration Platform — Complete Linear Project Plan

**Version:** 1.0  
**Created:** 2026-03-30  
**Timeline:** 4 weeks starting 2026-04-07  
**Status:** Ready for Execution

---

## 1. Project Overview

### Name
**Pi Orchestration Platform v1.0**

### Goal
Transform Pi's current ad-hoc agent spawning into a production-grade multi-agent orchestration system capable of managing 50-100 concurrent AI agents with automated health monitoring, structured handoffs, persistent knowledge, and comprehensive cost tracking.

### Success Metrics
- **Automated recovery:** 70%+ of stalled agents recover without human intervention
- **Visibility:** 100% of agent activities visible in Linear within 5 seconds
- **Cost tracking:** Real-time spend visibility per agent, per model, per task
- **Knowledge reuse:** 80%+ reduction in redundant research across sessions
- **Scale capability:** Proven throughput of 50+ concurrent agents
- **False positive rate:** <5% of "stalled" agents that were actually working

### Timeline
**4 weeks (April 7 - May 5, 2026)**
- Week 1: Foundation — Shared infrastructure
- Week 2: Monitoring — Heartbeat and lifecycle
- Week 3: Intelligence — Handoffs and knowledge
- Week 4: Scale — Production readiness

### Current State Snapshot
- 26 agents spawned over 2 days successfully
- Zero automated monitoring or recovery
- Manual state tracking via Linear
- No cost visibility
- No knowledge persistence across sessions
- Ad-hoc agent prompts (no standardization)

---

## 2. Epics

### Epic 0: Shared Infrastructure
**Owner:** Worker agents  
**Duration:** Week 1 (3 days)  
**Dependencies:** None  
**Description:** Build the foundational components used by all other epics: unified Linear API client with rate limiting, webhook server and file watcher, agent status tracking, and standardized prompt templates. This infrastructure must be in place before any monitoring or lifecycle systems can be built.

**Key Deliverables:**
- `~/.pi/lib/linear-client.ts` — Unified API wrapper with caching
- `~/.pi/webhooks/server.ts` — HTTP endpoint for Linear webhooks
- `~/.pi/lib/agent-status.ts` — In-memory agent tracking
- `~/.agents/templates/` — Unified prompt templates for all roles

---

### Epic 1: Lifecycle State Machine
**Owner:** Worker agents  
**Duration:** Week 1-2 (4 days)  
**Dependencies:** Epic 0 (infrastructure)  
**Description:** Implement the formal state machine for agent lifecycle management using Linear workflow states, transition validation, and automated state changes based on agent activity. This provides the structural foundation for all agent coordination.

**Key Deliverables:**
- Linear workflow states configured (Backlog → Assigned → Active → In Review → Done)
- State transition validation logic
- Automated state transitions via webhooks
- State ID caching for performance

---

### Epic 2: Heartbeat & Stall Detection
**Owner:** Worker + Researcher agents  
**Duration:** Week 2 (4 days)  
**Dependencies:** Epic 0, Epic 1  
**Description:** Build the active monitoring system that detects when agents stop responding and automatically initiates recovery. Includes heartbeat protocol, stall detection algorithm, ping mechanism, graceful termination, and retry cascade with partial work preservation.

**Key Deliverables:**
- Heartbeat protocol in agent prompts
- Webhook + polling hybrid detection
- Stall detection with role-specific thresholds
- Ping → kill → retry recovery cascade
- Git notes preservation of partial work

---

### Epic 3: Handoff Notes Protocol
**Owner:** Worker agents  
**Duration:** Week 3 (3 days)  
**Dependencies:** Epic 1, Epic 2  
**Description:** Establish mandatory structured handoff notes that agents write before transitioning to review, providing context about their work, decisions, concerns, and self-review findings. This dramatically improves reviewer efficiency and code quality.

**Key Deliverables:**
- Handoff note template and examples
- Enforcement in state transition logic
- Handoff validator with completeness checking
- Reviewer prompt integration for handoff consumption
- Self-review checklists

---

### Epic 4: Knowledge Persistence
**Owner:** Researcher agents  
**Duration:** Week 3-4 (5 days)  
**Dependencies:** Epic 0 (parallel with other epics)  
**Description:** Implement the knowledge extraction and injection system that captures learnings from research sessions and makes them available to future agents. Includes storage architecture, AI-powered extraction, relevance ranking, and cold-start bootstrap from existing sessions.

**Key Deliverables:**
- `~/knowledge/` storage structure (system/repos/sessions)
- Knowledge extraction pipeline
- Knowledge injection at agent spawn
- Relevance ranking algorithm
- Bootstrap from 7 existing research sessions

---

### Epic 5: Cost & Observability
**Owner:** Worker agents (setup)  
**Duration:** Week 2-4 (parallel, 2 days effort)  
**Dependencies:** Epic 0  
**Description:** Adopt Portkey AI Gateway for automatic cost and token tracking across all LLM calls. Provides real-time spend visibility, per-agent analytics, and request logging without code changes beyond routing configuration.

**Key Deliverables:**
- Portkey gateway self-hosted deployment
- All agent LLM calls routed through gateway
- Cost dashboard and alerts
- Per-agent, per-model, per-session spend tracking

---

### Epic 6: Scale Readiness
**Owner:** Worker agents  
**Duration:** Week 4 (4 days)  
**Dependencies:** All other epics  
**Description:** Prepare the system for 50-100 concurrent agents through Redis buffering, concurrency limits, load testing, and production hardening. Ensures the system can handle scale without hitting Linear API rate limits or creating race conditions.

**Key Deliverables:**
- Redis + BullMQ local queue buffer
- Linear sync service (batched API calls)
- Concurrency limit enforcement
- Load test suite (simulate 50 agents)
- Production monitoring and alerting

---

## 3. Issues (Complete Task Breakdown)

### Epic 0: Shared Infrastructure

#### PI-001: Create unified Linear API client with rate limiting
- **Epic**: Epic 0: Shared Infrastructure
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P0
- **Estimate**: M (4h)
- **Blocked by**: none
- **Phase**: 1
- **Spec reference**: 00-integration-plan.md § 3.3

**Description**: Build a TypeScript class that wraps the Linear GraphQL API with built-in rate limiting, connection pooling, and response caching. This client will be used by all components that interact with Linear (heartbeat, lifecycle, handoffs). Must implement exponential backoff on 429 errors, cache workflow state IDs for 1 hour, and provide typed methods for common operations (create comment, update issue, transition state).

**Acceptance Criteria**:
- [ ] `LinearClient` class exports typed methods: `getWorkflowStates()`, `getStateId(name)`, `transitionIssue()`, `createComment()`, `getComments()`, `updateIssue()`
- [ ] Rate limiter tracks API calls and enforces max 100 calls/hour budget
- [ ] State ID cache reduces repeated queries (1-hour TTL)
- [ ] 429 responses trigger exponential backoff (1s, 2s, 4s, 8s, fail)
- [ ] Unit tests cover happy path, rate limiting, and error cases

---

#### PI-002: Implement Linear webhook server and file watcher
- **Epic**: Epic 0: Shared Infrastructure
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P0
- **Estimate**: M (4h)
- **Blocked by**: none
- **Phase**: 1
- **Spec reference**: 00-integration-plan.md § 3.2

**Description**: Create an HTTP webhook endpoint that receives Linear events (issue updates, comment creates, AgentActivity) and writes them as JSON files to `~/.pi/linear-inbox/`. Build a file watcher using `fs.watch()` that monitors this directory and dispatches events to registered handlers. The webhook server must verify Linear's signature, handle concurrent requests, and ensure no events are dropped.

**Acceptance Criteria**:
- [ ] Webhook HTTP server listens on configurable port (default 3456)
- [ ] Verifies Linear webhook signature using HMAC
- [ ] Writes webhook payloads to `~/.pi/linear-inbox/{timestamp}-{type}.json`
- [ ] File watcher detects new JSON files and calls registered handlers
- [ ] Handler registration API: `watcher.onWebhook(eventType, callback)`
- [ ] Integration test: send mock webhook → verify handler called

---

#### PI-003: Build agent status tracking system
- **Epic**: Epic 0: Shared Infrastructure
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P0
- **Estimate**: L (6h)
- **Blocked by**: PI-001
- **Phase**: 1
- **Spec reference**: 00-integration-plan.md § 3.3, 01-heartbeat § 3.1

**Description**: Implement an in-memory Map-based agent status tracker with persistent file backup. Each agent entry includes: issue ID, session ID, role, state, timing data (assigned/started/lastHeartbeat), retry count, branch name, and version number for optimistic locking. Must support atomic updates with version checking to prevent race conditions. Automatically saves to `~/.pi/data/agent-status.json` every 30 seconds and loads on startup.

**Acceptance Criteria**:
- [ ] `AgentStatusStore` class with CRUD operations: `get()`, `set()`, `delete()`, `getAll()`
- [ ] Query methods: `getByState(state)`, `getByRole(role)`, `getActive()`
- [ ] Optimistic locking: `updateState(id, newState, expectedVersion)` returns false on conflict
- [ ] Automatic persistence every 30s + on process exit
- [ ] Load from file on startup with error recovery
- [ ] Unit tests covering concurrent updates and version conflicts

---

#### PI-004: Create unified agent prompt templates
- **Epic**: Epic 0: Shared Infrastructure
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P0
- **Estimate**: M (5h)
- **Blocked by**: none
- **Phase**: 1
- **Spec reference**: 00-integration-plan.md § 8

**Description**: Write three unified prompt template markdown files that incorporate heartbeat protocol, state awareness, and role-specific instructions. Templates must be parameterized with variables like {{task-description}}, {{issue-identifier}}, {{branch-name}}, etc. Each template should include: heartbeat requirements, handoff protocol, state transition rules, and escalation keywords.

**Acceptance Criteria**:
- [ ] `~/.agents/templates/worker-unified.md` created with full template
- [ ] `~/.agents/templates/researcher-unified.md` created with full template
- [ ] `~/.agents/templates/reviewer-unified.md` created with full template
- [ ] All templates include heartbeat protocol section (5min/7min/10min intervals)
- [ ] All templates include state awareness section with valid transitions
- [ ] Templates are parameterized (no hardcoded values)
- [ ] Template rendering function: `renderTemplate(templateName, vars) => string`

---

#### PI-005: Set up git notes system for session logs
- **Epic**: Epic 0: Shared Infrastructure
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P1
- **Estimate**: S (3h)
- **Blocked by**: none
- **Phase**: 1
- **Spec reference**: 00-integration-plan.md § 3.5, 01-heartbeat § 7.3

**Description**: Create a `GitNotesManager` class that saves and loads agent session data using git notes under the `notes/agent-sessions/` namespace. Each session gets a note with structured metadata: session ID, issue ID, state, timing, heartbeats, commits, handoff status, and termination reason. Must handle git operations safely with proper error handling.

**Acceptance Criteria**:
- [ ] `GitNotesManager` class with methods: `save(sessionId, data)`, `load(sessionId)`, `list()`, `search(query)`
- [ ] Notes saved to `refs/notes/agent-sessions/{session-id}`
- [ ] Structured note format with all metadata fields from spec
- [ ] Handles git errors gracefully (repo not initialized, push failures)
- [ ] Pushes notes to remote: `git push origin refs/notes/agent-sessions/*`
- [ ] Unit tests with temporary git repos

---

#### PI-006: Create state ID cache system
- **Epic**: Epic 0: Shared Infrastructure
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P1
- **Estimate**: S (2h)
- **Blocked by**: PI-001
- **Phase**: 1
- **Spec reference**: 03-lifecycle § 1.5

**Description**: Build a caching layer that maps Linear workflow state names to state IDs with 1-hour TTL. This reduces API calls when transitioning agent states. Cache should persist to `~/.pi/cache/linear-states.json` and automatically refresh when expired or on cache miss. Include team ID metadata to detect workspace changes.

**Acceptance Criteria**:
- [ ] `StateIdCache` class with methods: `get(stateName)`, `refresh()`, `isExpired()`
- [ ] Caches state name → {id, type, color} mapping
- [ ] 1-hour TTL, auto-refresh on expiry
- [ ] Persists to file for faster cold starts
- [ ] Detects team ID changes and invalidates cache
- [ ] Unit tests covering cache hits, misses, and expiry

---

### Epic 1: Lifecycle State Machine

#### PI-007: Design and document complete state machine
- **Epic**: Epic 1: Lifecycle State Machine
- **Type**: research
- **Agent**: researcher
- **Model**: opus
- **Env**: local
- **Priority**: P0
- **Estimate**: M (4h)
- **Blocked by**: none
- **Phase**: 1
- **Spec reference**: 03-lifecycle-state-machine.md (entire document)

**Description**: Research and document the complete agent lifecycle state machine including all states (Backlog, Assigned, Active, Blocked, In Review, Done, Stalled, Retrying, Failed, Abandoned), valid transitions between states, trigger conditions, and edge cases. Output should be a comprehensive markdown document with state diagrams, transition tables, and rationale for each state and transition rule.

**Acceptance Criteria**:
- [ ] State diagram in ASCII or Mermaid format
- [ ] Complete transition matrix (from × to) with all valid/invalid transitions
- [ ] Each state documented with: semantic meaning, entry conditions, exit conditions
- [ ] Each transition documented with: trigger, preconditions, actions, postconditions
- [ ] Edge cases documented (concurrent transitions, race conditions, recovery scenarios)
- [ ] Saved to `~/.pi/docs/lifecycle-state-machine.md`

---

#### PI-008: Configure Linear workflow states
- **Epic**: Epic 1: Lifecycle State Machine
- **Type**: setup
- **Agent**: pi-direct
- **Model**: any
- **Env**: local
- **Priority**: P0
- **Estimate**: S (2h)
- **Blocked by**: PI-007
- **Phase**: 1
- **Spec reference**: 00-integration-plan.md § 9, 03-lifecycle § 1

**Description**: Create all required workflow states in Linear workspace using the GraphQL API. States to create: Backlog (backlog/gray), Assigned (unstarted/blue), Active (started/yellow), Blocked (started/orange), In Review (started/purple), Done (completed/green), Stalled (canceled/red), Retrying (unstarted/blue), Failed (canceled/red), Abandoned (canceled/gray). Run the setup script once and verify all states are visible in Linear UI.

**Acceptance Criteria**:
- [ ] Setup script: `~/.pi/scripts/setup-linear-workflow.ts`
- [ ] All 10 workflow states created with correct types and colors
- [ ] States visible in Linear → Settings → Workflow
- [ ] State ID mapping cached to `~/.pi/cache/linear-states.json`
- [ ] Documentation in `~/.pi/docs/linear-setup.md` with screenshots

---

#### PI-009: Implement state transition validator
- **Epic**: Epic 1: Lifecycle State Machine
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P0
- **Estimate**: M (5h)
- **Blocked by**: PI-007, PI-008
- **Phase**: 1
- **Spec reference**: 03-lifecycle § 2

**Description**: Build the state transition validation engine that enforces the state machine rules. When an agent or orchestrator attempts to change an issue's state, this validator checks if the transition is allowed based on the transition matrix. If invalid, return error with explanation. If valid, allow transition and log it. Must handle special cases like manual overrides and automated transitions differently.

**Acceptance Criteria**:
- [ ] `StateTransitionValidator` class with method: `validate(issueId, fromState, toState, triggeredBy) => {allowed: boolean, reason?: string}`
- [ ] Implements full transition matrix from PI-007
- [ ] Distinguishes automated (🤖) vs manual (👤) transitions
- [ ] Provides helpful error messages for invalid transitions
- [ ] Logs all transition attempts (allowed and denied) to `~/.pi/logs/state-transitions.log`
- [ ] Unit tests covering all valid and invalid transitions

---

#### PI-010: Build automated state transition engine
- **Epic**: Epic 1: Lifecycle State Machine
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P0
- **Estimate**: L (6h)
- **Blocked by**: PI-009, PI-001, PI-002
- **Phase**: 1
- **Spec reference**: 03-lifecycle § 2

**Description**: Implement the automatic state transition logic that responds to agent events. Key transitions: first heartbeat → Active, heartbeat with "blocked" → Blocked, code pushed + handoff → In Review, review approved → Done. This engine listens to webhook events, checks transition validity, updates Linear, and notifies other systems. Must be idempotent and handle concurrent events safely.

**Acceptance Criteria**:
- [ ] `AutomatedTransitionEngine` handles webhook events
- [ ] Detects first heartbeat → transitions Assigned to Active
- [ ] Detects "blocked" status → transitions Active to Blocked
- [ ] Detects code push + handoff → transitions Active to In Review
- [ ] Detects review approval → transitions In Review to Done
- [ ] All transitions validated before execution
- [ ] Integration test simulating full lifecycle with mock webhooks

---

#### PI-011: Implement manual transition API and CLI
- **Epic**: Epic 1: Lifecycle State Machine
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P1
- **Estimate**: M (4h)
- **Blocked by**: PI-009
- **Phase**: 1
- **Spec reference**: 03-lifecycle § 2

**Description**: Create a CLI tool and API for manual state transitions with human override capability. Supports commands like `pi transition PI-123 --to Done --reason "Manual completion"`. Logs all manual transitions with username and reason. Provides safety confirmation for potentially destructive transitions (e.g., Abandoned, Failed).

**Acceptance Criteria**:
- [ ] CLI command: `pi transition <issue-id> --to <state> --reason <text>`
- [ ] API function: `manualTransition(issueId, toState, reason, user)`
- [ ] Validates transition before execution
- [ ] Confirms destructive transitions (Abandoned, Failed) with Y/N prompt
- [ ] Logs manual transitions to `~/.pi/logs/manual-transitions.log`
- [ ] Help text with examples: `pi transition --help`

---

### Epic 2: Heartbeat & Stall Detection

#### PI-012: Implement heartbeat protocol in agent prompts
- **Epic**: Epic 2: Heartbeat & Stall Detection
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P0
- **Estimate**: M (4h)
- **Blocked by**: PI-004
- **Phase**: 2
- **Spec reference**: 01-heartbeat § 6, 00-integration § 8

**Description**: Enhance the unified agent prompt templates (from PI-004) with detailed heartbeat instructions including format, frequency, content requirements, and escalation keywords. Workers heartbeat every 5min, researchers every 10min, reviewers every 7min. Include JSON schema, markdown template, and fallback protocols if API fails.

**Acceptance Criteria**:
- [ ] Heartbeat sections added to all three prompt templates
- [ ] Clear instructions on frequency per role (5/10/7 minutes)
- [ ] JSON format documented: {timestamp, status, current, progress, next, blockers}
- [ ] Markdown fallback format provided
- [ ] Escalation keywords documented: "blocked", "context exhausted", "nearly done"
- [ ] Pre-flight checklist: post first heartbeat before starting work

---

#### PI-013: Build heartbeat detection via webhooks
- **Epic**: Epic 2: Heartbeat & Stall Detection
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P0
- **Estimate**: M (5h)
- **Blocked by**: PI-002, PI-003, PI-010
- **Phase**: 2
- **Spec reference**: 01-heartbeat § 3

**Description**: Create webhook handlers that detect heartbeat events from Linear (AgentActivity creates, Comment creates with heartbeat markers). When heartbeat detected, update agent status map with timestamp, parse structured content (JSON or markdown), and check for escalation keywords. This is the primary (real-time) heartbeat detection mechanism.

**Acceptance Criteria**:
- [ ] Webhook handler registered for `Comment.created` events
- [ ] Webhook handler registered for `AgentActivity.created` events
- [ ] Detects heartbeat marker: "## Heartbeat" or JSON format
- [ ] Parses heartbeat data: timestamp, status, progress, blockers
- [ ] Updates agent status map: `lastHeartbeat`, `lastActivity`, `version++`
- [ ] Detects escalation keywords and triggers handlers
- [ ] Unit tests with mock webhook payloads

---

#### PI-014: Build polling-based heartbeat fallback
- **Epic**: Epic 2: Heartbeat & Stall Detection
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P0
- **Estimate**: M (4h)
- **Blocked by**: PI-001, PI-003
- **Phase**: 2
- **Spec reference**: 01-heartbeat § 3

**Description**: Implement a polling loop (cron every 5 minutes) that queries Linear API for agents without recent webhooks. This catches cases where webhooks fail to deliver. For each agent without webhook in last 10 minutes, query Linear API for latest activity and update status map. Implements smart polling: only poll agents that need it, skip agents with recent webhooks.

**Acceptance Criteria**:
- [ ] Cron job: `~/.pi/scripts/poll-agent-status.ts` runs every 5 minutes
- [ ] Identifies agents without recent webhooks (last 10+ minutes)
- [ ] Queries Linear API for latest comment/activity per identified agent
- [ ] Updates agent status map if activity found
- [ ] Logs polling stats: agents checked, API calls made, updates found
- [ ] Configurable: polling interval, webhook grace period

---

#### PI-015: Implement stall detection algorithm
- **Epic**: Epic 2: Heartbeat & Stall Detection
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P0
- **Estimate**: L (6h)
- **Blocked by**: PI-003, PI-013, PI-014
- **Phase**: 2
- **Spec reference**: 01-heartbeat § 2

**Description**: Build the core stall detection logic that identifies agents that have stopped responding. Implements role-specific thresholds (workers 20min, researchers 60min, reviewers 30min) with grace period modifiers based on last activity content ("reading" → +50% threshold, "error" → -50%). Checks for context exhaustion via repetitive heartbeats. Runs every 5 minutes via cron.

**Acceptance Criteria**:
- [ ] `StallDetector` class with method: `detectStalledAgents() => AgentStatus[]`
- [ ] Role-specific thresholds: worker 20min, researcher 60min, reviewer 30min
- [ ] Grace period logic: "reading/analyzing" → 1.5x, "error/stuck" → 0.5x
- [ ] Context exhaustion detection: same message 3+ times or progress stagnant
- [ ] Returns list of stalled agents with stalledAt timestamp and reason
- [ ] Unit tests covering various stall scenarios and grace periods

---

#### PI-016: Build ping mechanism for stalled agents
- **Epic**: Epic 2: Heartbeat & Stall Detection
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P0
- **Estimate**: M (4h)
- **Blocked by**: PI-015, PI-001
- **Phase**: 2
- **Spec reference**: 01-heartbeat § 4.1

**Description**: Implement the first stage of recovery: send a "status check" comment to the stalled agent asking if they're still working, blocked, or nearly done. Wait 5 minutes for response. If response arrives, reset stall timer and continue monitoring. If no response, proceed to termination. Ping comment must be clear, actionable, and include urgency.

**Acceptance Criteria**:
- [ ] `pingAgent(issueId, agentStatus)` creates Linear comment with status check
- [ ] Ping message includes: time since last heartbeat, request for status, 5-minute deadline
- [ ] Marks agent as "pinged" with timestamp in status map
- [ ] Waits 5 minutes before proceeding to termination
- [ ] Detects response via webhook (any new activity from agent)
- [ ] Cancels termination if response received within grace period

---

#### PI-017: Implement graceful agent termination
- **Epic**: Epic 2: Heartbeat & Stall Detection
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P0
- **Estimate**: M (5h)
- **Blocked by**: PI-016, PI-005
- **Phase**: 2
- **Spec reference**: 01-heartbeat § 4.1

**Description**: Build the termination procedure for stalled agents: kill process (if local), save session to git notes, transition Linear state to "Stalled", post termination comment with context, and prepare for retry. Must handle partial work (commits on branch) and preserve all session data for retry agent. Gracefully handles cases where process is already dead or stuck in git operations.

**Acceptance Criteria**:
- [ ] `terminateAgent(issueId, reason)` kills agent process via SIGTERM then SIGKILL
- [ ] Saves complete session to git notes via `GitNotesManager`
- [ ] Transitions Linear issue to "Stalled" state
- [ ] Posts termination comment with: reason, duration, partial work, session log reference
- [ ] Counts commits on branch: `git rev-list origin/main..origin/{branch}`
- [ ] Handles errors: process already dead, git operations in progress

---

#### PI-018: Build retry context builder
- **Epic**: Epic 2: Heartbeat & Stall Detection
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P0
- **Estimate**: M (5h)
- **Blocked by**: PI-017, PI-005
- **Phase**: 2
- **Spec reference**: 01-heartbeat § 4.1

**Description**: Create the context package builder that assembles all necessary information for retry agents: original session ID, branch name, commits, last heartbeat data, stall reason, partial work summary (git diff), retry attempt number, and max retries. Generates the retry prompt addition that explains to the new agent what happened and how to proceed.

**Acceptance Criteria**:
- [ ] `buildRetryContext(issueId, stalledAgentStatus) => RetryContext`
- [ ] Collects: sessionId, branchName, commits list, lastHeartbeat, stalledAt, duration
- [ ] Generates partial work summary: `git diff --stat` + preview
- [ ] Increments retry count, checks against max retries (2)
- [ ] Generates retry prompt text with context and instructions
- [ ] Saves retry context to `~/.pi/retry-contexts/{session-id}.json`

---

#### PI-019: Implement retry cascade and agent spawning
- **Epic**: Epic 2: Heartbeat & Stall Detection
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P0
- **Estimate**: L (6h)
- **Blocked by**: PI-018, PI-009, PI-004
- **Phase**: 2
- **Spec reference**: 01-heartbeat § 4.1

**Description**: Build the complete retry cascade: check retry budget, transition state to "Retrying", spawn fresh agent with retry context, monitor new agent. If retry also fails and max retries exceeded, escalate to "Failed" state with detailed failure report. Includes spawning logic that injects retry context into agent prompt and assigns to same Linear issue.

**Acceptance Criteria**:
- [ ] `initiateRetry(issueId, retryContext)` checks retry budget (max 2)
- [ ] Transitions state to "Retrying" if under budget
- [ ] Spawns new agent with prompt including retry context
- [ ] New agent assigned to same Linear issue, same branch
- [ ] Posts retry comment: "Retry attempt N/2, spawning fresh agent..."
- [ ] If max retries exceeded, transitions to "Failed" with report
- [ ] Integration test: stall → retry → success and stall → retry → fail paths

---

#### PI-020: Build escalation and failure reporting
- **Epic**: Epic 2: Heartbeat & Stall Detection
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P1
- **Estimate**: M (4h)
- **Blocked by**: PI-019
- **Phase**: 2
- **Spec reference**: 01-heartbeat § 5.4

**Description**: Implement the failure escalation system that activates when retry budget is exhausted. Generates comprehensive failure report analyzing all attempts, identifying common failure patterns, suggesting next actions, and notifying humans via Linear comment with @gautam mention. Report should help humans quickly understand what went wrong and how to proceed.

**Acceptance Criteria**:
- [ ] `escalateToHuman(issueId, attempts)` transitions state to "Failed"
- [ ] Generates failure report with attempt history table
- [ ] Analyzes common failure pattern (all attempts stalled at same point?)
- [ ] Provides recommendations: decompose task, clarify requirements, manual review
- [ ] Posts comment with @gautam mention
- [ ] Removes issue from active monitoring (terminal state)

---

### Epic 3: Handoff Notes Protocol

#### PI-021: Design handoff note template and examples
- **Epic**: Epic 3: Handoff Notes Protocol
- **Type**: research
- **Agent**: researcher
- **Model**: opus
- **Env**: local
- **Priority**: P0
- **Estimate**: M (4h)
- **Blocked by**: none
- **Phase**: 3
- **Spec reference**: 02-handoff-notes-protocol.md § 1-2

**Description**: Research and design the complete handoff note template structure including mandatory sections (Summary, Changes, Self-Review), optional sections (Context, Related), and three complete example handoffs (worker feature, researcher findings, reviewer summary). Output should provide clear guidance on what makes a good handoff note and how to write one.

**Acceptance Criteria**:
- [ ] Complete template markdown with all sections documented
- [ ] Minimum viable handoff (quick tasks) template
- [ ] Gold standard handoff (complex tasks) template
- [ ] Three filled-in examples: worker building feature, researcher findings, reviewer summary
- [ ] Guidelines on what to include vs exclude
- [ ] Self-review checklist integrated into template
- [ ] Saved to `~/.pi/docs/handoff-template.md`

---

#### PI-022: Update agent prompts with handoff requirements
- **Epic**: Epic 3: Handoff Notes Protocol
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P0
- **Estimate**: M (3h)
- **Blocked by**: PI-021, PI-004
- **Phase**: 3
- **Spec reference**: 02-handoff § 4.2, 00-integration § 8

**Description**: Enhance the worker and reviewer prompt templates to include handoff note requirements. Workers must know they need to write handoffs before requesting review. Reviewers must know to expect and consume handoffs. Include the template structure, timing (when to write), enforcement (transition will be blocked), and examples.

**Acceptance Criteria**:
- [ ] Worker prompt updated with handoff section: template, timing, enforcement
- [ ] Reviewer prompt updated with handoff consumption section
- [ ] Templates included inline (workers see structure, reviewers see usage)
- [ ] Clear explanation of why handoffs are required
- [ ] Consequences documented: transition blocked if handoff missing
- [ ] Both prompts re-tested with mock scenarios

---

#### PI-023: Build handoff note validator
- **Epic**: Epic 3: Handoff Notes Protocol
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P0
- **Estimate**: M (5h)
- **Blocked by**: PI-021, PI-001
- **Phase**: 3
- **Spec reference**: 02-handoff § 4.3

**Description**: Implement the handoff validator that checks if a Linear issue has a valid handoff note before allowing transition to "In Review". Searches recent comments for handoff marker (🎯 HANDOFF NOTES), parses structure, validates completeness (required sections present, minimum length, not template placeholders), and returns validation result with specific errors if incomplete.

**Acceptance Criteria**:
- [ ] `HandoffValidator` class with method: `validate(issueId) => {valid: boolean, errors: string[]}`
- [ ] Searches Linear comments for "🎯 HANDOFF NOTES" marker
- [ ] Validates required sections: Summary, Changes Made, Self-Review Findings
- [ ] Checks minimum content length (200 chars)
- [ ] Detects template placeholders: `[1-2 sentence overview]`
- [ ] Returns helpful error messages for each missing/incomplete section
- [ ] Unit tests with valid and invalid handoff examples

---

#### PI-024: Integrate handoff validation with state machine
- **Epic**: Epic 3: Handoff Notes Protocol
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P0
- **Estimate**: M (4h)
- **Blocked by**: PI-023, PI-010
- **Phase**: 3
- **Spec reference**: 02-handoff § 4.3

**Description**: Add handoff validation check to the state transition validator (PI-009). When an agent tries to transition from Active to In Review, validate handoff exists and is complete. If invalid, reject transition and post comment explaining what's missing. Agent must fix handoff and retry. This enforces the handoff requirement at the infrastructure level.

**Acceptance Criteria**:
- [ ] State transition validator checks handoffs before Active → In Review
- [ ] Calls `HandoffValidator.validate(issueId)` during transition
- [ ] Rejects transition if validation fails
- [ ] Posts rejection comment with specific errors from validator
- [ ] Allows transition if handoff valid
- [ ] Logs handoff validation attempts (pass/fail) for analytics

---

#### PI-025: Build handoff note parser for reviewers
- **Epic**: Epic 3: Handoff Notes Protocol
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P1
- **Estimate**: M (4h)
- **Blocked by**: PI-023
- **Phase**: 3
- **Spec reference**: 02-handoff § 5.1

**Description**: Create a parser that extracts structured data from handoff notes: summary, objective, changes, key decisions, self-review findings, concerns. This parsed data is injected into the reviewer's prompt to provide context. Parser should handle both markdown structure and freeform text, extracting what it can even if formatting isn't perfect.

**Acceptance Criteria**:
- [ ] `HandoffParser` class with method: `parse(handoffMarkdown) => ParsedHandoff`
- [ ] Extracts sections: summary, objective, changes, selfReview, concerns
- [ ] Extracts concerns list from self-review section
- [ ] Handles variations in markdown formatting
- [ ] Returns structured object with all fields (empty string if section missing)
- [ ] Unit tests with various handoff formats

---

#### PI-026: Enhance reviewer prompt with handoff consumption
- **Epic**: Epic 3: Handoff Notes Protocol
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P1
- **Estimate**: S (3h)
- **Blocked by**: PI-025, PI-022
- **Phase**: 3
- **Spec reference**: 02-handoff § 5.2

**Description**: Update the reviewer agent spawning logic to fetch handoff notes, parse them, and inject into the reviewer's prompt. The reviewer should receive: author's summary, key decisions, self-review findings, and especially the author's concerns (highlighted as priority review areas). This makes reviews context-aware and more effective.

**Acceptance Criteria**:
- [ ] Reviewer spawn function fetches handoff via Linear API
- [ ] Parses handoff using `HandoffParser`
- [ ] Injects parsed data into reviewer prompt template variables
- [ ] Highlights author's concerns as priority focus areas
- [ ] Includes author's self-review checklist (what was/wasn't verified)
- [ ] Integration test: spawn reviewer → verify handoff in prompt

---

### Epic 4: Knowledge Persistence

#### PI-027: Design knowledge storage architecture
- **Epic**: Epic 4: Knowledge Persistence
- **Type**: research
- **Agent**: researcher
- **Model**: opus
- **Env**: local
- **Priority**: P0
- **Estimate**: M (4h)
- **Blocked by**: none
- **Phase**: 3
- **Spec reference**: 04-knowledge-persistence.md § 1-2

**Description**: Research and design the complete knowledge storage system including directory structure (system/repos/sessions), file format (Markdown + YAML frontmatter), schema for knowledge entries, and storage decision matrix (what knowledge goes where, TTLs). Consider scalability, searchability, and integration with vector search later.

**Acceptance Criteria**:
- [ ] Directory structure documented: `~/knowledge/{system,repos,sessions}`
- [ ] Complete YAML schema for knowledge entries (identity, classification, lifecycle, context, relationships)
- [ ] File format examples for each knowledge type (discovery, pattern, reference, howto, gotcha)
- [ ] Storage decision matrix: which tier (system/repo/session) for each knowledge type
- [ ] TTL strategy documented (permanent, 1 year, 30 days, 7 days)
- [ ] Saved to `~/.pi/docs/knowledge-architecture.md`

---

#### PI-028: Implement knowledge entry schema and validation
- **Epic**: Epic 4: Knowledge Persistence
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P0
- **Estimate**: M (4h)
- **Blocked by**: PI-027
- **Phase**: 3
- **Spec reference**: 04-knowledge § 2

**Description**: Build TypeScript interfaces and Zod schema for knowledge entries. Includes validation functions that check if a knowledge entry is well-formed: required fields present, ID format correct, dates valid, etc. Write/read functions must parse YAML frontmatter + markdown body and validate against schema.

**Acceptance Criteria**:
- [ ] TypeScript interface `KnowledgeEntry` with all fields from spec
- [ ] Zod schema for validation: `KnowledgeEntrySchema`
- [ ] Write function: `writeKnowledgeEntry(entry) => filepath`
- [ ] Read function: `readKnowledgeEntry(filepath) => KnowledgeEntry`
- [ ] Validation function: `validateEntry(entry) => {valid, errors}`
- [ ] Unit tests covering valid entries, invalid entries, edge cases

---

#### PI-029: Build knowledge extraction pipeline (AI-powered)
- **Epic**: Epic 4: Knowledge Persistence
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P0
- **Estimate**: L (8h)
- **Blocked by**: PI-028
- **Phase**: 3
- **Spec reference**: 04-knowledge § 3

**Description**: Create the knowledge extraction system that analyzes completed agent sessions (especially researchers) and extracts durable knowledge. Uses Claude to analyze session transcripts, files accessed, commands run, and output to identify: novel discoveries, patterns, conventions, gotchas, solutions. Outputs draft knowledge entries in proper format for human review.

**Acceptance Criteria**:
- [ ] `extractKnowledge(session) => KnowledgeEntry[]` function
- [ ] Loads session artifacts: transcript, files accessed, commands, output
- [ ] Sends to Claude with extraction prompt (focus on durable knowledge)
- [ ] Parses Claude's response into structured knowledge entries
- [ ] Scores confidence: high (strong evidence) to speculative (hypothesis)
- [ ] Scores importance: critical (many files) to low (nice to know)
- [ ] Deduplication check against existing knowledge
- [ ] Writes draft entries to `~/knowledge/sessions/{session-id}/drafts/`

---

#### PI-030: Build knowledge injection for agent spawn
- **Epic**: Epic 4: Knowledge Persistence
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P0
- **Estimate**: L (6h)
- **Blocked by**: PI-028, PI-029
- **Phase**: 3
- **Spec reference**: 04-knowledge § 4

**Description**: Implement the knowledge injection system that queries the knowledge base when spawning a new agent and injects relevant entries into their prompt. Queries based on: task description (semantic similarity), repository (repo-specific knowledge), domain (tags), and recent agent activity. Ranks results by relevance and injects top 10 entries (max 4000 tokens).

**Acceptance Criteria**:
- [ ] `getRelevantKnowledge(query, context) => KnowledgeEntry[]` function
- [ ] Queries knowledge base with semantic search (basic: keyword match)
- [ ] Filters by: repository hash, domain tags, active status
- [ ] Ranks by: semantic similarity, confidence, importance, recency
- [ ] Limits results: max 10 entries, max 4000 tokens total
- [ ] Formats knowledge for prompt injection (markdown blocks)
- [ ] Integration test: spawn agent with knowledge injection

---

#### PI-031: Bootstrap knowledge from existing sessions
- **Epic**: Epic 4: Knowledge Persistence
- **Type**: setup
- **Agent**: researcher
- **Model**: opus
- **Env**: local
- **Priority**: P1
- **Estimate**: L (8h)
- **Blocked by**: PI-029
- **Phase**: 3
- **Spec reference**: 04-knowledge § 7

**Description**: Run the knowledge extraction pipeline on 7 existing research sessions to bootstrap the initial knowledge base. Extract knowledge from sessions on: agent architecture, prompt templates, skill system, streaming, testing, documentation, user feedback. Review extracted entries, approve/edit/reject, and populate `~/knowledge/system/` with ~100-150 knowledge entries.

**Acceptance Criteria**:
- [ ] Extraction run on all 7 sessions: `npm run extract-knowledge --session <path>`
- [ ] Draft entries generated: 100-150 total (15-20 per session avg)
- [ ] Manual review process completed for all drafts
- [ ] High-confidence entries (40%) moved to `~/knowledge/system/`
- [ ] Medium-confidence entries (40%) reviewed and tagged appropriately
- [ ] Low-confidence entries (20%) kept in drafts or rejected
- [ ] Bootstrap report generated: `~/knowledge/bootstrap-report.md`

---

#### PI-032: Implement knowledge graph relationships
- **Epic**: Epic 4: Knowledge Persistence
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P2
- **Estimate**: M (5h)
- **Blocked by**: PI-028, PI-031
- **Phase**: 3
- **Spec reference**: 04-knowledge § 5

**Description**: Build the knowledge graph system that discovers and tracks relationships between knowledge entries. Relationship types: related, supersedes, prerequisite, implements, contradicts. Implements automatic relationship discovery via semantic similarity, tag overlap, and explicit references. Stores relationships in entry metadata and provides graph traversal functions.

**Acceptance Criteria**:
- [ ] `discoverRelationships(newEntry) => Edge[]` finds related entries
- [ ] Detects: semantic similarity >0.7, tag overlap ≥3, explicit ID mentions
- [ ] Relationship types: related, supersedes, prerequisite, implements, contradicts
- [ ] Graph traversal: `findRelated(entryId, depth) => KnowledgeEntry[]`
- [ ] Exports graph visualization: `exportGraphviz() => string` (DOT format)
- [ ] Unit tests covering relationship discovery and traversal

---

#### PI-033: Build knowledge maintenance and staleness tracking
- **Epic**: Epic 4: Knowledge Persistence
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P2
- **Estimate**: M (4h)
- **Blocked by**: PI-028
- **Phase**: 4
- **Spec reference**: 04-knowledge § 6

**Description**: Implement the staleness tracking system that calculates how outdated each knowledge entry is based on: age since validation, referenced files modified, deprecated status, conflicts with newer entries. Provides maintenance recommendations: keep, review, deprecate, remove. Includes CLI for weekly maintenance tasks.

**Acceptance Criteria**:
- [ ] `calculateStaleness(entry) => {overall: 0-1, factors, recommendation}`
- [ ] Factors: age (days), code changes (files modified), deprecated flag, conflicts
- [ ] Recommendations: keep (<0.3), review (0.3-0.6), deprecate (0.6-0.8), remove (>0.8)
- [ ] CLI: `npm run kb-maintain list --stale` shows entries needing review
- [ ] CLI: `npm run kb-maintain deprecate <id>` marks entry deprecated
- [ ] Weekly cron job: auto-deprecate entries with staleness >0.8

---

### Epic 5: Cost & Observability

#### PI-034: Research and select cost tracking solution
- **Epic**: Epic 5: Cost & Observability
- **Type**: research
- **Agent**: researcher
- **Model**: opus
- **Env**: local
- **Priority**: P0
- **Estimate**: S (3h)
- **Blocked by**: none
- **Phase**: 2
- **Spec reference**: research-monitoring-tools.md

**Description**: Research cost tracking options (Portkey, Helicone, Langfuse, custom) and make a selection with rationale. Consider: self-hosting options, pricing at scale (50 agents × 50 calls × 20 sessions/day = 1.5M requests/month), integration effort, features (cost tracking, request logging, caching, retries). Output: decision document with recommendation.

**Acceptance Criteria**:
- [ ] Comparison matrix: Portkey vs Helicone vs Langfuse vs custom build
- [ ] Pricing analysis at scale: 1.5M requests/month
- [ ] Integration effort estimate for each option
- [ ] Feature comparison: cost tracking, logging, caching, retries, multi-model
- [ ] Recommendation with rationale (suggest: Portkey for retries + cost tracking)
- [ ] Saved to `~/.pi/docs/cost-tracking-decision.md`

---

#### PI-035: Deploy Portkey gateway (self-hosted)
- **Epic**: Epic 5: Cost & Observability
- **Type**: setup
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P0
- **Estimate**: M (4h)
- **Blocked by**: PI-034
- **Phase**: 2
- **Spec reference**: research-monitoring-tools.md § 8

**Description**: Deploy Portkey AI Gateway in self-hosted mode using the open-source gateway (npx @portkey-ai/gateway). Configure with API keys for Claude, OpenAI, Google, etc. Set up request logging, cost tracking, and basic alerts. Test with sample LLM calls to verify routing works and costs are captured correctly.

**Acceptance Criteria**:
- [ ] Portkey gateway running: `npx @portkey-ai/gateway --config portkey-config.yaml`
- [ ] Configuration includes all model providers: Claude, OpenAI, Google, Codex
- [ ] Test request through gateway: successful routing to Claude API
- [ ] Cost logged correctly in Portkey dashboard/logs
- [ ] Documentation: `~/.pi/docs/portkey-setup.md` with config and testing
- [ ] Systemd service or PM2 process for persistent running

---

#### PI-036: Route all agent LLM calls through gateway
- **Epic**: Epic 5: Cost & Observability
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P0
- **Estimate**: M (5h)
- **Blocked by**: PI-035
- **Phase**: 2
- **Spec reference**: research-monitoring-tools.md § 8

**Description**: Update agent spawning code to route all LLM API calls through Portkey gateway. Change base URLs, add custom headers (x-portkey-api-key, x-portkey-metadata with agent ID, issue ID, session ID), and verify requests appear in Portkey logs with correct metadata. This enables automatic cost tracking without code changes to agent logic.

**Acceptance Criteria**:
- [ ] Agent spawn function sets LLM base URL to Portkey gateway
- [ ] Custom headers added: x-portkey-api-key, x-portkey-metadata (JSON)
- [ ] Metadata includes: agentId, issueId, sessionId, role, model
- [ ] Test agent spawn → verify LLM call appears in Portkey logs
- [ ] Cost attribution works: can filter by agentId, issueId in dashboard
- [ ] Fallback strategy documented if gateway is down

---

#### PI-037: Build cost reporting dashboard
- **Epic**: Epic 5: Cost & Observability
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P1
- **Estimate**: M (5h)
- **Blocked by**: PI-036
- **Phase**: 2
- **Spec reference**: research-monitoring-tools.md

**Description**: Create a simple web dashboard that queries Portkey's API (or logs) to display cost analytics: total spend, spend per agent, spend per model, spend per day, top 10 most expensive sessions. Dashboard should auto-refresh and be accessible at http://localhost:3457/costs. Provides visibility into where money is going.

**Acceptance Criteria**:
- [ ] Web dashboard at http://localhost:3457/costs
- [ ] Displays: total spend (last 24h, 7d, 30d)
- [ ] Table: spend by agent (top 10)
- [ ] Table: spend by model (Claude Opus vs Sonnet vs GPT-4o, etc.)
- [ ] Chart: spend over time (last 7 days, daily breakdown)
- [ ] Refreshes every 30 seconds
- [ ] Saved to `~/.pi/dashboard/costs.html` (static file + fetch API)

---

#### PI-038: Set up cost alerts and budgets
- **Epic**: Epic 5: Cost & Observability
- **Type**: setup
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P2
- **Estimate**: S (3h)
- **Blocked by**: PI-036
- **Phase**: 2
- **Spec reference**: research-monitoring-tools.md

**Description**: Configure cost alerts using Portkey's alerting or custom scripts. Alert if: total daily spend exceeds $50, single agent spend exceeds $10, session spend exceeds $5. Sends alerts to Slack/email/Linear comment. Provides early warning of runaway costs (e.g., infinite agent loop).

**Acceptance Criteria**:
- [ ] Alert rules configured: daily >$50, agent >$10, session >$5
- [ ] Alert delivery method configured (Linear comment to specific issue)
- [ ] Test alerts: trigger by simulating high spend
- [ ] Alert includes: spend amount, threshold, agent/session details, timestamp
- [ ] Documentation: how to adjust thresholds in config

---

#### PI-039: (Optional) Deploy Langfuse for deep observability
- **Epic**: Epic 5: Cost & Observability
- **Type**: setup
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P3
- **Estimate**: L (6h)
- **Blocked by**: PI-036
- **Phase**: 4
- **Spec reference**: research-monitoring-tools.md § 2

**Description**: Deploy Langfuse (self-hosted) for deep trace visualization and session debugging. This is optional — add if debugging stalled/failed agents becomes a pain point after heartbeat system is live. Provides step-by-step trace visualization, session grouping, and historical analysis.

**Acceptance Criteria**:
- [ ] Langfuse deployed via Docker Compose (ClickHouse + Postgres)
- [ ] TypeScript SDK integrated: wrap agent LLM calls with Langfuse tracing
- [ ] Sessions grouped by Linear issue ID
- [ ] Test: spawn agent → verify trace appears in Langfuse UI
- [ ] Documentation: `~/.pi/docs/langfuse-setup.md`
- [ ] Decision documented: when to use Portkey vs Langfuse (cost vs debugging)

---

### Epic 6: Scale Readiness

#### PI-040: Deploy Redis and BullMQ
- **Epic**: Epic 6: Scale Readiness
- **Type**: setup
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P0
- **Estimate**: M (4h)
- **Blocked by**: none
- **Phase**: 4
- **Spec reference**: research-orchestration-bus.md § 5

**Description**: Deploy Redis locally and set up BullMQ for job queue management. This creates the local buffer between Linear (rate-limited) and agents (high throughput). Configure Redis persistence, BullMQ queue settings (priority, retries, timeouts), and Bull Board dashboard for monitoring.

**Acceptance Criteria**:
- [ ] Redis installed and running: `redis-server --daemonize yes`
- [ ] BullMQ npm package installed: `npm install bullmq`
- [ ] Test queue created: `const queue = new Queue('agent-tasks', {connection: redis})`
- [ ] Bull Board dashboard accessible: http://localhost:3458/admin/queues
- [ ] Documentation: `~/.pi/docs/redis-bullmq-setup.md`
- [ ] Redis persistence configured: RDB snapshots every 5 minutes

---

#### PI-041: Build Linear sync service
- **Epic**: Epic 6: Scale Readiness
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P0
- **Estimate**: L (8h)
- **Blocked by**: PI-040, PI-001, PI-002
- **Phase**: 4
- **Spec reference**: research-orchestration-bus.md § 5

**Description**: Create the sync service that sits between Linear and agents via BullMQ. Receives Linear webhooks → creates BullMQ jobs for agents. Polls BullMQ job status → batches updates back to Linear every 1-2 minutes. This decouples agents from Linear API rate limits. Agents interact only with BullMQ (fast, unlimited), sync service handles Linear (slow, rate-limited).

**Acceptance Criteria**:
- [ ] Webhook handler: Linear event → create BullMQ job
- [ ] Job format: {type, issueId, data, timestamp}
- [ ] Status monitor: poll BullMQ job completion → batch Linear updates
- [ ] Batching: collects updates for 1-2 min, sends one API call per batch
- [ ] Rate limit aware: respects 100 calls/hour budget
- [ ] Error handling: retry failed Linear API calls with backoff
- [ ] Metrics logged: jobs created, batches sent, API calls made

---

#### PI-042: Update agent spawn to use BullMQ
- **Epic**: Epic 6: Scale Readiness
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P0
- **Estimate**: M (5h)
- **Blocked by**: PI-041
- **Phase**: 4
- **Spec reference**: research-orchestration-bus.md § 5

**Description**: Refactor agent spawning to use BullMQ as the task queue instead of directly polling Linear. Agents become BullMQ workers that claim jobs, execute them, and report results back through the queue. This scales to unlimited agents without Linear API concerns. Maintains backward compatibility during migration.

**Acceptance Criteria**:
- [ ] Agent spawn function registers as BullMQ worker: `worker = new Worker('agent-tasks', processor)`
- [ ] Worker claims jobs from queue (automatic via BullMQ)
- [ ] Job processing function: receive job → spawn agent → monitor → report result
- [ ] Results posted back to queue: {jobId, status, output, error}
- [ ] Sync service picks up results and updates Linear
- [ ] Backward compatibility: direct Linear mode still works (feature flag)

---

#### PI-043: Implement concurrency limits
- **Epic**: Epic 6: Scale Readiness
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P1
- **Estimate**: M (4h)
- **Blocked by**: PI-042
- **Phase**: 4
- **Spec reference**: 00-integration-plan.md § 4.5

**Description**: Add concurrency limit enforcement to prevent spawning too many agents simultaneously. Limits: 2 researchers, 4 workers, 1 reviewer, 8 total. Uses BullMQ's built-in concurrency control. Prevents resource exhaustion (memory, CPU, Linear rate limit overflow) and maintains system stability.

**Acceptance Criteria**:
- [ ] BullMQ worker concurrency configured: `new Worker('agent-tasks', processor, {concurrency: 8})`
- [ ] Per-role limits enforced: researchers 2, workers 4, reviewers 1
- [ ] Queue priority used: critical (researchers) > high (workers) > normal (reviewers)
- [ ] Metrics logged: active agents by role, queue depth, wait time
- [ ] Dashboard shows current concurrency: "4/8 agents active"
- [ ] Graceful handling when limit reached: jobs wait in queue

---

#### PI-044: Build load testing suite
- **Epic**: Epic 6: Scale Readiness
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P1
- **Estimate**: L (6h)
- **Blocked by**: PI-042, PI-043
- **Phase**: 4
- **Spec reference**: research-orchestration-bus.md

**Description**: Create a load testing tool that simulates 50 concurrent agents performing realistic tasks: spawning, heartbeating, code pushing, transitioning states. Measures: throughput (jobs/sec), latency (spawn to completion), error rate, API call rate to Linear. Identifies bottlenecks and validates the system can handle scale target.

**Acceptance Criteria**:
- [ ] Load test script: `npm run load-test -- --agents 50 --duration 10m`
- [ ] Simulates: spawn, heartbeat every 5min, random work duration (5-30min), state transitions
- [ ] Measures: throughput, latency percentiles (p50/p95/p99), error rate
- [ ] Monitors: Linear API calls/hour, BullMQ queue depth, Redis memory usage
- [ ] Generates report: `~/.pi/load-test-results/{timestamp}.json`
- [ ] Success criteria: 50 agents complete without errors, <100 Linear API calls/hour

---

#### PI-045: Implement production monitoring
- **Epic**: Epic 6: Scale Readiness
- **Type**: build
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P1
- **Estimate**: M (5h)
- **Blocked by**: PI-037, PI-043
- **Phase**: 4
- **Spec reference**: 00-integration-plan.md § 10.1

**Description**: Build a comprehensive monitoring dashboard that tracks key system health metrics: API calls/hour (Linear budget), webhook delivery rate, state transition latency, false positive stall rate, agent survival rate. Provides real-time visibility into system health and early warning of problems.

**Acceptance Criteria**:
- [ ] Dashboard at http://localhost:3459/monitoring
- [ ] Metrics displayed: API calls/hour (<100 green, 100-150 yellow, >150 red)
- [ ] Webhook delivery rate (>99% green, 95-99% yellow, <95% red)
- [ ] State transition latency (median, p95, p99)
- [ ] False positive stall rate (<5% green, 5-10% yellow, >10% red)
- [ ] Agent survival rate (>70% green, 60-70% yellow, <60% red)
- [ ] Auto-refresh every 10 seconds

---

#### PI-046: Add production alerting
- **Epic**: Epic 6: Scale Readiness
- **Type**: setup
- **Agent**: worker
- **Model**: sonnet
- **Env**: local
- **Priority**: P2
- **Estimate**: M (4h)
- **Blocked by**: PI-045
- **Phase**: 4
- **Spec reference**: 00-integration-plan.md § 10.1

**Description**: Configure production alerts for critical system issues: API rate limit exceeded (>150 calls/hour), webhook delivery failure (>5% drop rate), high false positive stall rate (>10%), Redis down, sync service crashed. Alerts should be actionable and route to appropriate channels (Slack, email, Linear).

**Acceptance Criteria**:
- [ ] Alert rules defined for all critical thresholds
- [ ] Alert delivery configured: Linear comment to orchestration issue + email
- [ ] Test alerts: manually trigger each condition and verify delivery
- [ ] Alert format includes: severity, metric value, threshold, timestamp, recommended action
- [ ] Alert history logged: `~/.pi/logs/alerts.log`
- [ ] Documentation: troubleshooting guide for each alert type

---

#### PI-047: Document production deployment guide
- **Epic**: Epic 6: Scale Readiness
- **Type**: research
- **Agent**: researcher
- **Model**: opus
- **Env**: local
- **Priority**: P2
- **Estimate**: M (4h)
- **Blocked by**: PI-041, PI-042, PI-043
- **Phase**: 4
- **Spec reference**: all plans

**Description**: Write comprehensive production deployment documentation covering: prerequisites, step-by-step deployment, configuration, monitoring, troubleshooting, and maintenance procedures. Should enable someone to deploy the complete orchestration system from scratch following the guide.

**Acceptance Criteria**:
- [ ] Document saved to `~/.pi/docs/production-deployment.md`
- [ ] Prerequisites section: Node.js, Redis, Linear account, API keys
- [ ] Step-by-step deployment: infrastructure setup, configuration, testing, launch
- [ ] Configuration reference: all environment variables and config files
- [ ] Monitoring section: how to read dashboards, what to watch
- [ ] Troubleshooting: common issues and solutions
- [ ] Maintenance: weekly/monthly tasks, backup procedures

---

#### PI-048: Create runbook for common operational tasks
- **Epic**: Epic 6: Scale Readiness
- **Type**: research
- **Agent**: researcher
- **Model**: opus
- **Env**: local
- **Priority**: P2
- **Estimate**: S (3h)
- **Blocked by**: PI-047
- **Phase**: 4
- **Spec reference**: all plans

**Description**: Document operational runbooks for common scenarios: restarting the orchestrator, clearing stalled agents manually, resetting retry counters, recovering from webhook outages, debugging failed agents, adjusting rate limits, scaling Redis. Each runbook should have: symptoms, diagnosis steps, resolution steps, verification.

**Acceptance Criteria**:
- [ ] Runbook saved to `~/.pi/docs/operational-runbooks.md`
- [ ] Runbook for: restart orchestrator, clear stalled agent, reset retry
- [ ] Runbook for: webhook outage recovery, agent debugging, rate limit adjustment
- [ ] Each runbook includes: symptoms, diagnosis, resolution, verification
- [ ] CLI commands documented with examples
- [ ] Links to relevant logs and dashboard pages

---

## 4. Dependency Graph

```
Phase 1 (Foundation):
PI-001 ─────┬───────────────────────┐
            │                       │
PI-002 ─────┼───────────────────┐   │
            │                   │   │
PI-003 ─────┼───────┐           │   │
            │       │           │   │
PI-004 ─────┤       │           │   │
            │       │           │   │
PI-005      │       │           │   │
            │       │           │   │
PI-006 ─────┘       │           │   │
                    │           │   │
Phase 2 (Monitoring):        │   │   │
PI-007 ─────────────┼───────────┤   │
                    │           │   │
PI-008 ─────────────┼───────┐   │   │
                    │       │   │   │
PI-009 ─────────────┼───┐   │   │   │
                    │   │   │   │   │
PI-010 ─────────────┼───┼───┴───┴───┤
                    │   │           │
PI-011 ─────────────┘   │           │
                        │           │
PI-012 ─────────────────┤           │
                        │           │
PI-013 ─────────────────┼───────────┤
                        │           │
PI-014 ─────────────────┘           │
                                    │
PI-015 ─────────────────────────────┼───────┐
                                    │       │
PI-016 ─────────────────────────────┼───┐   │
                                    │   │   │
PI-017 ─────────────────────────────┘   │   │
                                        │   │
PI-018 ─────────────────────────────────┘   │
                                            │
PI-019 ─────────────────────────────────────┤
                                            │
PI-020 ─────────────────────────────────────┘

Phase 3 (Intelligence):
PI-021 ─────────────────────────────────────┬───────┐
                                            │       │
PI-022 ─────────────────────────────────────┼───────┤
                                            │       │
PI-023 ─────────────────────────────────────┤       │
                                            │       │
PI-024 ─────────────────────────────────────┘       │
                                                    │
PI-025 ─────────────────────────────────────────────┤
                                                    │
PI-026 ─────────────────────────────────────────────┘

PI-027 ─────────────────────────────────────────────┬───────┐
                                                    │       │
PI-028 ─────────────────────────────────────────────┤       │
                                                    │       │
PI-029 ─────────────────────────────────────────────┼───────┤
                                                    │       │
PI-030 ─────────────────────────────────────────────┘       │
                                                            │
PI-031 ─────────────────────────────────────────────────────┤
                                                            │
PI-032 ─────────────────────────────────────────────────────┤
                                                            │
PI-033 ─────────────────────────────────────────────────────┘

Phase 2-3 (Observability — parallel):
PI-034 ─────────────────────────────────────────────────────┬───┐
                                                            │   │
PI-035 ─────────────────────────────────────────────────────┘   │
                                                                │
PI-036 ─────────────────────────────────────────────────────────┼───┐
                                                                │   │
PI-037 ─────────────────────────────────────────────────────────┘   │
                                                                    │
PI-038 ─────────────────────────────────────────────────────────────┤
                                                                    │
PI-039 (optional) ───────────────────────────────────────────────────┘

Phase 4 (Scale):
PI-040 ─────────────────────────────────────────────────────────────┬───┐
                                                                    │   │
PI-041 ─────────────────────────────────────────────────────────────┘   │
                                                                        │
PI-042 ─────────────────────────────────────────────────────────────────┼───┐
                                                                        │   │
PI-043 ─────────────────────────────────────────────────────────────────┘   │
                                                                            │
PI-044 ─────────────────────────────────────────────────────────────────────┤
                                                                            │
PI-045 ─────────────────────────────────────────────────────────────────────┤
                                                                            │
PI-046 ─────────────────────────────────────────────────────────────────────┤
                                                                            │
PI-047 ─────────────────────────────────────────────────────────────────────┤
                                                                            │
PI-048 ─────────────────────────────────────────────────────────────────────┘

CRITICAL PATH (longest dependency chain):
PI-001 → PI-003 → PI-009 → PI-010 → PI-015 → PI-019 → PI-041 → PI-042 → PI-044
Total: ~47 hours on critical path

PARALLELIZATION OPPORTUNITIES:
- Epic 0, 1, 4, 5 can start simultaneously (no interdependencies)
- Epic 2 depends on Epic 0+1
- Epic 3 depends on Epic 1+2
- Epic 6 depends on all others but issues can start after Epic 0
```

---

## 5. Phase Plan

### Phase 1: Foundation (Week 1, April 7-11)

**Focus:** Build the infrastructure layer that all other systems depend on.

**Issues:** PI-001 through PI-011 (11 issues)

**What's usable after Phase 1:**
- Unified Linear API client for all subsequent work
- Webhook infrastructure for real-time event processing
- Agent status tracking system (foundation for monitoring)
- Prompt templates ready to use
- Git notes system for session persistence
- Complete lifecycle state machine documentation
- Linear workflow states configured and ready
- State transition validation working

**Success criteria:**
- All 11 issues completed and merged
- Linear workspace configured with 10 workflow states
- Webhook server receiving and processing events
- Test agent can spawn with unified prompt template

---

### Phase 2: Monitoring (Week 2, April 14-18)

**Focus:** Active health monitoring with heartbeat detection and stall recovery.

**Issues:** PI-012 through PI-020 (9 issues) + PI-034 through PI-038 (5 issues, parallel)

**Cumulative capability after Phase 2:**
- Everything from Phase 1, plus:
- Active heartbeat monitoring for all agents
- Automatic stall detection with role-specific thresholds
- Ping → kill → retry recovery cascade
- Automated state transitions based on agent activity
- Real-time cost tracking via Portkey gateway
- Cost dashboard and alerts

**Success criteria:**
- Spawn test agent → detect stall → auto-recover without manual intervention
- 70%+ of simulated stalls recover automatically
- All agent LLM calls routed through Portkey
- Cost dashboard shows accurate spend data
- False positive rate <10% on stall detection

---

### Phase 3: Intelligence & Handoffs (Week 3, April 21-25)

**Focus:** Structured knowledge transfer and persistent learning.

**Issues:** PI-021 through PI-033 (13 issues)

**Cumulative capability after Phase 3:**
- Everything from Phases 1-2, plus:
- Mandatory handoff notes before review
- Enforcement at state transition level
- Reviewers receive structured context about work
- Knowledge extraction from completed sessions
- Knowledge injection at agent spawn
- Initial knowledge base bootstrapped from 7 sessions (~100-150 entries)
- Knowledge graph with relationship discovery

**Success criteria:**
- 100% of agents write handoff notes (enforced by state machine)
- Reviewers report context is helpful and complete
- Knowledge extraction produces 15-20 entries per research session
- New agents receive relevant knowledge in their prompts
- Bootstrap from 7 sessions completes with 100+ knowledge entries

---

### Phase 4: Scale & Polish (Week 4, April 28 - May 2)

**Focus:** Production readiness for 50-100 concurrent agents.

**Issues:** PI-040 through PI-048 (9 issues)

**Production-grade system after Phase 4:**
- Everything from Phases 1-3, plus:
- Redis + BullMQ buffering layer (decouples from Linear rate limits)
- Linear sync service (batched API calls)
- Concurrency limits enforced (8 total agents, split by role)
- Load tested with 50 simulated agents
- Production monitoring dashboard
- Production alerting for critical issues
- Complete deployment documentation
- Operational runbooks for common tasks

**Success criteria:**
- Load test passes: 50 agents complete simultaneously without errors
- Linear API calls stay under 100/hour during load test
- Monitoring dashboard shows all green metrics
- Alerts trigger correctly and are actionable
- Documentation enables deployment from scratch by someone new

---

## 6. Risk Register

| # | Risk | Likelihood | Impact | Mitigation | Owner |
|---|------|------------|--------|------------|-------|
| **1** | **Linear API rate limits hit before Redis buffer is ready** | High | Critical | Implement Phase 2 carefully with API call logging, deploy Redis (PI-040-042) ASAP if limits approached | PI orchestrator |
| **2** | **False positive stall detections due to incorrect threshold tuning** | High | High | Implement grace periods (Plan 01), start with conservative thresholds (30min workers initially), tune down after observation week | Worker implementing PI-015 |
| **3** | **Webhook delivery failures causing missed heartbeats** | Medium | High | Hybrid approach: webhooks + polling fallback (PI-014), health check endpoints for remote agents | Workers implementing PI-013-014 |
| **4** | **Knowledge extraction produces low-quality entries** | Medium | Medium | Human review required for all bootstrap extractions (PI-031), confidence scoring filters low-quality, iterative improvement | Researcher implementing PI-029 |
| **5** | **Handoff validation too strict, agents can't transition** | Medium | Medium | Start with lenient validation, tighten over time, provide clear error messages with examples, manual override capability | Worker implementing PI-023 |
| **6** | **Race conditions in concurrent state updates** | Medium | High | Optimistic locking with version numbers (PI-003), atomic state transitions, comprehensive testing with parallel updates | Worker implementing PI-003 |
| **7** | **Portkey gateway introduces latency or becomes bottleneck** | Low | Medium | Self-host for <1ms latency, monitor gateway performance, fallback to direct API calls if gateway down | Worker implementing PI-035-036 |
| **8** | **Redis/BullMQ adds complexity without clear benefit at current scale** | Low | Low | Deploy Redis only if rate limits actually hit (defer PI-040-042 to Phase 4, observe in Phases 2-3), Linear-only mode works for <20 agents | PM decision |
| **9** | **Cost tracking reveals unexpectedly high spend** | Medium | High | Set up alerts early (PI-038), start with $50/day budget alert, optimize expensive agents (prefer Sonnet over Opus), cache aggressively | Worker implementing PI-038 |
| **10** | **Knowledge graph becomes too complex to maintain** | Low | Low | Keep relationships simple (related, supersedes only), defer graph complexity (PI-032 is P2), focus on retrieval quality over graph sophistication | Worker implementing PI-032 |

---

## 7. Quick Reference

### Day 1 Checklist (First Things to Create)

**Morning (Setup):**
1. Create Linear workflow states: Run PI-008 setup script
2. Create project structure: `mkdir -p ~/.pi/{lib,webhooks,scripts,logs,data,cache}`
3. Install dependencies: `npm install bullmq ioredis zod`
4. Set up git notes: Initialize `refs/notes/agent-sessions/*`

**Afternoon (Infrastructure):**
1. Build Linear client (PI-001): Start with basic query/mutation wrapper
2. Build webhook server (PI-002): HTTP endpoint + file watcher
3. Build agent status store (PI-003): In-memory Map + JSON persistence

**End of Day 1 Deliverables:**
- Linear states visible in UI
- Webhook server receiving and logging events
- Agent status tracking working (test with manual entries)

---

### First 5 Issues to Assign

**Parallel Track 1 (Infrastructure):**
1. **PI-001** (Worker, M, 4h): Linear API client — foundation for everything
2. **PI-002** (Worker, M, 4h): Webhook server — can start simultaneously with PI-001
3. **PI-004** (Worker, M, 5h): Unified prompts — can start simultaneously, no dependencies

**Parallel Track 2 (Planning):**
4. **PI-007** (Researcher, M, 4h): State machine design — research task, parallel with building
5. **PI-008** (Pi-direct, S, 2h): Linear states setup — quick win, do immediately

**Why these 5:**
- No dependencies between them (all can run in parallel)
- Mix of build (1,2,4) and research (7) and setup (8)
- Foundational pieces needed by everything else
- Total: 19 hours of work, could be done in 1 day with 5 agents
- Tests the complete pipeline: spawn → work → complete

---

### Phase Gate Criteria

**Gate 1: Proceed to Phase 2 (Monitoring)?**
- ✅ All Phase 1 issues (PI-001 through PI-011) merged to main
- ✅ Linear workflow states visible and working
- ✅ Webhook server receiving and processing events successfully
- ✅ Agent status store tested with concurrent updates
- ✅ Test agent spawned successfully with unified prompt

**Gate 2: Proceed to Phase 3 (Intelligence)?**
- ✅ All Phase 2 issues (PI-012 through PI-020) merged
- ✅ Heartbeat detection working: test agent sends heartbeats, detected correctly
- ✅ Stall detection triggers within 5 minutes of crossing threshold
- ✅ Recovery cascade completes: ping → wait → kill → retry
- ✅ At least one successful automated recovery (stall → retry → completion)
- ✅ Portkey gateway deployed and routing all LLM calls
- ✅ Cost dashboard showing accurate spend data
- ✅ False positive rate measured and <10%

**Gate 3: Proceed to Phase 4 (Scale)?**
- ✅ All Phase 3 issues (PI-021 through PI-033) merged
- ✅ Handoff validation enforced: cannot transition to Review without valid handoff
- ✅ Test reviewer receives handoff context correctly
- ✅ Knowledge extraction produces >10 entries from test session
- ✅ Knowledge injection works: new agent receives relevant knowledge
- ✅ Bootstrap from 7 sessions completes with 100+ entries
- ✅ Knowledge graph relationships discovered automatically

**Gate 4: Production Launch?**
- ✅ All Phase 4 issues (PI-040 through PI-048) merged
- ✅ Redis + BullMQ deployed and tested
- ✅ Linear sync service batching API calls (<100/hour confirmed)
- ✅ Concurrency limits enforced correctly
- ✅ Load test passes: 50 agents complete without errors
- ✅ Monitoring dashboard shows all metrics green
- ✅ Alerting tested and working
- ✅ Documentation complete and reviewed
- ✅ One full day of production observation: no critical issues

---

## 8. Unified Agent Prompt Template (Complete)

### Base Template Structure

All three role templates (worker, researcher, reviewer) share this structure but vary the content:

```markdown
# [ROLE] Agent — Pi Orchestration System

You are a [ROLE] agent in the Pi multi-agent orchestration system.

## 🚨 HEARTBEAT PROTOCOL — MANDATORY

[Role-specific heartbeat instructions: frequency, format, escalation]

## 📍 STATE AWARENESS

**Current Issue State:** {{current-state}}
**Valid Transitions:** [List of allowed transitions from current state]

[State transition rules and how to trigger them]

## [ROLE-SPECIFIC SECTIONS]

[Worker: Handoff protocol]
[Researcher: Knowledge injection]
[Reviewer: Handoff consumption]

## 🧠 RELEVANT KNOWLEDGE (if applicable)

{{injected-knowledge}}

## YOUR TASK

{{task-description}}

**Issue:** {{issue-identifier}}
**Branch:** {{branch-name}}
**Repository:** {{repository-path}}

**Acceptance Criteria:**
{{acceptance-criteria}}

## WORKFLOW

[Step-by-step instructions for this role]

## REMEMBER

- [Critical reminders for this role]
```

### Worker Unified Template

**File:** `~/.agents/templates/worker-unified.md`

See full template in **00-integration-plan.md § 8.1** (Worker Agent Unified Prompt)

**Key sections:**
- Heartbeat every 5 minutes with JSON format
- Handoff notes required before In Review
- State awareness with valid transitions
- Injected knowledge (if relevant)
- Task-specific instructions

### Researcher Unified Template

**File:** `~/.agents/templates/researcher-unified.md`

See full template in **00-integration-plan.md § 8.2** (Researcher Agent Unified Prompt)

**Key sections:**
- Heartbeat every 10 minutes (longer thinking allowed)
- Deep thinking encouraged but heartbeats required
- Knowledge injection prominent (more relevant to researchers)
- Research output format requirements
- Confidence levels for findings

### Reviewer Unified Template

**File:** `~/.agents/templates/reviewer-unified.md`

See full template in **00-integration-plan.md § 8.3** (Reviewer Agent Unified Prompt)

**Key sections:**
- Heartbeat every 7 minutes
- Author's handoff notes injected (priority focus areas)
- Review checklist based on handoff concerns
- Measurable progress reporting
- Review output format with severity levels

---

## 9. Linear Workspace Setup (Executable Configuration)

### One-Time Setup Script

**File:** `~/.pi/scripts/setup-linear-workspace.ts`

```typescript
#!/usr/bin/env bun

/**
 * One-time setup script for Linear workspace configuration.
 * Run once to create all workflow states and labels needed for agent orchestration.
 */

import { LinearClient } from '../lib/linear-client';

const TEAM_ID = process.env.LINEAR_TEAM_ID!;
const client = new LinearClient();

// Workflow states to create
const WORKFLOW_STATES = [
  {
    name: 'Backlog',
    type: 'backlog',
    color: '#95A2B3',
    description: 'Agent task queued, not started'
  },
  {
    name: 'Assigned',
    type: 'unstarted',
    color: '#3B82F6',
    description: 'Agent spawned and bootstrapping'
  },
  {
    name: 'Active',
    type: 'started',
    color: '#FFC107',
    description: 'Agent actively working, sending heartbeats'
  },
  {
    name: 'Blocked',
    type: 'started',
    color: '#FF9800',
    description: 'Agent blocked, waiting for help or input'
  },
  {
    name: 'In Review',
    type: 'started',
    color: '#9C27B0',
    description: 'Code pushed, under review'
  },
  {
    name: 'Done',
    type: 'completed',
    color: '#4CAF50',
    description: 'Work completed, merged, agent terminated'
  },
  {
    name: 'Stalled',
    type: 'canceled',
    color: '#F44336',
    description: 'Agent stopped responding, auto-terminated'
  },
  {
    name: 'Retrying',
    type: 'unstarted',
    color: '#2196F3',
    description: 'Retry attempt with fresh agent'
  },
  {
    name: 'Failed',
    type: 'canceled',
    color: '#D32F2F',
    description: 'Unrecoverable failure after retries'
  },
  {
    name: 'Abandoned',
    type: 'canceled',
    color: '#757575',
    description: 'Human decided not to pursue'
  }
];

// Labels to create
const LABELS = [
  { name: 'agent:researcher', color: '#9C27B0' },
  { name: 'agent:worker', color: '#2196F3' },
  { name: 'agent:reviewer', color: '#FF9800' },
  { name: 'retry:1', color: '#FFC107' },
  { name: 'retry:2', color: '#FF9800' },
  { name: 'escalated', color: '#F44336' },
  { name: 'model:opus', color: '#9C27B0' },
  { name: 'model:sonnet', color: '#3B82F6' },
  { name: 'model:haiku', color: '#00BCD4' }
];

async function main() {
  console.log('🚀 Setting up Linear workspace for Pi Orchestration...\n');
  
  // Create workflow states
  console.log('Creating workflow states...');
  for (const state of WORKFLOW_STATES) {
    try {
      const stateId = await client.createWorkflowState({
        teamId: TEAM_ID,
        ...state
      });
      console.log(`  ✅ ${state.name} (${stateId})`);
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`  ⏭️  ${state.name} (already exists)`);
      } else {
        console.error(`  ❌ ${state.name}: ${error.message}`);
      }
    }
  }
  
  // Create labels
  console.log('\nCreating labels...');
  for (const label of LABELS) {
    try {
      const labelId = await client.createLabel({
        teamId: TEAM_ID,
        ...label
      });
      console.log(`  ✅ ${label.name} (${labelId})`);
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`  ⏭️  ${label.name} (already exists)`);
      } else {
        console.error(`  ❌ ${label.name}: ${error.message}`);
      }
    }
  }
  
  // Refresh state cache
  console.log('\nRefreshing state ID cache...');
  await client.refreshStateCache();
  console.log('  ✅ Cache refreshed');
  
  console.log('\n✅ Linear workspace setup complete!');
  console.log('\nVerify in Linear:');
  console.log('  1. Go to Settings → Workflow');
  console.log('  2. Should see 10 states with correct colors');
  console.log('  3. Go to Settings → Labels');
  console.log('  4. Should see 9 agent-related labels');
}

main().catch(console.error);
```

### Webhook Configuration

**Manual steps (Linear UI):**

1. Go to Linear Settings → Integrations → Webhooks
2. Click "Create webhook"
3. Configure:
   - **URL:** `https://your-imac.local:3456/webhooks/linear`
   - **Secret:** Generate random string, save to `~/.pi/webhook-secret`
   - **Events:** Select all:
     - Issue (create, update, remove)
     - Comment (create, update, remove)
     - AgentActivity (create, update, remove) [if using Agents API]
     - AgentSession (create, update, remove) [if using Agents API]
4. Click "Create"
5. Test webhook: Create test issue, verify JSON appears in `~/.pi/linear-inbox/`

### Custom Fields (Optional, Plus Plan)

If on Linear Plus plan, create custom fields:

**Fields to create:**
- `lastHeartbeat` (Date) — Last time agent sent heartbeat
- `retryCount` (Number) — How many times this task was retried
- `agentModel` (Select) — Options: Opus, Sonnet, Haiku
- `estimatedCost` (Number) — Estimated $ spent on this task

**Note:** Custom fields are optional. Labels can encode this metadata alternatively.

---

## 10. Appendix: Implementation Notes

### Development Environment

**Required tools:**
- Node.js 20+ or Bun 1.0+
- Redis 7+ (for Phase 4)
- Git 2.30+
- Linear account with API access
- Claude API key (Anthropic)
- OpenAI API key (optional, for GPT models)

**Project structure:**
```
~/.pi/
├── lib/           # Shared libraries (linear-client, agent-status, git-notes)
├── webhooks/      # Webhook server and handlers
├── monitors/      # Heartbeat monitor, stall detector
├── state-machine/ # State transition logic
├── handoff/       # Handoff validator and parser
├── knowledge/     # Knowledge extractor and injector
├── scripts/       # Setup and maintenance scripts
├── cache/         # Cached data (state IDs, etc.)
├── data/          # Persistent data (agent status, etc.)
├── logs/          # Log files
└── docs/          # Documentation
```

### Testing Strategy

**Unit tests:**
- Every library module (`lib/`, `monitors/`, `handoff/`, etc.)
- Use Bun's built-in test runner: `bun test`
- Minimum 80% code coverage

**Integration tests:**
- Full lifecycle: spawn → heartbeat → stall → retry → complete
- State transition flows
- Webhook processing pipeline
- Knowledge extraction and injection

**Load tests:**
- Simulate 50 concurrent agents
- Measure throughput, latency, error rate
- Validate Linear API call rate stays under 100/hour

### Security Considerations

**API Keys:**
- Store in environment variables or `.env` file (not committed)
- Use `~/.pi/.env` with proper file permissions (600)
- Rotate keys quarterly

**Webhook verification:**
- Always verify Linear webhook signatures (HMAC)
- Reject unsigned/invalid webhooks
- Log suspicious webhook attempts

**Process isolation:**
- Each agent runs in separate process
- Agents cannot access orchestrator's API keys directly
- Agents receive tokens via environment only

**Rate limiting:**
- Enforce concurrency limits (prevent resource exhaustion)
- Implement backpressure when queue depth exceeds threshold
- Monitor for abuse patterns (single agent spawning too many sub-agents)

### Monitoring and Observability

**Key metrics to track:**
- Agent spawn rate (agents/hour)
- Agent completion rate (%)
- Average session duration (minutes)
- Stall detection rate (stalls/hour)
- False positive rate (%)
- Retry success rate (%)
- Linear API call rate (calls/hour)
- Cost per agent ($/agent)
- Cost per model ($/model)

**Dashboards:**
- Real-time agent status (http://localhost:3459/monitoring)
- Cost analytics (http://localhost:3457/costs)
- Queue depth and throughput (Bull Board)

**Logs:**
- Structured JSON logs for all operations
- Log rotation daily (keep 30 days)
- Centralized logging if multi-machine deployment

---

## Completed

This comprehensive Linear project plan provides:

✅ **Complete project overview** with goals, metrics, and timeline  
✅ **7 epics** covering all aspects of orchestration platform  
✅ **48 detailed issues** (30-50 target range met)  
✅ **Complete dependency graph** with critical path identified  
✅ **Phase plan** with clear deliverables and gate criteria  
✅ **Risk register** with top 10 risks and mitigations  
✅ **Quick reference** with Day 1 checklist and first 5 issues  
✅ **Unified agent prompt templates** with full integration  
✅ **Linear workspace setup** with executable configuration script  
✅ **Implementation notes** covering dev environment, testing, security  

## Files Changed

- `~/plans/orchestration-project-plan.md` — Complete Linear project plan (new file, 48 issues)

## Notes for Main Agent

**This plan is ready for execution.** Key characteristics:

1. **Self-contained issues:** Each issue has enough detail to assign to a sub-agent without requiring them to read the full plan docs. Specs are referenced for deep details.

2. **Realistic scope:** Each issue is 2-8 hours of work, suitable for a single agent session. Not per-file granularity, but per-coherent-unit-of-work.

3. **Resolved conflicts:** Integration plan (00) conflicts have been resolved. No contradictions between issues.

4. **Build vs Buy decisions made:**
   - ✅ Build: Heartbeat, lifecycle, handoff (no alternatives exist)
   - ✅ Buy: Cost tracking via Portkey gateway (saves 16+ hours)
   - ✅ Defer: Langfuse observability (optional, only if needed later)
   - ✅ Defer: Redis/BullMQ (only if rate limits actually hit)

5. **Parallelization maximized:** Issues in Phase 1 can run in parallel (PI-001, PI-002, PI-004, PI-007, PI-008). Critical path is 47 hours.

6. **Phase gates enforce quality:** Cannot proceed to next phase without completing previous phase's acceptance criteria.

7. **Complete execution guide:** Day 1 checklist, first 5 issues, phase plans, runbooks all provided.

**Next steps:**
1. Review this plan for approval
2. Create Linear project with these epics
3. Create first 5 issues (PI-001, PI-002, PI-004, PI-007, PI-008)
4. Assign to appropriate agents based on role (worker/researcher/pi-direct)
5. Begin execution Week 1 (April 7)

