# /done Workflow Reference

Run all steps in order without asking for confirmation. Read `references/agent-config.md` to determine AGENT_ID and agent-specific flags.

Use the session/chat history as the source of truth for Steps 1-4 and for deployment notes. Use git state, command output, and changed files to verify specifics, not to infer work that never happened.

## Statusline Integration

Emit statusline progress events at each step boundary so the tmux statusline can display real-time skill progress. Run the `skill-start` call once at the beginning, then `step-start`/`step-done` around each step.

```bash
bash ~/openclaw/config/claude/hooks/statusline-emit.sh skill-start "/done" "Skill Mining" "Update Docs" "Validation" "Generate Summary" "Save Memory" "Sync GitHub"
```

---

```bash
bash ~/openclaw/config/claude/hooks/statusline-emit.sh step-start "/done" 1
```

## Step 1: Skill Mining

Review the conversation for reusable skill candidates (multi-step workflows, integrations, domain patterns). Create any found via skill-creator. Skip if none.

```bash
bash ~/openclaw/config/claude/hooks/statusline-emit.sh step-done "/done" 1
```

```bash
bash ~/openclaw/config/claude/hooks/statusline-emit.sh step-start "/done" 2
```

## Step 2: Update Documentation

Review all changes made during this session and update any documentation that is now stale or incomplete. This step prevents knowledge drift — if docs still describe old behavior, other agents will follow outdated instructions.

### When to update

Update docs if the session did ANY of these:

- Changed a script's behavior, flags, or invocation syntax
- Added/removed/renamed a service (launchd, cron, webhook)
- Changed file paths, config keys, or environment variables
- Modified an architectural pattern (sync, deployment, communication)
- Added a new tool, skill, or integration
- Changed how agents should interact with a system

Skip if the session was purely memory-only (daily logs, context updates) or a bug fix that didn't change any interface.

### What to update (checklist)

Scan this list and update any that apply:

| Change type                | Files to check                                                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Script behavior**        | Skill SKILL.md that references it, MEMORY.md key facts, crash-recovery.md                                                     |
| **Service added/removed**  | `memory/shared/projects/infrastructure.md`, relevant skill SKILL.md, `config/openclaw/MEMORY.md` (gateway-host services)      |
| **Config/path changes**    | `config/{claude,codex,gemini}/memory-instructions.md`, auto-memory MEMORY.md, `config/openclaw/MEMORY.md`                     |
| **Architecture changes**   | All of the above + `memory/shared/projects/infrastructure.md` + `skills/done/references/workflow.md` (if /done flow affected) |
| **New skill/tool**         | Register in relevant MEMORY.md files, add to `skills/`                                                                        |
| **Agent workflow changes** | `config/*/memory-instructions.md` for affected agents, `skills/done/` if /done flow changed                                   |

### Mandatory staleness scan

Before updating, run this scan to identify docs that reference changed files or concepts. This is NOT optional — always run it for non-memory sessions:

```bash
# Get ALL files changed in this session (not just last commit — use merge-base against main)
MERGE_BASE=$(git -C ~/openclaw merge-base HEAD origin/main 2>/dev/null || echo "HEAD~1")
CHANGED_FILES=$(git -C ~/openclaw diff --name-only "$MERGE_BASE" 2>/dev/null | grep -v '^memory/' | head -30)

if [ -z "$CHANGED_FILES" ]; then
  echo "DOC-SCAN: No non-memory files changed — skipping staleness scan"
else
  echo "DOC-SCAN: Scanning $(echo "$CHANGED_FILES" | wc -l | tr -d ' ') changed files for doc references..."
  STALE_DOCS=""
  for f in $CHANGED_FILES; do
    basename=$(basename "$f" .ts)
    basename=${basename%.sh}
    matches=$(grep -rl "$basename" ~/openclaw/memory/shared/ ~/openclaw/config/ ~/openclaw/skills/*/SKILL.md 2>/dev/null | \
      grep -v node_modules | head -5)
    [ -n "$matches" ] && STALE_DOCS="$STALE_DOCS\n$matches"
  done
  STALE_DOCS=$(echo -e "$STALE_DOCS" | sort -u | grep -v '^$')

  if [ -n "$STALE_DOCS" ]; then
    echo "DOC-SCAN: Found docs referencing changed files:"
    echo "$STALE_DOCS"
    echo "DOC-SCAN: Read each doc and update stale references. Log outcome in session summary."
  else
    echo "DOC-SCAN: No docs reference changed files — scan complete, no updates needed"
  fi
fi
```

**This scan is MANDATORY for all non-memory sessions.** Do not skip it based on session type judgment — the scan itself determines whether docs need updating. Always run the scan; only skip the updates if the scan finds zero matches. Log the scan output (files checked, outcome) in the Step 3 session summary under "### Changes made".

### How to update

1. **Use Explore agent** to find all docs referencing the changed concept (grep for old behavior/paths/names)
2. **Prioritize active reference docs** that agents read at session start — these propagate behavior to future sessions:
   - `config/{claude,codex,gemini}/memory-instructions.md` (per-agent bootstrap)
   - `config/openclaw/MEMORY.md` (gateway-host agent bootstrap)
   - `~/.claude/projects/-Users-Work/memory/MEMORY.md` (auto-memory)
   - `memory/shared/projects/infrastructure.md` (infra state)
   - Skill SKILL.md files (skill behavior)
3. **Leave historical logs untouched** — don't rewrite `memory/shared/decisions/`, `LEARNINGS.md`, `ERRORS.md`, or `bb-summaries/`. These are records of past state.
4. **Be surgical** — update only the specific lines that are stale, don't rewrite entire files
5. **Run in parallel** — if 4+ files need updates, use background Task agents (one per file group) to avoid blocking

```bash
bash ~/openclaw/config/claude/hooks/statusline-emit.sh step-done "/done" 2
```

```bash
bash ~/openclaw/config/claude/hooks/statusline-emit.sh step-start "/done" 3
```

## Step 2b: Validation Gate (if AGENT_ID is claude-code or openclaw)

```bash
cd ~/openclaw && pnpm check 2>&1 | tail -20
```

For shell scripts: `shellcheck <script.sh>`. Block if typecheck fails — fix first.

## Step 2c: Simplify (unless `--no-simplify` flag)

Run `/simplify` to review code changed during this session for reuse, quality, and efficiency. This invokes the code-simplifier agent which:

1. Identifies files modified in the current session (via `git diff --name-only`)
2. Reviews for clarity, consistency, redundancy, and project conventions
3. Applies fixes directly — preserving functionality

Skip this step if:

- `--no-simplify` flag was passed
- The session was memory-only (no code changes)
- No files were modified outside `memory/`, `daily/`, or `sessions/`

```bash
# Check if there are code changes worth simplifying
CODE_CHANGES=$(git -C ~/openclaw diff --name-only HEAD~1 2>/dev/null | grep -v -E '^(memory/|skills/done/)' | head -1)
if [ -n "$CODE_CHANGES" ] && [ "$NO_SIMPLIFY" != "true" ]; then
  # Invoke /simplify skill
fi
```

After simplification, re-run the validation gate if any files were modified.

```bash
bash ~/openclaw/config/claude/hooks/statusline-emit.sh step-done "/done" 3
```

```bash
bash ~/openclaw/config/claude/hooks/statusline-emit.sh step-start "/done" 4
```

## Step 3: Generate Summary

```markdown
### What we did

[2-5 sentence narrative]

### Key decisions

- [Decision + reasoning]

### Follow-ups / open questions

- [ ] [Action item]

### Learnings

- [Non-obvious discovery]

### Changes made

- [File/config change with path]

### Commands / configs to remember

[Non-obvious commands, flags, paths — omit if none]
```

## Step 3b: Extract Learnings

Log corrections, errors, discoveries, feature gaps:

```bash
bash ~/openclaw/skills/memory:learnings/scripts/learnings.sh log <type> \
  --summary "<one-line>" --details "<context>" \
  --priority <critical|high|medium|low> \
  --area <infra|config|memory|backend|tools|debug|workflow> \
  --agent $AGENT_ID \
  --suggested-action "<specific fix>"
```

Error-type entries REQUIRE `--suggested-action`.

## Step 3c: Extract Follow-Ups + Out-of-Scope Recommendations

```bash
bash ~/openclaw/skills/done/scripts/follow-ups.sh add \
  "<title>" "<details>" \
  --agent $AGENT_ID \
  --priority <critical|high|medium|low> \
  --source "<session-slug>"
```

If LINEAR_UPDATE=true (requires `--linear` flag), also create a Linear issue (Team: OpenClaw, Status: Backlog, Label: "follow-up").

**Out-of-scope items:** Review the session for ideas, improvements, or work that was identified but intentionally not implemented (out of scope, deferred, or "nice to have"). If LINEAR_UPDATE=true, create a Linear backlog issue for each:

```
save_issue(
  title: "<recommendation title>",
  team: "OpenClaw",
  state: "Backlog",
  priority: <low|medium|high>,
  labels: ["Improvement", "future-recommendation"],
  description: "Identified during session: <session-slug>\n\n<description>"
)
```

If LINEAR_UPDATE=false, log out-of-scope items in the session summary (Step 3) instead of creating Linear issues. Skip if no out-of-scope items were identified.

## Step 3d: Index Current Session + Plans

Index the current session and any plan files immediately for searchability:

```bash
TOOL_MAP="claude-code:claude codex:codex gemini:gemini cursor:cursor openclaw:claude"
INDEX_TOOL=$(echo "$TOOL_MAP" | tr ' ' '\n' | grep "^${AGENT_ID}:" | cut -d: -f2)
if [ -n "$INDEX_TOOL" ]; then
  bash ~/openclaw/memory/scripts/index-sessions.sh --tool "$INDEX_TOOL" --latest
fi

# Index plans + sessions into qmd (foreground — ensures searchability before /done ends)
if command -v qmd &>/dev/null; then
  qmd update --collection plans 2>/dev/null || true
  qmd update --collection memory 2>/dev/null || true
fi
```

This ensures the session and any plans are searchable via qmd before /done completes, without waiting for the WatchPaths trigger.

## Step 3.5: Session Coherence + Telemetry

If a plan is active for this session, register it in the feature coherence layer:

```bash
SCRIPTS_DIR="$HOME/openclaw/skills/done/scripts"
PLAN_FILE=$(cat /tmp/claude/sessions/$PPID/active-plan 2>/dev/null || echo "")

if [ -n "$PLAN_FILE" ] && [ -f "$PLAN_FILE" ]; then
  # Extract slug from plan frontmatter
  FEATURE_SLUG=$(grep '^branch:' "$PLAN_FILE" | sed 's/branch: feat\///' | head -1)

  if [ -n "$FEATURE_SLUG" ]; then
    # Create manifest if it doesn't exist
    bash "$SCRIPTS_DIR/feature-manifest.sh" create \
      --slug "$FEATURE_SLUG" --plan "$PLAN_FILE" \
      --branch "feat/$FEATURE_SLUG" --agent "$AGENT_ID"

    # Get next sequence number
    SEQ=$(bash "$SCRIPTS_DIR/feature-manifest.sh" next-sequence \
      --slug "$FEATURE_SLUG" --agent "$AGENT_ID")

    # Create named session file
    SESSION_FILE="$HOME/openclaw/memory/agents/$AGENT_ID/sessions/${AGENT_ID}:${FEATURE_SLUG}-${SEQ}.md"

    # Register session in manifest
    bash "$SCRIPTS_DIR/feature-manifest.sh" add-session \
      --slug "$FEATURE_SLUG" --sequence "$SEQ" --agent "$AGENT_ID" \
      --session-file "$SESSION_FILE" --start "$(date -u +%Y-%m-%dT%H:%M:%SZ)"

    # Collect telemetry
    TELEMETRY_JSON=$(bash "$SCRIPTS_DIR/collect-telemetry.sh" --agent "$AGENT_ID" 2>/dev/null || echo "")
    if [ -n "$TELEMETRY_JSON" ]; then
      TELEMETRY_FILE="/tmp/openclaw-telemetry-${AGENT_ID}-$(date +%s).json"
      echo "$TELEMETRY_JSON" > "$TELEMETRY_FILE"
    fi
  fi
fi
```

If no plan is active, skip this step. Telemetry is still collected for standalone sessions when available.

## Step 3e: Session Completion Notification

Notify all other active agents that this session has ended:

```bash
bash ~/openclaw/memory/scripts/session-done-notify.sh "$AGENT_ID" "<1-line summary>"
```

This sends a mailbox message to every agent with an active presence file. The gateway-host agents and other active agents will see the notification on their next prompt via mailbox injection.

```bash
bash ~/openclaw/config/claude/hooks/statusline-emit.sh step-done "/done" 4
```

```bash
bash ~/openclaw/config/claude/hooks/statusline-emit.sh step-start "/done" 5
```

## Step 4: Save to Shared Memory

This step must complete before any `gh pr merge`, `git-guard deploy`, or other commit that lands on `main`. The files written here are the session-memory payload that must be included in the sync.

### 4a. Daily log

```bash
bash ~/openclaw/skills/done/scripts/save_log.sh "<summary_markdown>"
```

### 4b. Agent context

Update `~/openclaw/memory/$CONTEXT_PATH` with current session state.

### 4c. Decisions

If key decisions made, append to `~/openclaw/memory/shared/decisions/YYYY-MM.md`.

### 4d. Pre-merge checkpoint

Before Step 6 does any PR merge or main-branch commit, confirm all of these are done:

- the Step 3 summary is final
- the daily log has been written
- agent context is updated
- decisions are appended if the session made any

If any item is missing, stop and complete Step 4 before continuing. Do not merge first and "come back for memory later" — that drops the session memory from the sync payload.

## Step 5: Defrag

```bash
find ~/openclaw/memory/shared -name "*.md" -exec wc -l {} + | sort -rn | head -10
find ~/openclaw/memory/agents -name "context.md" -exec wc -l {} + | sort -rn | head -10
```

Trim if over limits (shared: 200 lines, context: 100 lines).

```bash
bash ~/openclaw/config/claude/hooks/statusline-emit.sh step-done "/done" 5
```

```bash
bash ~/openclaw/config/claude/hooks/statusline-emit.sh step-start "/done" 6
```

## Step 6: Sync to GitHub

Build SESSION_SLUG from topic (kebab-case, max 40 chars).

Do not merge any PR or land any main-branch commit in this step until the Step 4 pre-merge checkpoint has passed.

### 6-detect. Detect Working Repo

Identify which repo(s) have changes from this session. The session may have touched:

- The **agents repo** (`~/openclaw`) — code + memory + skills
- An **external repo** (e.g., webclaw, another project) — code only
- **Both** — code in external repo + memory in agents repo

```bash
# Detect working repo from CWD
WORK_REPO=$(git -C "$PWD" rev-parse --show-toplevel 2>/dev/null || echo "")
AGENTS_REPO="$HOME/openclaw"

# Normalize for comparison
WORK_REPO_REAL=$(cd "$WORK_REPO" 2>/dev/null && pwd -P)
AGENTS_REPO_REAL=$(cd "$AGENTS_REPO" 2>/dev/null && pwd -P)

# Determine repo context
if [ "$WORK_REPO_REAL" = "$AGENTS_REPO_REAL" ]; then
  REPO_MODE="agents-only"    # All work in agents repo (most sessions)
else
  # Check if agents repo also has changes (memory writes from this session)
  AGENTS_DIRTY=$(git -C "$AGENTS_REPO" status --porcelain -- memory/ skills/ 2>/dev/null | head -1)
  if [ -n "$AGENTS_DIRTY" ]; then
    REPO_MODE="dual"          # Code in external repo + memory in agents repo
  else
    REPO_MODE="external-only" # All work in external repo
  fi
fi
```

Derive the external repo's GitHub remote for PR creation:

```bash
if [ "$REPO_MODE" != "agents-only" ]; then
  WORK_REMOTE_URL=$(git -C "$WORK_REPO" remote get-url origin 2>/dev/null)
  # Extract owner/repo from HTTPS or SSH URL
  WORK_GH_REPO=$(echo "$WORK_REMOTE_URL" | sed -E 's|.*github\.com[:/]||; s|\.git$||')
fi
```

### 6a-code. Sync Code Changes (if working repo has changes)

**If REPO_MODE is `external-only` or `dual`** — commit and PR in the working repo:

```bash
cd "$WORK_REPO"
CODE_DIRTY=$(git status --porcelain 2>/dev/null | head -1)

if [ -n "$CODE_DIRTY" ]; then
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
  DEFAULT_BRANCH=$(git remote show origin 2>/dev/null | grep 'HEAD branch' | awk '{print $NF}')

  if [ "$CURRENT_BRANCH" = "$DEFAULT_BRANCH" ]; then
    # On default branch — create a feature branch
    git checkout -b "$BRANCH_PREFIX$SESSION_SLUG"
  fi

  # Stage and commit
  git add -- <specific-files-or-dirs>
  git commit -m "<type>: <summary>"

  # Push and create draft PR first
  git push -u origin HEAD
  gh pr create --repo "$WORK_GH_REPO" --base "$DEFAULT_BRANCH" \
    --title "<type>: <summary>" --body "<PR body>" --draft

  # Mark ready for review — triggers Gemini and Claude auto-review webhooks
  gh pr ready "$PR_NUMBER" --repo "$WORK_GH_REPO"

  # --- Overwrite protection (always run before merge) ---
  OVERWRITES_SCRIPT="$HOME/openclaw/skills/done/scripts/check-overwrites.sh"
  if [ -x "$OVERWRITES_SCRIPT" ]; then
    echo "Running overwrite check..."
    OVERWRITE_REPORT=$(bash "$OVERWRITES_SCRIPT" --branch "$CURRENT_BRANCH" 2>&1) || true
    if echo "$OVERWRITE_REPORT" | grep -q "CONFLICT\|OVERWRITE"; then
      echo "WARNING: Potential overwrites detected. Review before merging:"
      echo "$OVERWRITE_REPORT"
      # Do not auto-merge — require manual review of overwrite report
    fi
  fi

  # --- Pre-merge validation (feature branches) ---
  CURRENT_BRANCH=$(git -C "$WORK_REPO" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
  if echo "$CURRENT_BRANCH" | grep -qE '^(feat|fix|refactor)/'; then
    VALIDATE_SCRIPT="$HOME/openclaw/skills/done/scripts/validate-feature.sh"
    if [ -x "$VALIDATE_SCRIPT" ] && [ "$NO_VALIDATE" != "true" ]; then
      echo "Running pre-merge validation..."
      if ! bash "$VALIDATE_SCRIPT" --mode pre-merge --branch "$CURRENT_BRANCH"; then
        echo "Pre-merge validation FAILED — merge blocked. Fix issues and retry."
        # Do not proceed to merge
      fi
    fi
  fi

  if [ "$AUTO_MERGE" = "true" ]; then
    gh pr merge --repo "$WORK_GH_REPO" --squash --delete-branch

    # --- Post-merge validation (auto-merge agents only) ---
    if echo "$CURRENT_BRANCH" | grep -qE '^(feat|fix|refactor)/'; then
      if [ -x "$VALIDATE_SCRIPT" ]; then
        bash "$VALIDATE_SCRIPT" --mode post-merge --branch "$CURRENT_BRANCH" || \
          echo "Warning: post-merge validation reported issues"
      fi
    fi
  fi
fi
```

**Why draft-then-ready:** Creating the PR as a draft first and then marking it ready-for-review fires the `ready_for_review` webhook event. Three auto-review bots listen on this event:

1. **Gemini PR Reviewer** (`com.openclaw.gemini-pr-reviewer`) — Gemini 2.5 Pro via Google GenAI API. Runs at `~/gemini-pr-reviewer/`, port 3001.
2. **Claude PR Reviewer** (`com.openclaw.claude-pr-reviewer`) — Claude Opus 4.6 via CLI (OAuth auth). Runs at `~/claude-pr-reviewer/`, port 3002.
3. **Codex PR Reviewer** — Codex gpt-5.4 via the `pr-review-delegate.sh` script (dispatched by `github-maintenance.sh` every 30 min).

All three are Probot GitHub Apps that receive `pull_request.opened`, `pull_request.synchronize`, and `pull_request.ready_for_review` webhooks. Each posts inline review comments and a summary. Creating a PR directly as ready does not reliably trigger these bots.

Additionally, `scripts/github-maintenance/pr-review-delegate.sh` runs every 30 minutes via launchd (`com.openclaw.github-maintenance`) and catches any PRs that weren't reviewed by the webhook bots, delegating cross-agent reviews (codex PRs → claude, claude PRs → codex, gemini PRs → claude).

**If REPO_MODE is `agents-only`** — skip this step; code changes are handled by 6a-memory below.

### 6a-mrd. Generate MRD (if working repo is textyourai)

**Trigger condition:** Working repo is `textyourai` AND a code PR was created/merged in Step 6a-code AND branch follows `contributor_name/TYA-###-story-title` format.

Generate a Merge Request Description (MRD) document and use it as the PR body. The MRD is both the commit record and the PR documentation.

**Branch name parsing:**

```bash
BRANCH=$(git -C "$WORK_REPO" rev-parse --abbrev-ref HEAD)
# Format: contributor_name/TYA-###-story-title
STORY_NUMBER=$(echo "$BRANCH" | grep -oE 'TYA-[0-9]+' | head -1)
STORY_TITLE=$(echo "$BRANCH" | sed -E 's|^[^/]+/TYA-[0-9]+-||; s/-/ /g')
LINEAR_LINK="https://linear.app/search-party/issue/$STORY_NUMBER"
```

**Tag selection** — based on which source paths changed (`git diff main...HEAD --name-only`):

| Path pattern                                                    | Tag          |
| --------------------------------------------------------------- | ------------ |
| `drizzle/`, `schema.ts`                                         | `migrations` |
| `auth/`, `state-machine.ts`                                     | `auth`       |
| `memory/`, `compaction.ts`, `context-assembler.ts`, `recall.ts` | `memory`     |
| `messaging/`, `loopmessage.ts`                                  | `messaging`  |
| `runtime/`, `interaction-agent.ts`                              | `runtime`    |
| `prompts/`                                                      | `prompts`    |
| `wrangler.toml`, `scripts/`                                     | `infra`      |
| `tests/`, `gate.sh`                                             | `testing`    |
| `docs/`                                                         | `docs`       |

**MRD template:**

```markdown
---
title: { { STORY_TITLE } }
tags: ["mrd", "{{STORY_NUMBER}}", { { ADDITIONAL_TAGS } }]
---

## Story

[{{STORY_NUMBER}}]({{LINEAR_LINK}})

## Context

{{3-6 sentence overview: why this change, what it does, how it fits}}

## Implementation Details

{{Per-file breakdown:}}
{{- Source file name + what/why for each change}}
{{- :new: emoji prefix for new files}}
{{- Scale to change size: small = 1-2 bullets, large = detailed breakdown with h3 sections}}
```

**Write and commit the MRD file:**

```bash
MRD_PATH="$WORK_REPO/docs/mrds/${STORY_NUMBER}-$(echo "$STORY_TITLE" | tr ' ' '-').md"
# Write MRD content to $MRD_PATH
git -C "$WORK_REPO" add "$MRD_PATH"
git -C "$WORK_REPO" commit -m "docs: add MRD for $STORY_NUMBER"
git -C "$WORK_REPO" push
```

**Use MRD as PR body:**

If a PR was already created in 6a-code, update it with the MRD content:

```bash
gh pr edit "$PR_NUMBER" --repo "$WORK_GH_REPO" --body "$(cat "$MRD_PATH")"
```

If no PR yet, use the MRD content as the body when creating the PR.

**Commit message format for textyourai:**

Commits in the textyourai repo should reference the Linear story:

```
<type>: [TYA-###] <summary>
```

**Skip if:** branch doesn't match `*/TYA-*` format, or working repo is not textyourai.

### 6a-mrd-feature. Generate MRD on Feature Complete (if agents repo, Linear ticket assigned)

**Trigger condition:** Working repo is agents repo (`~/openclaw`) AND branch starts with `feat/` AND a Linear ticket is assigned AND GENERATE_MRD=true.

After a feature PR is merged, generate a Merge Request Description documenting what changed:

```bash
if [ "$GENERATE_MRD" = "true" ] && [ -n "$LINEAR_ID" ]; then
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
  if echo "$CURRENT_BRANCH" | grep -qE '^feat/'; then
    FEATURE_SLUG=$(echo "$CURRENT_BRANCH" | sed 's|^feat/||')
    bash "$HOME/openclaw/skills/done/scripts/generate-mrd.sh" \
      --slug "$FEATURE_SLUG" \
      --linear-id "$LINEAR_ID" \
      --pr "$PR_NUMBER" \
      --branch "$CURRENT_BRANCH" \
      ${TELEMETRY_FILE:+--telemetry-file "$TELEMETRY_FILE"}
  fi
fi
```

The MRD is written to `memory/shared/features/{AI-NNN}-{slug}-mrd.md` and used as the PR body. Skip if no Linear ticket is assigned or GENERATE_MRD=false.

### 6a-vercel. Vercel Deploy Verification (if working repo is webclaw)

After merging a webclaw PR, Vercel deploys automatically via GitHub integration. Wait for the deploy and verify it succeeded.

**Trigger condition:** `WORK_GH_REPO` equals `gbharg/webclaw` AND a PR was merged in Step 6a-code.

```bash
if [ "$WORK_GH_REPO" = "gbharg/webclaw" ] && [ -n "$PR_NUMBER" ]; then
  echo "Waiting for Vercel deployment..."

  # Get the merge commit SHA
  MERGE_SHA=$(gh pr view "$PR_NUMBER" --repo gbharg/webclaw --json mergeCommit --jq '.mergeCommit.oid' 2>/dev/null)

  # Poll deployment status (max 3 minutes)
  DEPLOY_OK=false
  for i in $(seq 1 18); do
    STATUS=$(gh api "repos/gbharg/webclaw/deployments?sha=$MERGE_SHA&per_page=1" \
      --jq '.[0].id' 2>/dev/null)
    if [ -n "$STATUS" ]; then
      DEP_STATE=$(gh api "repos/gbharg/webclaw/deployments/$STATUS/statuses?per_page=1" \
        --jq '.[0].state' 2>/dev/null)
      if [ "$DEP_STATE" = "success" ]; then
        DEPLOY_OK=true
        echo "Vercel deploy succeeded for PR #$PR_NUMBER"
        break
      elif [ "$DEP_STATE" = "failure" ] || [ "$DEP_STATE" = "error" ]; then
        echo "Vercel deploy FAILED for PR #$PR_NUMBER (state: $DEP_STATE)"
        break
      fi
    fi
    sleep 10
  done

  if [ "$DEPLOY_OK" = "false" ]; then
    echo "Warning: Vercel deploy did not confirm success within 3 minutes"
  fi

  # Quick smoke check — verify site is reachable
  HTTP_STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 'https://webclaw.dev' 2>/dev/null)
  if [ "$HTTP_STATUS" = "200" ]; then
    echo "webclaw.dev is live (HTTP 200)"
  else
    echo "Warning: webclaw.dev returned HTTP $HTTP_STATUS"
  fi
fi
```

Non-fatal: deploy verification failures are logged but never block `/done`.

### 6a-memory. Sync Memory + Skills (always targets ~/openclaw)

This step is what ships the Step 4 session memory to GitHub. The session summary, daily log, context updates, and decisions must already be written before this runs.

Use `git-guard deploy` for the agents repo. This pauses background
sync, acquires the shared git lock, creates a branch from main (via worktree
if on a feature branch), commits, checks for conflict markers, and pushes.

```bash
cd ~/openclaw
DEPLOY_BRANCH=$(bash memory/scripts/git-guard.sh deploy "$SESSION_SLUG" 2>/tmp/deploy-memory.log)

if [ -z "$DEPLOY_BRANCH" ]; then
  echo "Deploy failed or nothing to commit. Check /tmp/deploy-memory.log"
else
  # Create PR from the deployed branch
  gh pr create --repo gbharg/agents --base main --head "$DEPLOY_BRANCH" \
    --title "memory(<scope>): <summary>" --body "<PR body>"

  if [ "$AUTO_MERGE" = "true" ]; then
    gh pr merge "$DEPLOY_BRANCH" --repo gbharg/agents --squash --delete-branch
  fi
fi
```

If AUTO_MERGE=false: leave PR open, note URL.

Verify merge, pull main, clean stale branches.

### 6a-review. Council Review + Auto-Review (REQUIRED for code PRs)

If the PR branch starts with `feat/`, `fix/`, or `refactor/` (NOT `memory/`):

1. **Ensure PR is ready for review** — if the PR was created as a draft earlier, it should already be marked ready by `gh pr ready`. Verify:

   ```bash
   CODE_PR_REPO="${WORK_GH_REPO:-gbharg/agents}"
   PR_DRAFT=$(gh pr view "$PR_NUMBER" --repo "$CODE_PR_REPO" --json isDraft --jq '.isDraft')
   if [ "$PR_DRAFT" = "true" ]; then
     gh pr ready "$PR_NUMBER" --repo "$CODE_PR_REPO"
   fi
   ```

   This fires the `ready_for_review` webhook, triggering the Claude and Gemini
   auto-review bots (Probot apps on ports 3002 and 3001 respectively). These
   provide fast, independent feedback on every push. No additional dispatch needed.

   For high-stakes PRs, manually invoke `/council:review` for 3-model cross-calibrated
   review. This is NOT auto-triggered to avoid duplicating the webhook bot reviews.

2. **Wait for reviews before merge** — code PRs MUST NOT auto-merge. The PR must collect reviews from:
   - **Claude PR Reviewer** (auto-triggered by webhook bot) — automatic
   - **Gemini PR Reviewer** (auto-triggered by webhook bot) — automatic

   Both bots fire on `ready_for_review` and `synchronize` events. They self-dismiss
   stale reviews on new pushes. No manual dispatch is needed.

3. **Comment resolution gate** — all review comments must be addressed with a reply before merge. Run `check-resolution.sh` to verify. Unresolved comments block merge.

4. Log: `"PR #$PR_NUMBER awaiting Claude + Gemini auto-reviews before merge"`

If the PR branch starts with `memory/` or is a memory-only session: proceed to auto-merge as before (skip this step).

### 6a-changelog. Update Fork Changelog (if code PR was merged in agents repo)

If a code PR was merged in the **agents repo** (branch starts with `feat/`, `fix/`, `refactor/`, or `chore/`), update the fork changelog:

```bash
bash ~/openclaw/skills/done/scripts/update-changelog.sh "$PR_NUMBER" "$PR_TITLE" "$DEPLOY_BRANCH"
```

The script:

- Detects category from branch prefix (Features, Fixes, Refactors, Infrastructure)
- Creates/appends to the correct date section in `AGENTS-CHANGELOG.md`
- Strips conventional commit prefixes for clean display
- Skips memory PRs automatically

Commit the changelog update:

```bash
cd ~/openclaw && git add AGENTS-CHANGELOG.md && git commit -m "docs: update fork changelog for PR #$PR_NUMBER"
```

Skip for external repo PRs — those repos manage their own changelogs.

### 6a-deploy-log. Write Shared Deploy Log (if code PR was merged)

After any code PR is merged (any repo), write a structured deploy-log entry so future agents know exactly what changed in the codebase. This is the primary mechanism for cross-session change awareness.

```bash
bash ~/openclaw/memory/scripts/changelog-write.sh "$PR_NUMBER" \
  --repo "$CODE_PR_REPO" \
  --agent "$AGENT_ID" \
  --summary "<1-2 sentence summary of what changed and why>"
```

The script:

- Fetches PR metadata via `gh` (title, branch, files changed, commits, merge time)
- Writes a structured entry to `memory/shared/changelog/deploy-log.md`
- Updates the fast-access cache at `~/.claude/cache/changelog.md` (last 48h)
- Skips memory-only PRs automatically
- Entry includes: PR link, commit SHAs, files changed with +/- counts, agent attribution

The deploy-log is read by:

- `work-snapshot.sh` — injects compact summary on first prompt (Section 4)
- `agent-memory-bootstrap.sh` — provides deeper context at session start
- `changelog-read.sh --full` — agents can query for full details on demand

Commit the deploy-log update along with other memory files in Step 6a-memory.

**When to write:** Always write a deploy-log entry when a code PR is merged, regardless of whether the PR is in the agents repo or an external repo. The deploy-log serves all agents, not just the one that wrote the code.

**Summary quality:** The `--summary` should describe _what changed and why_ in plain language. Future agents will read this to decide whether the change is relevant to their current task. Bad: "Updated files". Good: "Added token budget system to presence hooks to prevent context injection from exceeding 900 tokens per prompt".

### 6a-pull. Pull latest main (all agents)

Fast-forward the local `main` branch to `origin/main` so the next session starts with the latest code. This is safe regardless of which branch the agent is on — it never switches branches or disrupts worktrees.

```bash
# Always pull agents repo
bash ~/openclaw/skills/done/scripts/pull-main.sh

# Also pull external repo if applicable
if [ "$REPO_MODE" != "agents-only" ] && [ -n "$WORK_REPO" ]; then
  git -C "$WORK_REPO" pull --ff-only origin "$(git -C "$WORK_REPO" remote show origin 2>/dev/null | grep 'HEAD branch' | awk '{print $NF}')" 2>/dev/null || true
fi
```

Non-fatal: failures are logged but never block `/done`.

### 6b. Cross-machine sync

After every successful deployment or merged deploy PR, make sure the other machine lands on the same deployed code. Local fast-forwarding happens in Step 6a-pull. This step handles the iMac deployment copy and its rebuild.

```bash
bash ~/openclaw/skills/done/scripts/sync-imac-after-deploy.sh
```

The script:

- SSHes to `agent@gautams-imac`
- commits any dirty tracked files in `memory/`, `config/`, `skills/` before pulling
- switches to `main` if on another branch
- pulls with `--ff-only`, falling back to `--rebase` if diverged
- applies canonical iMac settings from `config/claude/settings-imac.json` to `~/.claude/settings.json`
- refreshes the generated shared-skills mirror at `~/.openclaw/shared-skills-source`
- re-runs the repo-owned shared skill sync against that mirror
- exports a non-interactive Node/npm `PATH`
- runs `pnpm install` (retrying without `--frozen-lockfile` if needed), `pnpm build`, and `node scripts/ui.js build`
- normalizes the launchd ProgramArguments entry to `openclaw-live/dist/entry.js` before restarting the gateway
- runs `validate-imac-sync.sh` to verify 8 parity checks (non-fatal)

Non-fatal: if the iMac is unreachable or the build fails, log the warning and continue. Call out the drift in the session summary.

### 6b-skill-sync. Local skill deployment sync

After deployment, sync skills from the repo source to all local agent targets (claude, codex, cursor, gemini, openclaw). This replaces the old launchd-based shared-skills-sync jobs.

```bash
bash ~/openclaw/scripts/skill-sync sync
```

This creates symlinks from each agent's skills directory to the repo source. Non-fatal: log any audit warnings but don't block session completion.

### 6b-mcp-sync. MCP server and skills-plugin sync

Sync MCP server configs across all surfaces (Claude Desktop, Claude Code, Codex, Gemini) and update the Claude Code personal skills plugin with any new/changed/removed skills.

```bash
# MCP server config sync (servers.yaml -> all targets)
bash ~/.config/ai-mcp/sync.sh 2>&1 | tail -5

# Skills plugin sync (CLI skills -> personal plugin for Claude Desktop)
bash ~/.config/ai-mcp/sync-skills-plugin.sh 2>&1 | tail -3
```

Non-fatal: log any sync errors but don't block session completion. The MCP sync also runs via launchd WatchPaths on servers.yaml changes, but this ensures it runs at session end too.

### 6c-validate. iMac sync validation

Runs automatically at the end of `sync-imac-after-deploy.sh`. Can also be run standalone:

```bash
bash ~/openclaw/skills/done/scripts/validate-imac-sync.sh [--host agent@gautams-imac] [--quiet]
```

Checks (all via SSH):

1. **Repo HEAD**: iMac HEAD matches origin/main
2. **Rules parity**: MD5 of each `config/claude/rules/*.md` matches MBP
3. **Symlink integrity**: `~/.claude/rules/*.md` symlinks resolve to readable files
4. **Settings sanity**: no `sandbox` key, valid JSON, Linear plugin disabled
5. **Settings parity**: same plugin states, same hook event structure
6. **Dirty state**: no dirty tracked files after sync
7. **Deploy clone absent**: `/Users/Shared/openclaw-deploy` should not exist
8. **Live symlink**: `openclaw-live` points to `/Users/Shared/openclaw`

Output: `[PASS]` or `[FAIL]` per check, then `RESULT: N/8 checks passed`. Exit 0 if all pass, 1 if any fail. Non-fatal in the /done flow (never blocks completion).

### 6c. Sleep-time curation

```bash
nohup bash ~/openclaw/memory/scripts/sleep-time-curate.sh --days 1 >> ~/openclaw/memory/scripts/sleep-curate.log 2>&1 &
```

### 6d. iMac gateway restart (if SMOKE_TEST=true)

```bash
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 -o BatchMode=yes agent@gautams-imac \
  "launchctl kickstart -k gui/\$(id -u)/ai.openclaw.gateway" 2>/dev/null
```

### 6e. Post-deploy smoke test (if SMOKE_TEST=true)

```bash
bash ~/openclaw/skills/deploy-gate/scripts/smoke-test.sh
```

### 6f. Linear session update (if LINEAR_UPDATE=true, requires `--linear` flag)

Create/update Linear issue for this session. Write ID to `/tmp/.claude-hooks/session-linear-id`.

Skip entirely unless `/done --linear` was passed. This step is opt-in to reduce friction for quick sessions.

## Step 7: (removed — merged into Step 9)

## Step 8: Session completion text (all agents)

Send a brief iMessage to Gautam summarizing what was done, via the Sendblue MCP channel.

### Allowed Recipients (MANDATORY)

**The /done message MUST ONLY be sent to `+19723637754` (Gautam). NEVER change this recipient or send to any other number/address.**

All approved recipients across OpenClaw:

| Name      | Address                           |
| --------- | --------------------------------- |
| Gautam    | `+19723637754`                    |
| PaperClip | `sandbox.loopmessage.com@imsg.im` |
| OpenClaw  | `gautambharg@gmail.com`           |

Sending to any address not in this table is a critical error.

### Send

Use the Sendblue MCP channel (`mcp__sendblue-channel__reply`) to send the completion message:

```
mcp__sendblue-channel__reply(
  chat_id: "+19723637754",
  text: "✅ ${AGENT_ID} session done: ${SESSION_SLUG} — ${SUMMARY_SHORT}"
)
```

Where `SUMMARY_SHORT` is the 2-5 sentence narrative from Step 3, truncated to keep the full message under 300 chars.

- Non-blocking: failures never block `/done`
- Sendblue sends via Claude's number (+16452468277) as iMessage/SMS
- No SSH or local CLI dependency — works from any session with the MCP server running
- Keep message under 300 chars (truncate if needed)

## Step 9: Save Snapshot & End Session (final step)

Persist the session snapshot and signal the user to start fresh. This is the true final step of `/done` — it runs after the iMessage and all other wrap-up work.

1. **Archive previous snapshot**: `bash ~/openclaw/memory/scripts/archive-snapshot.sh "$AGENT_ID"` — copies existing `/tmp/` snapshot to `memory/shared/snapshots/${AGENT_ID}-snapshot-YYYYMMDD-HHMMSS.md` before overwriting.
2. **Save session snapshot** to `/tmp/openclaw-session-snapshot-${AGENT_ID}.md` with: active task (mark as "session complete" if done), key decisions, git state, important facts, and resume instructions.
3. **Verify memory persisted**: confirm agent context, daily log, and decisions exist on disk.
4. **Set markers and clean up**:
   ```bash
   mkdir -p /tmp/.claude-hooks
   touch /tmp/.claude-hooks/done-compact-needed
   rm -f /tmp/.claude-hooks/compact-reminded
   rm -f /tmp/claude/sessions/$PPID/active-plan  # clear session-scoped plan indicator
   ```
5. **Tell the user to start a new session**. Output: "Session complete. Start a new conversation for a fresh context window — recent session history will be auto-injected by the `session-bootstrap` hook on your first prompt."

The `session-bootstrap.sh` UserPromptSubmit hook automatically injects the last completed session snapshot (full content) plus 3 previous session summaries on the first prompt of every new session. This replaces the need for `/compact` — a new session gives a clean 200K window with session continuity.

For non-Claude agents, the snapshot is sufficient for recovery via the auto-recall hook.

```bash
bash ~/openclaw/config/claude/hooks/statusline-emit.sh step-done "/done" 6
bash ~/openclaw/config/claude/hooks/statusline-emit.sh skill-done "/done" success
```
