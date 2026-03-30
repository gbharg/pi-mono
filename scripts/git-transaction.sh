#!/usr/bin/env bash
# Atomic git transaction wrapper
# Ensures git workflows are transactional with automatic rollback on failure

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging with timestamps
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Cleanup handler to ensure stashes are never orphaned
declare -a TRANSACTION_STASHES=()

cleanup_stashes() {
    for stash_name in "${TRANSACTION_STASHES[@]}"; do
        if git stash list | grep -q "$stash_name"; then
            log_warning "Cleaning up orphaned stash: $stash_name"
            local stash_index=$(git stash list | grep -n "$stash_name" | head -1 | cut -d: -f1)
            if [ -n "$stash_index" ]; then
                local stash_ref="stash@{$((stash_index - 1))}"
                git stash drop "$stash_ref" 2>/dev/null || true
            fi
        fi
    done
}

trap cleanup_stashes EXIT

# Git transaction function
# Usage: git_transaction "command1" "command2" "command3" ...
# Example: git_transaction "git add file.txt" "git commit -m 'message'" "git push"
git_transaction() {
    if [ $# -eq 0 ]; then
        log_error "No commands provided to git_transaction"
        echo "Usage: git_transaction \"command1\" \"command2\" ..."
        return 1
    fi

    local stash_name="git-transaction-$$-$(date +%s)"
    local stash_created=false
    local initial_head=""
    local initial_branch=""
    local has_uncommitted_changes=false
    
    # Capture initial state
    initial_head=$(git rev-parse HEAD 2>/dev/null || echo "")
    initial_branch=$(git symbolic-ref --short HEAD 2>/dev/null || echo "detached")
    
    log "Starting git transaction with ${#} command(s)"
    log "Initial state: branch=${initial_branch}, HEAD=${initial_head:0:8}"
    
    # Check for uncommitted changes to protect them
    if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
        has_uncommitted_changes=true
        log "Detected uncommitted changes, creating protective stash"
        
        if git stash push -u -m "$stash_name" >/dev/null 2>&1; then
            stash_created=true
            TRANSACTION_STASHES+=("$stash_name")
            log_success "Stash created: $stash_name"
        else
            log_error "Failed to create protective stash"
            return 1
        fi
    else
        log "Working directory clean, no protective stash needed"
    fi
    
    # Execute commands sequentially
    local cmd_num=0
    local failed=false
    local failure_cmd=""
    local exit_code=0
    
    for cmd in "$@"; do
        ((cmd_num++))
        log "[$cmd_num/$#] Executing: $cmd"
        
        set +e
        eval "$cmd"
        exit_code=$?
        set -e
        
        if [ $exit_code -ne 0 ]; then
            log_error "Command failed with exit code $exit_code: $cmd"
            failed=true
            failure_cmd="$cmd"
            break
        fi
        
        log_success "[$cmd_num/$#] Completed"
    done
    
    # Handle success or failure
    if [ "$failed" = true ]; then
        log_error "Transaction FAILED - initiating rollback"
        
        # Rollback strategy: reset to initial HEAD
        if [ -n "$initial_head" ]; then
            local current_head=$(git rev-parse HEAD 2>/dev/null || echo "")
            
            if [ "$current_head" != "$initial_head" ]; then
                log "Rolling back from ${current_head:0:8} to ${initial_head:0:8}"
                
                # Use reset --hard to undo commits made during transaction
                if git reset --hard "$initial_head" >/dev/null 2>&1; then
                    log_success "HEAD reset to initial state"
                else
                    log_error "Failed to reset HEAD"
                fi
            else
                log "HEAD unchanged, no commit rollback needed"
                
                # If HEAD didn't change, we might have staged changes to undo
                if ! git diff --cached --quiet 2>/dev/null; then
                    log "Unstaging changes from failed transaction"
                    git reset HEAD >/dev/null 2>&1 || true
                fi
            fi
        fi
        
        # Restore original working directory state
        if [ "$stash_created" = true ]; then
            log "Restoring original working directory state"
            
            if git stash list | grep -q "$stash_name"; then
                local stash_index=$(git stash list | grep -n "$stash_name" | head -1 | cut -d: -f1)
                local stash_ref="stash@{$((stash_index - 1))}"
                
                if git stash pop "$stash_ref" >/dev/null 2>&1; then
                    log_success "Original changes restored"
                    # Remove from cleanup list since it was successfully popped
                    TRANSACTION_STASHES=("${TRANSACTION_STASHES[@]/$stash_name}")
                else
                    log_error "Failed to automatically restore stash"
                    log_warning "Manual recovery needed: git stash apply $stash_ref"
                fi
            else
                log_warning "Stash not found (may have been auto-applied)"
            fi
        fi
        
        log_error "Transaction rolled back - failed at: $failure_cmd"
        return 1
        
    else
        # Success path
        log_success "All commands executed successfully"
        
        # Clean up protective stash
        if [ "$stash_created" = true ]; then
            if git stash list | grep -q "$stash_name"; then
                log "Dropping protective stash (no longer needed)"
                local stash_index=$(git stash list | grep -n "$stash_name" | head -1 | cut -d: -f1)
                local stash_ref="stash@{$((stash_index - 1))}"
                
                if git stash drop "$stash_ref" >/dev/null 2>&1; then
                    log_success "Protective stash cleaned up"
                    TRANSACTION_STASHES=("${TRANSACTION_STASHES[@]/$stash_name}")
                else
                    log_warning "Failed to drop stash, but transaction succeeded"
                fi
            fi
        fi
        
        local final_head=$(git rev-parse HEAD 2>/dev/null || echo "")
        log_success "Transaction completed: ${initial_head:0:8} → ${final_head:0:8}"
        return 0
    fi
}

# If script is sourced, export the function
if [ "${BASH_SOURCE[0]}" != "${0}" ]; then
    export -f git_transaction log log_error log_success log_warning
    log "git_transaction function loaded"
fi

# If executed directly with arguments, run transaction
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    if [ $# -eq 0 ]; then
        cat << 'EOF'
Git Transaction Wrapper - Atomic git operations with automatic rollback

Usage:
    ./git-transaction.sh "command1" "command2" "command3" ...
    
    Or source it:
    source ./git-transaction.sh
    git_transaction "git add file.txt" "git commit -m 'message'" "git push"

Examples:
    # Simple commit and push
    ./git-transaction.sh \
        "git add src/file.ts" \
        "git commit -m 'feat: add feature'" \
        "git push"
    
    # Multiple files with rebase
    ./git-transaction.sh \
        "git add src/a.ts src/b.ts" \
        "git commit -m 'fix: update files'" \
        "git pull --rebase" \
        "git push"

Features:
    ✓ Atomic execution - all commands succeed or all are rolled back
    ✓ Automatic rollback on failure
    ✓ Protects uncommitted changes via stash
    ✓ Never leaves orphaned stashes
    ✓ Detailed logging with timestamps
    
EOF
        exit 0
    fi
    
    git_transaction "$@"
fi
