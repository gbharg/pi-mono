#!/usr/bin/env bash
set -euo pipefail
umask 077

#
# agent-wrapper.sh
# Wraps sub-agent execution with git setup, Linear API session lifecycle,
# completion verification, PR creation, and teardown.
#

# ============================================================================
# Configuration
# ============================================================================

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Prevent teardown re-entrance
TEARDOWN_IN_PROGRESS=0

# Track whether error was already handled
HANDLED_ERROR=0

LINEAR_API_URL="https://api.linear.app/graphql"
LINEAR_TEAM_ID="${LINEAR_TEAM_ID:-e368d033-a883-4c2c-a02a-932a2a518beb}"
LINEAR_STATE_IN_REVIEW="${LINEAR_STATE_IN_REVIEW:-e85f987d-0cc9-45aa-a25e-6733c14840e1}"
MAX_LOG_SIZE=$((500 * 1024)) # 500KB
GH_REPO="${GH_REPO:-gbharg/pi-mono}"
AGENT_STALL_TIMEOUT_SECONDS="${AGENT_STALL_TIMEOUT_SECONDS:-300}"

# ============================================================================
# Logging
# ============================================================================

log() {
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] $*" >&2
}

error() {
  log "ERROR: $*"
}

# ============================================================================
# Argument Parsing
# ============================================================================

ISSUE_ID=""
AGENT_NAME=""
TASK=""
MODE="sequential"
WORKTREE_PATH=""
TASK_BRANCH=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --issue)
      ISSUE_ID="$2"
      shift 2
      ;;
    --agent)
      AGENT_NAME="$2"
      shift 2
      ;;
    --task)
      TASK="$2"
      shift 2
      ;;
    --mode)
      MODE="$2"
      shift 2
      ;;
    --worktree-path)
      WORKTREE_PATH="$2"
      shift 2
      ;;
    --task-branch)
      TASK_BRANCH="$2"
      shift 2
      ;;
    *)
      error "Unknown argument: $1"
      exit 1
      ;;
  esac
done

# Validate required arguments
if [[ -z "$ISSUE_ID" ]] || [[ -z "$AGENT_NAME" ]] || [[ -z "$TASK" ]]; then
  error "Missing required arguments: --issue, --agent, --task"
  exit 1
fi

if [[ -z "${LINEAR_API_KEY:-}" ]]; then
  error "LINEAR_API_KEY environment variable is required"
  exit 1
fi

if [[ -z "${LINEAR_APP_TOKEN:-}" ]]; then
  error "LINEAR_APP_TOKEN environment variable is required"
  exit 1
fi

if [[ "$MODE" == "parallel" ]] && [[ -z "$WORKTREE_PATH" || -z "$TASK_BRANCH" ]]; then
  error "Parallel mode requires --worktree-path and --task-branch"
  exit 1
fi

log "Starting agent wrapper for issue $ISSUE_ID, agent $AGENT_NAME, mode $MODE"

# ============================================================================
# Linear API Helper Functions
# ============================================================================

# Retry Linear API calls with exponential backoff on 429
# Args: query, auth_type ("api_key" or "app_token")
linear_api_call() {
  local query="$1"
  local auth_type="${2:-api_key}"
  local max_retries=5
  local retry_count=0
  local backoff=1
  
  local auth_header
  if [[ "$auth_type" == "app_token" ]]; then
    auth_header="Bearer $LINEAR_APP_TOKEN"
  else
    auth_header="$LINEAR_API_KEY"
  fi

  while [[ $retry_count -lt $max_retries ]]; do
    local response
    local http_code
    
    response=$(curl -s -w "\n%{http_code}" \
      -X POST \
      -H "Authorization: $auth_header" \
      -H "Content-Type: application/json" \
      -d "$query" \
      "$LINEAR_API_URL")
    
    http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [[ "$http_code" == "200" ]]; then
      # Check for GraphQL errors
      if echo "$body" | jq -e '.errors' >/dev/null 2>&1; then
        error "Linear API GraphQL error: $(echo "$body" | jq -r '.errors[0].message')"
        return 1
      fi
      echo "$body"
      return 0
    elif [[ "$http_code" == "429" ]]; then
      retry_count=$((retry_count + 1))
      log "Rate limited (429), retry $retry_count/$max_retries after ${backoff}s"
      sleep "$backoff"
      backoff=$((backoff * 2))
    else
      error "Linear API call failed with HTTP $http_code: $body"
      return 1
    fi
  done
  
  error "Max retries exceeded for Linear API call"
  return 1
}

# Create agent session on issue
create_agent_session() {
  local issue_id="$1"
  
  log "Creating Linear AgentSession for issue $issue_id"
  
  local query
  query=$(jq -n \
    --arg issueId "$issue_id" \
    '{
      query: "mutation AgentSessionCreate($issueId: String!) { agentSessionCreateOnIssue(input: { issueId: $issueId }) { success agentSession { id } } }",
      variables: {
        issueId: $issueId
      }
    }')
  
  local result
  result=$(linear_api_call "$query" "app_token")
  
  local session_id
  session_id=$(echo "$result" | jq -r '.data.agentSessionCreateOnIssue.agentSession.id')
  
  if [[ -z "$session_id" ]] || [[ "$session_id" == "null" ]]; then
    error "Failed to create agent session"
    return 1
  fi
  
  log "Created AgentSession: $session_id"
  echo "$session_id"
}

# Post agent activity
post_agent_activity() {
  local session_id="$1"
  local activity_type="$2"
  local body="$3"
  
  log "Posting AgentActivity (type: $activity_type) to session $session_id"
  
  local query
  query=$(jq -n \
    --arg sessionId "$session_id" \
    --arg type "$activity_type" \
    --arg body "$body" \
    '{
      query: "mutation AgentActivityCreate($sessionId: String!, $content: JSONObject!) { agentActivityCreate(input: { agentSessionId: $sessionId, content: $content }) { success } }",
      variables: {
        sessionId: $sessionId,
        content: {
          type: $type,
          body: $body
        }
      }
    }')
  
  linear_api_call "$query" "app_token" >/dev/null
}

# Update issue state
update_issue_state() {
  local issue_id="$1"
  local state_id="$2"
  
  log "Updating issue $issue_id to state $state_id"
  
  local query
  query=$(jq -n \
    --arg issueId "$issue_id" \
    --arg stateId "$state_id" \
    '{
      query: "mutation IssueUpdate($issueId: String!, $stateId: String!) { issueUpdate(id: $issueId, input: { stateId: $stateId }) { success } }",
      variables: {
        issueId: $issueId,
        stateId: $stateId
      }
    }')
  
  linear_api_call "$query" >/dev/null
}

# Post comment on issue
post_issue_comment() {
  local issue_id="$1"
  local body="$2"
  
  log "Posting comment to issue $issue_id"
  
  local query
  query=$(jq -n \
    --arg issueId "$issue_id" \
    --arg body "$body" \
    '{
      query: "mutation CommentCreate($issueId: String!, $body: String!) { commentCreate(input: { issueId: $issueId, body: $body }) { success } }",
      variables: {
        issueId: $issueId,
        body: $body
      }
    }')
  
  linear_api_call "$query" >/dev/null
}

# ============================================================================
# Git Helper Functions
# ============================================================================

# Check for existing PRs (both open and closed)
check_existing_prs() {
  local branch="$1"
  local base="$2"
  
  log "Checking for existing PRs for branch $branch"
  
  # Check for open PRs
  local open_prs
  open_prs=$(gh pr list \
    --repo "$GH_REPO" \
    --head "$branch" \
    --state open \
    --json number,url \
    --jq '.' 2>/dev/null || echo "[]")
  
  local open_count
  open_count=$(echo "$open_prs" | jq 'length')
  
  if [[ "$open_count" -gt 0 ]]; then
    local pr_url
    pr_url=$(echo "$open_prs" | jq -r '.[0].url')
    log "Found existing open PR: $pr_url"
    echo "SKIP|$pr_url"
    return 0
  fi
  
  # Check for closed PRs
  local closed_prs
  closed_prs=$(gh pr list \
    --repo "$GH_REPO" \
    --head "$branch" \
    --state closed \
    --json number,url,closedAt \
    --jq '.' 2>/dev/null || echo "[]")
  
  local closed_count
  closed_count=$(echo "$closed_prs" | jq 'length')
  
  if [[ "$closed_count" -gt 0 ]]; then
    log "Found $closed_count closed PR(s) for this branch"
    local closed_note=""
    local pr_number pr_url
    
    # Build note about closed PRs
    for i in $(seq 0 $((closed_count - 1))); do
      pr_number=$(echo "$closed_prs" | jq -r ".[$i].number")
      pr_url=$(echo "$closed_prs" | jq -r ".[$i].url")
      closed_note="${closed_note}- #${pr_number}: $pr_url
"
    done
    
    echo "CLOSED|$closed_note"
    return 0
  fi
  
  # No existing PRs
  echo "CREATE|"
  return 0
}

# Generate branch slug from issue title
generate_branch_slug() {
  local issue_id="$1"
  
  # Fetch issue title from Linear
  local query
  query=$(jq -n \
    --arg issueId "$issue_id" \
    '{
      query: "query GetIssue($issueId: String!) { issue(id: $issueId) { title identifier } }",
      variables: {
        issueId: $issueId
      }
    }')
  
  local result
  result=$(linear_api_call "$query" "api_key")
  
  local title
  title=$(echo "$result" | jq -r '.data.issue.title')
  
  # Check for empty or null title
  if [[ -z "$title" ]] || [[ "$title" == "null" ]]; then
    title="unnamed"
  fi
  
  # Convert to slug: lowercase, replace spaces/special chars with hyphens, truncate
  echo "$title" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//' | cut -c1-50
}

# ============================================================================
# Agent Definition Parser
# ============================================================================

parse_agent_definition() {
  local agent_name="$1"
  local agent_file="$HOME/.pi/agent/agents/${agent_name}.md"
  
  if [[ ! -f "$agent_file" ]]; then
    error "Agent definition not found: $agent_file"
    return 1
  fi
  
  log "Parsing agent definition: $agent_file"
  
  # Extract frontmatter (between --- and ---)
  local frontmatter
  frontmatter=$(sed -n '/^---$/,/^---$/p' "$agent_file" | sed '1d;$d')
  
  # Parse model (simple key: value format)
  local model
  model=$(echo "$frontmatter" | grep '^model:' | sed 's/^model:[[:space:]]*//' || echo "")
  
  # Parse tools (comma-separated format)
  local tools
  tools=$(echo "$frontmatter" | grep '^tools:' | sed 's/^tools:[[:space:]]*//' | tr -d ' ' || echo "")
  
  echo "$model|$tools"
}

# ============================================================================
# PHASE 1: SETUP
# ============================================================================

phase_setup() {
  log "=== PHASE 1: SETUP ==="
  
  # Create Linear AgentSession
  AGENT_SESSION_ID=$(create_agent_session "$ISSUE_ID")
  export AGENT_SESSION_ID
  export AGENT_ISSUE_ID="$ISSUE_ID"
  export LINEAR_API_KEY
  export LINEAR_APP_TOKEN
  
  # PI-135: Post initial thought activity
  post_agent_activity "$AGENT_SESSION_ID" "thought" "Setting up workspace for $ISSUE_ID"
  
  # Generate branch name
  local slug
  slug=$(generate_branch_slug "$ISSUE_ID")
  
  if [[ "$MODE" == "sequential" ]]; then
    AGENT_BRANCH="feat/$(echo "$ISSUE_ID" | tr "[:upper:]" "[:lower:]")-${slug}"
    log "Creating sequential branch: $AGENT_BRANCH"
    
    # Check for dirty working tree
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
      error "Working tree is dirty"
      return 1
    fi
    
    git checkout -b "$AGENT_BRANCH" main
  else
    # Parallel mode
    AGENT_BRANCH="feat/$(echo "$ISSUE_ID" | tr "[:upper:]" "[:lower:]")/agent-${AGENT_NAME}"
    log "Creating parallel branch: $AGENT_BRANCH from $TASK_BRANCH"
    git branch "$AGENT_BRANCH" "$TASK_BRANCH"
    git worktree add "$WORKTREE_PATH" "$AGENT_BRANCH"
    cd "$WORKTREE_PATH"
  fi
  
  export AGENT_BRANCH
  
  log "Branch created: $AGENT_BRANCH"
  log "Session ID: $AGENT_SESSION_ID"
}

# ============================================================================
# Stall Monitor (PI-134)
# ============================================================================

# Background process that monitors for stalled agents
stall_monitor() {
  local agent_pid="$1"
  local session_id="$2"
  local timeout="$AGENT_STALL_TIMEOUT_SECONDS"
  
  log "Stall monitor started for PID $agent_pid (timeout: ${timeout}s)"
  
  while true; do
    sleep 60
    
    # Check if agent process still exists
    if ! kill -0 "$agent_pid" 2>/dev/null; then
      log "Stall monitor: agent process no longer running"
      break
    fi
    
    # Query latest activity from session
    local query
    query=$(jq -n \
      --arg sessionId "$session_id" \
      '{
        query: "query GetLatestActivity($sessionId: String!) { agentSession(id: $sessionId) { activities(last: 1) { nodes { createdAt } } } }",
        variables: {
          sessionId: $sessionId
        }
      }')
    
    local result
    result=$(linear_api_call "$query" "app_token" 2>/dev/null || echo "{}")
    
    local last_activity_time
    last_activity_time=$(echo "$result" | jq -r '.data.agentSession.activities.nodes[0].createdAt // ""' 2>/dev/null || echo "")
    
    if [[ -n "$last_activity_time" ]] && [[ "$last_activity_time" != "null" ]]; then
      # Calculate time since last activity (approximation using date)
      local now
      now=$(date -u +%s)
      
      # Parse ISO timestamp to epoch (works on macOS and Linux)
      local activity_epoch
      if date -j -f "%Y-%m-%dT%H:%M:%S" "${last_activity_time:0:19}" +%s >/dev/null 2>&1; then
        # macOS date
        activity_epoch=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${last_activity_time:0:19}" +%s)
      else
        # GNU date
        activity_epoch=$(date -d "${last_activity_time:0:19}" +%s 2>/dev/null || echo "$now")
      fi
      
      local elapsed=$((now - activity_epoch))
      
      if [[ $elapsed -gt $timeout ]]; then
        log "Stall detected: no activity for ${elapsed}s (threshold: ${timeout}s)"
        
        # Kill agent with SIGTERM
        log "Sending SIGTERM to agent PID $agent_pid"
        kill -TERM "$agent_pid" 2>/dev/null || true
        
        # Wait 60s for graceful shutdown
        sleep 60
        
        # Check if still alive
        if kill -0 "$agent_pid" 2>/dev/null; then
          log "Agent did not respond to SIGTERM, sending SIGKILL"
          kill -KILL "$agent_pid" 2>/dev/null || true
        fi
        
        # Post error activity
        post_agent_activity "$session_id" "error" "Agent stalled: no activity for ${elapsed} seconds. Process terminated." 2>/dev/null || true
        
        break
      fi
    fi
  done
  
  log "Stall monitor exiting"
}

# ============================================================================
# Stream to Linear (PI-136)
# ============================================================================

# Stream JSON events from pi to Linear activities in real-time
stream_to_linear() {
  local session_id="$1"
  
  # Write Python script to temp file so stdin remains free for pipe data
  local py_script=$(mktemp /tmp/linear-stream-XXXXXX.py)
  cat > "$py_script" <<'PYTHON_SCRIPT'
import sys
import json
import time
import subprocess

session_id = sys.argv[1]
linear_app_token = sys.argv[2]
last_post_time = 0
rate_limit_seconds = 3

# Track tool calls to correlate with execution events
last_tool_calls = {}

def post_activity(activity_type, body, body_data=None):
    global last_post_time
    
    # Rate limit check
    now = time.time()
    if now - last_post_time < rate_limit_seconds:
        return
    
    last_post_time = now
    
    # Build content
    content = {
        "type": activity_type,
        "body": body
    }
    if body_data:
        content["bodyData"] = body_data
    
    # Build GraphQL mutation
    query = json.dumps({
        "query": """mutation AgentActivityCreate($sessionId: String!, $content: JSONObject!) {
            agentActivityCreate(input: {agentSessionId: $sessionId, content: $content}) {
                success
            }
        }""",
        "variables": {
            "sessionId": session_id,
            "content": content
        }
    })
    
    # Post via curl in background
    subprocess.Popen([
        'curl', '-s', '-X', 'POST',
        'https://api.linear.app/graphql',
        '-H', f'Authorization: Bearer {linear_app_token}',
        '-H', 'Content-Type: application/json',
        '-d', query
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def format_tool_args(tool_name, tool_input):
    """Extract key info from tool input for display"""
    if not tool_input:
        return ""
    
    if tool_name == 'bash':
        cmd = tool_input.get('command', '')
        # Truncate long commands
        if len(cmd) > 60:
            cmd = cmd[:57] + '...'
        return f"`{cmd}`"
    
    elif tool_name == 'read':
        path = tool_input.get('path', '')
        return f"`{path}`"
    
    elif tool_name == 'edit':
        path = tool_input.get('path', '')
        return f"`{path}`"
    
    elif tool_name == 'write':
        path = tool_input.get('path', '')
        return f"`{path}`"
    
    return ""

# Process each line from stdin
for line in sys.stdin:
    # Passthrough immediately
    print(line, end='', flush=True)
    
    # Parse and handle events
    try:
        event = json.loads(line.strip())
        event_type = event.get('type')
        
        if event_type == 'message_end':
            # Track tool calls for later correlation
            message = event.get('message', {})
            if message.get('role') == 'assistant':
                content = message.get('content', [])
                
                # Save tool calls for upcoming tool_execution_start events
                for block in content:
                    if block.get('type') == 'tool_use':
                        tool_call_id = block.get('id')
                        tool_name = block.get('name')
                        tool_input = block.get('input', {})
                        if tool_call_id:
                            last_tool_calls[tool_call_id] = {
                                'name': tool_name,
                                'input': tool_input
                            }
                
                # Extract text content (skip tool calls)
                text_parts = [block.get('text', '') for block in content if block.get('type') == 'text']
                if text_parts:
                    full_text = ''.join(text_parts).strip()
                    # Only post if meaningful (> 20 chars)
                    if len(full_text) > 20:
                        # Truncate to 200 chars
                        if len(full_text) > 200:
                            full_text = full_text[:197] + '...'
                        post_activity('thought', full_text)
        
        elif event_type == 'tool_execution_start':
            tool_call_id = event.get('toolCallId')
            tool_name = event.get('toolName', 'unknown')
            
            # Try to find saved tool call args
            tool_info = last_tool_calls.get(tool_call_id, {})
            tool_input = tool_info.get('input')
            
            # Format with args if available
            args_display = format_tool_args(tool_name, tool_input)
            if args_display:
                body = f"**{tool_name}** {args_display}"
            else:
                body = f"**{tool_name}**"
            
            post_activity('action', body)
        
        elif event_type == 'agent_end':
            # Extract final assistant message if available
            summary = event.get('summary', '')
            if not summary:
                # Try to extract from last message
                summary = 'Task completed'
            
            # Clean up and post as handoff
            if len(summary) > 200:
                summary = summary[:197] + '...'
            
            post_activity('response', summary)
    
    except (json.JSONDecodeError, Exception):
        # Ignore malformed lines
        pass
PYTHON_SCRIPT
  
  # Execute Python with temp file, then clean up
  python3 "$py_script" "$session_id" "$LINEAR_APP_TOKEN"
  rm -f "$py_script"
}

# ============================================================================
# PHASE 2: EXECUTION
# ============================================================================

phase_execution() {
  log "=== PHASE 2: EXECUTION ==="
  
  local log_file="/tmp/agent-session-${AGENT_SESSION_ID}.log"
  
  # Parse agent definition
  local agent_info
  agent_info=$(parse_agent_definition "$AGENT_NAME")
  local agent_model
  agent_model=$(echo "$agent_info" | cut -d'|' -f1)
  local agent_tools
  agent_tools=$(echo "$agent_info" | cut -d'|' -f2)
  
  # Extract system prompt (content after frontmatter)
  local agent_file="$HOME/.pi/agent/agents/${AGENT_NAME}.md"
  local system_prompt
  system_prompt=$(awk '/^---$/{c++;next} c>=2' "$agent_file")
  
  log "Agent model: $agent_model"
  log "Agent tools: $agent_tools"
  
  # Write system prompt to temp file
  local system_prompt_file="/tmp/agent-system-prompt-${AGENT_SESSION_ID}.txt"
  echo "$system_prompt" > "$system_prompt_file"
  
  # Build Pi command as array
  local pi_cmd=(./node_modules/.bin/tsx packages/coding-agent/src/cli.ts -p --mode json --no-session --no-extensions)
  
  if [[ -n "$agent_model" ]]; then
    pi_cmd+=(--model "$agent_model")
  fi
  
  if [[ -n "$agent_tools" ]]; then
    pi_cmd+=(--tools "$agent_tools")
  fi
  
  if [[ -n "$system_prompt" ]]; then
    pi_cmd+=(--append-system-prompt "$system_prompt_file")
  fi
  
  # Add task as prompt
  pi_cmd+=(-- "$TASK")
  
  log "Spawning agent: ${pi_cmd[*]}"
  log "Output tee'd to: $log_file"
  
  # Execute agent and capture exit code
  set +e
  "${pi_cmd[@]}" 2>&1 | stream_to_linear "$AGENT_SESSION_ID" | tee "$log_file" &
  local AGENT_PID=$!
  
  # PI-134: Start stall monitor in background
  stall_monitor "$AGENT_PID" "$AGENT_SESSION_ID" &
  local STALL_MONITOR_PID=$!
  
  # Wait for agent to complete
  wait "$AGENT_PID"
  AGENT_EXIT_CODE=$?
  
  # Kill stall monitor
  kill "$STALL_MONITOR_PID" 2>/dev/null || true
  wait "$STALL_MONITOR_PID" 2>/dev/null || true
  
  set -e
  
  log "Agent exited with code: $AGENT_EXIT_CODE"
  
  return $AGENT_EXIT_CODE
}

# ============================================================================
# PHASE 3: VERIFICATION
# ============================================================================

phase_verification() {
  log "=== PHASE 3: VERIFICATION ==="
  
  if [[ $AGENT_EXIT_CODE -ne 0 ]]; then
    log "Agent failed with exit code $AGENT_EXIT_CODE"
    
    # Get last 50 lines of log
    local log_file="/tmp/agent-session-${AGENT_SESSION_ID}.log"
    local error_log
    error_log=$(tail -n 50 "$log_file" 2>/dev/null || echo "No log available")
    
    # Post error activity
    local error_msg="Agent failed with exit code $AGENT_EXIT_CODE

Last 50 lines of output:
\`\`\`
$error_log
\`\`\`"
    
    post_agent_activity "$AGENT_SESSION_ID" "error" "$error_msg"
    
    # Post error comment on issue
    post_issue_comment "$ISSUE_ID" "❌ Agent \`$AGENT_NAME\` failed with exit code $AGENT_EXIT_CODE. See session $AGENT_SESSION_ID for details."
    
    error "Verification failed: agent exited with non-zero code"
    return 1
  fi
  
  # Determine base ref based on mode
  local BASE_REF
  if [[ "$MODE" == "parallel" ]]; then
    BASE_REF="$TASK_BRANCH"
  else
    BASE_REF="main"
  fi
  
  # Verify new commits exist
  local commit_count
  commit_count=$(git rev-list --count "$BASE_REF..$AGENT_BRANCH" 2>/dev/null || echo "0")
  
  if [[ "$commit_count" -eq 0 ]]; then
    local err_msg="No new commits found on branch $AGENT_BRANCH"
    error "$err_msg"
    post_agent_activity "$AGENT_SESSION_ID" "error" "$err_msg"
    post_issue_comment "$ISSUE_ID" "❌ Agent \`$AGENT_NAME\` completed but created no commits."
    return 1
  fi
  
  log "Found $commit_count new commit(s)"
  
  # PI-132: Verify response activity was posted
  # NOTE: Warn-only for now until agents reliably follow completion protocol
  log "Verifying response activity exists"
  local query
  query=$(jq -n \
    --arg sessionId "$AGENT_SESSION_ID" \
    '{
      query: "query GetActivities($sessionId: String!) { agentSession(id: $sessionId) { activities(last: 5) { nodes { content { __typename ... on AgentActivityResponseContent { type body } ... on AgentActivityThoughtContent { type body } ... on AgentActivityErrorContent { type body } ... on AgentActivityActionContent { type action } } } } } }",
      variables: {
        sessionId: $sessionId
      }
    }')
  
  local result
  result=$(linear_api_call "$query" "app_token")
  
  local has_response
  has_response=$(echo "$result" | jq -r '[.data.agentSession.activities.nodes[].content | select(.__typename == "AgentActivityResponseContent")] | length > 0')
  
  if [[ "$has_response" != "true" ]]; then
    local warn_msg="Agent did not post required response activity (READY signal)"
    log "WARNING: $warn_msg"
    # TODO: Make this a hard failure once agents reliably follow completion protocol
  else
    log "Response activity verified"
  fi
  
  # PI-133: Verify plan was posted
  # NOTE: Warn-only for now until agents reliably follow completion protocol
  log "Verifying plan exists"
  query=$(jq -n \
    --arg sessionId "$AGENT_SESSION_ID" \
    '{
      query: "query GetPlan($sessionId: String!) { agentSession(id: $sessionId) { plan } }",
      variables: {
        sessionId: $sessionId
      }
    }')
  
  result=$(linear_api_call "$query" "app_token")
  
  local plan
  plan=$(echo "$result" | jq -r '.data.agentSession.plan // "null"')
  
  if [[ -z "$plan" ]] || [[ "$plan" == "null" ]]; then
    local warn_msg="Agent did not post required plan"
    log "WARNING: $warn_msg"
    # TODO: Make this a hard failure once agents reliably follow completion protocol
  else
    log "Plan verified"
  fi
  
  # Verify conventional commit format and Co-Authored-By trailer
  local commits
  commits=$(git rev-list "$BASE_REF..$AGENT_BRANCH")
  
  for commit in $commits; do
    local msg
    msg=$(git log -1 --format=%B "$commit")
    
    local subject
    subject=$(echo "$msg" | head -n1)
    
    # Check conventional commit format (type(scope): message or type: message)
    if ! echo "$subject" | grep -qE '^(feat|fix|docs|style|refactor|perf|test|chore|build|ci)(\(.+\))?: .+'; then
      local err_msg="Commit $commit does not follow conventional commit format: $subject"
      error "$err_msg"
      post_agent_activity "$AGENT_SESSION_ID" "error" "$err_msg"
      post_issue_comment "$ISSUE_ID" "❌ Agent \`$AGENT_NAME\` created invalid commit format."
      return 1
    fi
    
    # Check Co-Authored-By trailer
    if ! echo "$msg" | grep -q '^Co-Authored-By:'; then
      local err_msg="Commit $commit missing Co-Authored-By trailer"
      error "$err_msg"
      post_agent_activity "$AGENT_SESSION_ID" "error" "$err_msg"
      post_issue_comment "$ISSUE_ID" "❌ Agent \`$AGENT_NAME\` created commit without Co-Authored-By trailer."
      return 1
    fi
  done
  
  log "All commits verified successfully"
  return 0
}

# ============================================================================
# PHASE 4: FINALIZATION
# ============================================================================

phase_finalization() {
  log "=== PHASE 4: FINALIZATION ==="
  
  local log_file="/tmp/agent-session-${AGENT_SESSION_ID}.log"
  local last_commit
  last_commit=$(git rev-parse HEAD)
  
  # Attach session log as git note (truncate if too large)
  log "Attaching session log to commit $last_commit"
  
  local log_content
  if [[ -f "$log_file" ]]; then
    local log_size
    log_size=$(stat -f%z "$log_file" 2>/dev/null || stat -c%s "$log_file" 2>/dev/null || echo "0")
    
    if [[ "$log_size" -gt "$MAX_LOG_SIZE" ]]; then
      log "Log file too large ($log_size bytes), truncating to last 10000 lines"
      log_content=$(tail -n 10000 "$log_file")
      log_content="[Log truncated - showing last 10000 lines]

$log_content"
    else
      log_content=$(cat "$log_file")
    fi
    
    echo "$log_content" | git notes add -F - "$last_commit"
  else
    log "Warning: log file not found, skipping git note"
  fi
  
  # Push branch
  log "Pushing branch $AGENT_BRANCH"
  git push origin "$AGENT_BRANCH"
  
  # Push notes
  log "Pushing git notes"
  git push origin refs/notes/commits || log "Warning: failed to push notes (may not exist)"
  
  # Determine PR base based on mode
  local PR_BASE
  if [[ "$MODE" == "parallel" ]]; then
    PR_BASE="$TASK_BRANCH"
  else
    PR_BASE="main"
  fi
  
  # Check for existing PRs
  log "Checking for duplicate PRs"
  local pr_check_result
  pr_check_result=$(check_existing_prs "$AGENT_BRANCH" "$PR_BASE")
  
  local pr_action
  pr_action=$(echo "$pr_check_result" | cut -d'|' -f1)
  local pr_data
  pr_data=$(echo "$pr_check_result" | cut -d'|' -f2-)
  
  local pr_url=""
  
  if [[ "$pr_action" == "SKIP" ]]; then
    # Open PR already exists, skip creation
    pr_url="$pr_data"
    log "Skipping PR creation: open PR already exists at $pr_url"
    
    # Post activity noting that PR already exists
    post_agent_activity "$AGENT_SESSION_ID" "response" "Branch pushed successfully. Existing pull request: $pr_url"
    
    # Update issue comment to note existing PR
    post_issue_comment "$ISSUE_ID" "✅ Agent \`$AGENT_NAME\` completed successfully. Existing pull request: $pr_url"
    
  else
    # Create PR (either no PRs exist or only closed ones)
    log "Creating pull request"
    
    local pr_title
    pr_title=$(git log -1 --format=%s "$last_commit")
    
    local pr_body="Resolves $ISSUE_ID

Agent: \`$AGENT_NAME\`
Session: $AGENT_SESSION_ID"
    
    # If closed PRs exist, add them to the body
    if [[ "$pr_action" == "CLOSED" ]]; then
      pr_body="$pr_body

---

### Previous PRs
This branch had previous pull requests that were closed:
$pr_data"
    fi
    
    pr_body="$pr_body

---
Auto-generated by agent wrapper"
    
    pr_url=$(gh pr create \
      --repo "$GH_REPO" \
      --base "$PR_BASE" \
      --head "$AGENT_BRANCH" \
      --title "$pr_title" \
      --body "$pr_body" 2>&1 | grep -o 'https://github.com[^ ]*' || echo "")
    
    if [[ -z "$pr_url" ]]; then
      log "Warning: failed to extract PR URL, attempting to find PR"
      pr_url=$(gh pr list --repo "$GH_REPO" --head "$AGENT_BRANCH" --json url --jq '.[0].url' 2>/dev/null || echo "")
    fi
    
    # Verify PR was created successfully
    if [[ -z "$pr_url" ]] || [[ "$pr_url" != https://github.com/* ]]; then
      local err_msg="Failed to create pull request for branch $AGENT_BRANCH"
      error "$err_msg"
      post_agent_activity "$AGENT_SESSION_ID" "error" "$err_msg"
      return 1
    fi
    
    log "Pull request created: $pr_url"
    
    # Post handoff activity
    local handoff_msg="Agent completed successfully. Pull request created: $pr_url

Changes:
- $(git rev-list --count "$PR_BASE..$AGENT_BRANCH") commit(s)
- $(git diff --shortstat "$PR_BASE..$AGENT_BRANCH")"
    
    post_agent_activity "$AGENT_SESSION_ID" "response" "$handoff_msg"
    
    # Post completion comment
    post_issue_comment "$ISSUE_ID" "✅ Agent \`$AGENT_NAME\` completed successfully. Pull request: $pr_url"
  fi
  
  # Move issue to In Review
  log "Moving issue to In Review state"
  update_issue_state "$ISSUE_ID" "$LINEAR_STATE_IN_REVIEW"
  
  log "Finalization complete"
}

# ============================================================================
# PHASE 5: TEARDOWN
# ============================================================================

phase_teardown() {
  log "=== PHASE 5: TEARDOWN ==="
  
  TEARDOWN_IN_PROGRESS=1
  
  # Clean up temp files
  if [[ -n "${AGENT_SESSION_ID:-}" ]]; then
    rm -f "/tmp/agent-system-prompt-${AGENT_SESSION_ID}.txt"
    rm -f "/tmp/agent-session-${AGENT_SESSION_ID}.log"
  fi
  
  if [[ "$MODE" != "parallel" ]]; then
    log "Sequential mode, no teardown needed"
    return 0
  fi
  
  # Parallel mode: only remove worktree, leave branches for orchestrator
  # Return to repo root
  cd "$REPO_ROOT"
  
  # Remove worktree only
  if [[ -d "$WORKTREE_PATH" ]]; then
    log "Removing worktree: $WORKTREE_PATH"
    git worktree remove "$WORKTREE_PATH" --force || log "Warning: failed to remove worktree"
  fi
  
  log "Teardown complete - branches left for orchestrator"
}

# ============================================================================
# Error Handler
# ============================================================================

cleanup_on_error() {
  local exit_code=$?
  
  if [[ $exit_code -ne 0 ]]; then
    error "Script failed with exit code $exit_code"
    
    if [[ -n "${AGENT_SESSION_ID:-}" ]] && [[ $HANDLED_ERROR -eq 0 ]]; then
      post_agent_activity "$AGENT_SESSION_ID" "error" "Script failed unexpectedly with exit code $exit_code" || true
      # Clean up temp files
      rm -f "/tmp/agent-system-prompt-${AGENT_SESSION_ID}.txt"
      rm -f "/tmp/agent-session-${AGENT_SESSION_ID}.log"
    fi
    
    # Attempt teardown in parallel mode (only if not already in teardown)
    if [[ $TEARDOWN_IN_PROGRESS -eq 0 ]] && [[ "$MODE" == "parallel" ]] && [[ -n "${WORKTREE_PATH:-}" ]]; then
      cd "$REPO_ROOT" 2>/dev/null || true
      git worktree remove "$WORKTREE_PATH" --force 2>/dev/null || true
    fi
  fi
}

trap cleanup_on_error EXIT

# ============================================================================
# Main Execution
# ============================================================================

main() {
  phase_setup
  
  set +e
  phase_execution
  AGENT_EXIT_CODE=$?
  set -e
  
  if ! phase_verification; then
    log "Verification failed, stopping here"
    HANDLED_ERROR=1
    exit 1
  fi
  
  phase_finalization
  phase_teardown
  
  log "=== AGENT WRAPPER COMPLETE ==="
  log "Session: $AGENT_SESSION_ID"
  log "Branch: $AGENT_BRANCH"
}

main
