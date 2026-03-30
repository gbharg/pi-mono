#!/usr/bin/env bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0

# Test issue details
ISSUE_ID="1a106115-3d8b-421d-896b-fdcb15524fc7"
ISSUE_KEY="PI-61"
ISSUE_KEY_LOWER="pi-61"
STATE_IN_PROGRESS="529d5508-64a6-45ef-aad0-fcdcf66d68b1"
STATE_IN_REVIEW="e85f987d-0cc9-45aa-a25e-6733c14840e1"
STATE_PLAN="de4c2bec-7fd8-4785-a95f-178342078944"

# Save original branch and wrapper script path
ORIGINAL_BRANCH=$(git branch --show-current)
WRAPPER_SCRIPT="${PWD}/scripts/agent-wrapper.sh"

timestamp() {
    date -u +%Y-%m-%dT%H:%M:%S.000Z
}

log() {
    echo -e "${BLUE}[$(timestamp)]${NC} $*"
}

pass() {
    ((PASSED_CHECKS++)) || true
    ((TOTAL_CHECKS++)) || true
    echo -e "${GREEN}✓ PASS${NC}: $*"
}

fail() {
    ((TOTAL_CHECKS++)) || true
    echo -e "${RED}✗ FAIL${NC}: $*"
}

warn() {
    echo -e "${YELLOW}⚠ WARN${NC}: $*"
}

# Source credentials
if [[ -f .pi/.env ]]; then
    log "Sourcing credentials from .pi/.env"
    set -a
    source .pi/.env
    set +a
else
    log "ERROR: .pi/.env not found"
    exit 1
fi

if [[ -z "${LINEAR_API_KEY:-}" ]] || [[ -z "${LINEAR_APP_TOKEN:-}" ]]; then
    log "ERROR: LINEAR_API_KEY or LINEAR_APP_TOKEN not set"
    exit 1
fi

# Linear API helper
linear_query() {
    local query="$1"
    local token="${2:-$LINEAR_API_KEY}"
    local auth_header
    if [[ "$token" == "$LINEAR_APP_TOKEN" ]]; then
        auth_header="Bearer ${token}"
    else
        auth_header="${token}"
    fi
    
    local payload
    payload=$(jq -n --arg q "$query" '{query: $q}')
    
    curl -s https://api.linear.app/graphql \
        -H "Authorization: ${auth_header}" \
        -H "Content-Type: application/json" \
        -d "$payload"
}

# Move issue to state
move_issue_to_state() {
    local state_id="$1"
    local state_name="$2"
    log "Moving ${ISSUE_KEY} to ${state_name}..."
    
    local payload
    payload=$(jq -n \
        --arg issueId "$ISSUE_ID" \
        --arg stateId "$state_id" \
        '{
            query: "mutation IssueUpdate($issueId: String!, $stateId: String!) { issueUpdate(id: $issueId, input: {stateId: $stateId}) { success issue { id state { name } } } }",
            variables: {
                issueId: $issueId,
                stateId: $stateId
            }
        }')
    
    local result
    result=$(curl -s https://api.linear.app/graphql \
        -H "Authorization: $LINEAR_API_KEY" \
        -H "Content-Type: application/json" \
        -d "$payload")
    
    if echo "$result" | jq -e '.data.issueUpdate.success' > /dev/null 2>&1; then
        log "Issue moved to ${state_name}"
        return 0
    else
        warn "Failed to move issue: $(echo "$result" | jq -r '.errors[0].message // "unknown error"')"
        return 1
    fi
}

# Get AgentSessions for issue
get_agent_sessions() {
    local query="query {
        agentSessions(first: 50, orderBy: createdAt) {
            nodes {
                id
                status
                createdAt
                issue {
                    identifier
                }
            }
        }
    }"
    
    # Use app token for agent sessions, filter client-side for our issue
    linear_query "$query" "$LINEAR_APP_TOKEN" | jq --arg issue "$ISSUE_KEY" '.data.agentSessions.nodes // [] | map(select(.issue.identifier == $issue))'
}

# Get issue state
get_issue_state() {
    local query="query {
        issue(id: \"${ISSUE_ID}\") {
            state { id name }
        }
    }"
    
    linear_query "$query" | jq -r '.data.issue.state.name // "unknown"'
}

# Get latest comments on issue
get_issue_comments() {
    local query="query {
        issue(id: \"${ISSUE_ID}\") {
            comments(last: 10) {
                nodes {
                    body
                    createdAt
                }
            }
        }
    }"
    
    linear_query "$query" | jq -r '.data.issue.comments.nodes // []'
}

# Cleanup function
cleanup_test() {
    local branch_pattern="$1"
    log "Cleaning up test artifacts..."
    
    # Return to original branch
    git checkout "$ORIGINAL_BRANCH" 2>/dev/null || true
    
    # Find and delete branches matching pattern
    local branches=$(git branch --no-color --list "${branch_pattern}" | sed 's/^[ *]*//')
    for branch in $branches; do
        if [[ -n "$branch" ]]; then
            log "Deleting local branch: $branch"
            git branch -D "$branch" 2>/dev/null || true
            
            # Try to delete remote
            if git ls-remote --exit-code origin "$branch" > /dev/null 2>&1; then
                log "Deleting remote branch: $branch"
                git push origin --delete "$branch" 2>/dev/null || true
            fi
        fi
    done
    
    # Delete test file if exists
    if [[ -f test-output.txt ]]; then
        log "Deleting test-output.txt"
        rm -f test-output.txt
    fi
    
    # Move issue back to Plan
    move_issue_to_state "$STATE_PLAN" "Plan" || warn "Failed to reset issue state"
    
    log "Cleanup complete"
}

# TEST 1: Happy Path
test_happy_path() {
    log "========================================="
    log "TEST 1: HAPPY PATH"
    log "========================================="
    
    local test_failed=0
    
    # Setup
    move_issue_to_state "$STATE_IN_PROGRESS" "In Progress" || {
        fail "Could not move issue to In Progress"
        return 1
    }
    sleep 2
    
    # Record current session count
    local sessions_before=$(get_agent_sessions | jq 'length')
    log "AgentSessions before: $sessions_before"
    
    # Record time for filtering new comments
    local test_start=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    # Run wrapper
    log "Running agent wrapper..."
    local wrapper_output=$(mktemp)
    if "$WRAPPER_SCRIPT" \
        --issue "$ISSUE_KEY" \
        --agent worker \
        --task "Create a file called test-output.txt containing 'hello world from agent test'. Then commit it with: git add test-output.txt && git commit -m 'chore: add test output file' -m '' -m 'Co-Authored-By: agent/worker <test@noreply>'" \
        --mode sequential > "$wrapper_output" 2>&1; then
        log "Wrapper completed successfully"
    else
        log "Wrapper failed with exit code $?"
        cat "$wrapper_output"
        fail "Wrapper execution"
        test_failed=1
        cleanup_test "feat/${ISSUE_KEY_LOWER}-*"
        rm -f "$wrapper_output"
        return 1
    fi
    
    cat "$wrapper_output"
    rm -f "$wrapper_output"
    
    log "Waiting for Linear updates..."
    sleep 5  # Give Linear time to update
    
    # Verification 1: AgentSession created
    log "Checking AgentSession creation..."
    local sessions_after=$(get_agent_sessions | jq 'length')
    if [[ $sessions_after -gt $sessions_before ]]; then
        pass "AgentSession created (count: $sessions_before → $sessions_after)"
    else
        fail "AgentSession not created (count: $sessions_before → $sessions_after)"
        test_failed=1
    fi
    
    # Verification 2: Branch exists
    log "Checking branch creation..."
    local branch=$(git branch --no-color --list "feat/${ISSUE_KEY_LOWER}-*" | head -1 | sed 's/^[ *]*//')
    if [[ -n "$branch" ]]; then
        pass "Branch created: $branch"
    else
        fail "No branch matching feat/${ISSUE_KEY_LOWER}-*"
        test_failed=1
        cleanup_test "feat/${ISSUE_KEY_LOWER}-*"
        return 1
    fi
    
    # Verification 3: Commit exists with conventional format
    log "Checking commit format..."
    local commit_msg=$(git log "$branch" --oneline -1 --pretty=format:%s 2>/dev/null || echo "")
    if [[ "$commit_msg" =~ ^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?:.+ ]]; then
        pass "Commit has conventional format: $commit_msg"
    else
        fail "Commit missing conventional format: $commit_msg"
        test_failed=1
    fi
    
    # Verification 4: Co-Authored-By trailer present
    log "Checking Co-Authored-By trailer..."
    local full_commit=$(git log "$branch" --format=%B -1 2>/dev/null || echo "")
    if echo "$full_commit" | grep -q "Co-Authored-By:"; then
        pass "Co-Authored-By trailer present"
    else
        fail "Co-Authored-By trailer missing"
        warn "Commit body: $full_commit"
        test_failed=1
    fi
    
    # Verification 5: Git note attached
    log "Checking git notes..."
    local commit_hash=$(git rev-parse "$branch" 2>/dev/null || echo "")
    if [[ -n "$commit_hash" ]]; then
        if git notes show "$commit_hash" > /dev/null 2>&1; then
            local note_content=$(git notes show "$commit_hash")
            pass "Git note attached to commit"
            log "Note content: $note_content"
        else
            fail "Git note not attached to commit"
            test_failed=1
        fi
    else
        fail "Could not get commit hash"
        test_failed=1
    fi
    
    # Verification 6: Branch pushed to origin
    log "Checking remote branch..."
    if git ls-remote --exit-code origin "$branch" > /dev/null 2>&1; then
        pass "Branch pushed to origin"
    else
        fail "Branch not pushed to origin"
        test_failed=1
    fi
    
    # Verification 7: Issue state is In Review
    log "Checking issue state..."
    local current_state=$(get_issue_state)
    if [[ "$current_state" == "In Review" ]]; then
        pass "Issue state is In Review"
    else
        fail "Issue state is '$current_state', expected 'In Review'"
        test_failed=1
    fi
    
    # Verification 8: Completion comment posted
    log "Checking for completion comment..."
    local comments=$(get_issue_comments)
    local recent_comments=$(echo "$comments" | jq --arg start "$test_start" '[.[] | select(.createdAt >= $start)]')
    if echo "$recent_comments" | jq -e '.[] | select(.body | ascii_downcase | contains("completed") or contains("success") or contains("✓") or contains("done"))' > /dev/null 2>&1; then
        pass "Completion comment posted"
    else
        warn "Could not confirm completion comment (may be false negative)"
        warn "Recent comments: $(echo "$recent_comments" | jq -r '.[].body' | head -c 200)"
        ((TOTAL_CHECKS++)) || true
    fi
    
    # Cleanup
    cleanup_test "feat/${ISSUE_KEY_LOWER}-*"
    log "Test 1 complete"
    
    return $test_failed
}

# TEST 2: Error Path
test_error_path() {
    log "========================================="
    log "TEST 2: ERROR PATH"
    log "========================================="
    
    local test_failed=0
    
    # Setup
    move_issue_to_state "$STATE_IN_PROGRESS" "In Progress" || {
        fail "Could not move issue to In Progress"
        return 1
    }
    sleep 2
    
    # Record current session count
    local sessions_before=$(get_agent_sessions | jq 'length')
    log "AgentSessions before: $sessions_before"
    
    # Record time for filtering new comments
    local test_start=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    # Run wrapper (expecting failure)
    log "Running agent wrapper with failing task..."
    local wrapper_output=$(mktemp)
    if "$WRAPPER_SCRIPT" \
        --issue "$ISSUE_KEY" \
        --agent worker \
        --task "Run exit 1 immediately" \
        --mode sequential > "$wrapper_output" 2>&1; then
        log "Wrapper completed (unexpectedly succeeded)"
        cat "$wrapper_output"
        warn "Wrapper should have failed but succeeded"
    else
        log "Wrapper failed as expected (exit code $?)"
        cat "$wrapper_output"
    fi
    
    rm -f "$wrapper_output"
    
    log "Waiting for Linear updates..."
    sleep 5  # Give Linear time to update
    
    # Verification 1: Session created and has error status
    log "Checking AgentSession status..."
    local sessions=$(get_agent_sessions)
    local new_sessions=$(echo "$sessions" | jq --arg start "$test_start" '[.[] | select(.createdAt >= $start)]')
    local new_session_count=$(echo "$new_sessions" | jq 'length')
    
    if [[ $new_session_count -gt 0 ]]; then
        pass "AgentSession created (new sessions: $new_session_count)"
        
        # Check latest session status
        local latest_session_status=$(echo "$new_sessions" | jq -r 'sort_by(.createdAt) | reverse | .[0].status // "unknown"')
        if [[ "$latest_session_status" == "error" ]]; then
            pass "Session status is 'error'"
        else
            fail "Session status is '$latest_session_status', expected 'error'"
            test_failed=1
        fi
    else
        fail "AgentSession not created"
        test_failed=1
    fi
    
    # Verification 2: Issue state is NOT In Review (should stay In Progress)
    log "Checking issue state..."
    local current_state=$(get_issue_state)
    if [[ "$current_state" != "In Review" ]]; then
        pass "Issue state is '$current_state' (not In Review)"
    else
        fail "Issue state is 'In Review', should have stayed in original state"
        test_failed=1
    fi
    
    # Verification 3: Error comment posted
    log "Checking for error comment..."
    local comments=$(get_issue_comments)
    local recent_comments=$(echo "$comments" | jq --arg start "$test_start" '[.[] | select(.createdAt >= $start)]')
    if echo "$recent_comments" | jq -e '.[] | select(.body | ascii_downcase | contains("error") or contains("failed") or contains("✗") or contains("fail"))' > /dev/null 2>&1; then
        pass "Error comment posted"
    else
        warn "Could not confirm error comment (may be false negative)"
        warn "Recent comments: $(echo "$recent_comments" | jq -r '.[].body' | head -c 200)"
        ((TOTAL_CHECKS++)) || true
    fi
    
    # Verification 4: No PR created
    log "Checking for PRs..."
    local all_prs=$(gh pr list --json headRefName,number 2>/dev/null || echo "[]")
    local matching_prs=$(echo "$all_prs" | jq --arg prefix "feat/${ISSUE_KEY_LOWER}-" '[.[] | select(.headRefName | startswith($prefix))]')
    local pr_count=$(echo "$matching_prs" | jq 'length')
    if [[ $pr_count -eq 0 ]]; then
        pass "No PR created"
    else
        fail "PR was created (count: $pr_count)"
        test_failed=1
    fi
    
    # Cleanup
    cleanup_test "feat/${ISSUE_KEY_LOWER}-*"
    log "Test 2 complete"
    
    return $test_failed
}

# Main execution
main() {
    log "Starting agent wrapper E2E tests"
    log "Test issue: ${ISSUE_KEY} (${ISSUE_ID})"
    log "Working directory: $(pwd)"
    echo ""
    
    # Ensure we're in repo root
    if [[ ! -f "scripts/agent-wrapper.sh" ]]; then
        log "ERROR: Must run from repository root (scripts/agent-wrapper.sh not found)"
        exit 1
    fi
    
    # Run tests
    test_happy_path || true
    echo ""
    test_error_path || true
    
    # Summary
    echo ""
    log "========================================="
    log "TEST SUMMARY"
    log "========================================="
    log "Passed: ${PASSED_CHECKS}/${TOTAL_CHECKS} checks"
    
    if [[ $PASSED_CHECKS -eq $TOTAL_CHECKS ]]; then
        echo -e "${GREEN}✓ All tests passed!${NC}"
        exit 0
    else
        local failed=$((TOTAL_CHECKS - PASSED_CHECKS))
        echo -e "${RED}✗ ${failed}/${TOTAL_CHECKS} checks failed${NC}"
        exit 1
    fi
}

main "$@"
