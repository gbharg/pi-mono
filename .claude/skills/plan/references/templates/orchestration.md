# Template: Multi-Model Orchestration

## Context
Building [SYSTEM] that coordinates multiple AI agents/models. Purpose: [GOAL: cross-model consensus / parallel execution / quality gate]. Models involved: [AGENT_LIST].

## Scope
**In scope:** agent wrappers, orchestration engine, cross-review/synthesis, error handling
**NOT in scope:** model training, new model deployments, billing changes

## User Stories

### US-001: Agent API Wrappers
**Description:** Create typed wrappers for each external model/agent CLI with error handling, timeouts, and rate limiting.
**Acceptance Criteria:**
1. Wrapper for each agent with consistent interface (input → output)
2. Timeout handling (configurable, default 120s)
3. Rate limit handling (retry with backoff)
4. Auth validation before spawning (fail fast if missing)
5. Typecheck passes

### US-002: Orchestration Engine
**Description:** Build the multi-pass orchestration: spawn agents in parallel, collect outputs, coordinate passes.
**Acceptance Criteria:**
1. Agents spawn in parallel (not sequential)
2. Failure of one agent doesn't block others (graceful degradation)
3. Output collected from all successful agents
4. Pass sequence enforced (e.g., generate → cross-review → synthesize)
5. Typecheck passes

### US-003: Synthesis / Cross-Review
**Description:** Implement the cross-review or synthesis pass that merges agent outputs into a final result.
**Acceptance Criteria:**
1. Each agent's output reviewed by at least one other agent
2. Conflicts resolved by majority vote or strongest reasoning
3. Final output is deduplicated and coherent
4. Attribution preserved (which agent contributed what)
5. Typecheck passes

### US-004: Degradation + Fallback
**Description:** Handle missing agents, timeouts, and partial failures gracefully.
**Acceptance Criteria:**
1. 2/3 agents available → proceed with warning
2. 1/3 agents available → fall back to single-model mode
3. 0/3 agents → clear error, skip gracefully
4. Timeout on one agent → use results from others
5. Warnings surfaced to user (never silent degradation)

### US-005: Integration + Registration
**Description:** Wire the orchestration into the existing skill system and register for discovery.
**Acceptance Criteria:**
1. Registered in skill index / `.parents.json`
2. CLI invocation works (`bash script.sh --mode X --task Y`)
3. Dry-run mode validates environment without spawning
4. Output written to specified path
5. All tests pass

## Story Map
```
US-001 (wrappers)  →  US-002 (orchestration)  →  US-003 (synthesis)
                                                      ↓
                                               US-004 (fallback)
                                                      ↓
                                               US-005 (integration)
```

## Testing & Validation
- Wrappers: mock API responses, test timeout/retry
- Orchestration: spawn with `--dry-run`, verify parallel execution
- Synthesis: test with known conflicting outputs, verify resolution
- Degradation: test with 0, 1, 2, 3 agents available

## Rollback
- Delete skill directory and child skills
- Revert `.parents.json` registration
- No persistent state (session dirs are ephemeral)
