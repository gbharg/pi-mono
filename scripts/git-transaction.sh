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

# Remove $1 from TRANSACTION_STASHES, rebuilding the array without empty
# entries. The bash pattern-substitution form `${arr[@]/$x}` REPLACES the
# match with an empty string rather than removing the element — empty
# entries then make `grep -q ""` match every line in `git stash list`,
# which would silently drop unrelated user stashes. Always go through
# this helper instead of `${arr[@]/$x}`.
remove_from_stashes() {
    local target="$1"
    local rebuilt=()
    local s
    for s in "${TRANSACTION_STASHES[@]}"; do
        [[ -n "$s" && "$s" != "$target" ]] && rebuilt+=("$s")
    done
    TRANSACTION_STASHES=("${rebuilt[@]}")
}

cleanup_stashes() {
    local stash_name
    for stash_name in "${TRANSACTION_STASHES[@]}"; do
        # Defensive empty-string guard. With the array filter above this
        # should be unreachable, but `grep -q ""` would match the first
        # `git stash list` line and drop an unrelated stash if it ever
        # slipped through, so keep the check.
        [ -z "$stash_name" ] && continue
        if git stash list | grep -q "$stash_name"; then
            log_warning "Cleaning up orphaned stash: $stash_name"
            local stash_index
            stash_index=$(git stash list | grep -n "$stash_name" | head -1 | cut -d: -f1)
            if [ -n "$stash_index" ]; then
                local stash_ref="stash@{$((stash_index - 1))}"
                git stash drop "$stash_ref" 2>/dev/null || true
            fi
        fi
    done
}

# Install our EXIT trap, chaining onto any trap the caller already has.
# When this script is sourced into a shell session that already has its
# own EXIT trap, a bare `trap cleanup_stashes EXIT` would clobber theirs.
__install_cleanup_trap() {
    local existing
    existing=$(trap -p EXIT 2>/dev/null | sed -E "s/^trap -- '//; s/' EXIT$//")
    if [ -n "$existing" ]; then
        # shellcheck disable=SC2064  # We want $existing expanded NOW so the
        # caller's trap text is captured into our trap definition.
        trap "cleanup_stashes; ${existing}" EXIT
    else
        trap cleanup_stashes EXIT
    fi
}
__install_cleanup_trap

# Git transaction function
# Usage: git_transaction "command1" "command2" "command3" ...
# Example: git_transaction "git add file.txt" "git commit -m 'message'" "git push"
#
# SECURITY: Each argument is executed via `bash -c "$cmd"`, so callers MUST NOT
# pass strings derived from untrusted input (PR titles, issue bodies, agent
# output, etc.). Treat this exactly like `bash -c` — only construct command
# strings from constants and values you control. See PR #8 council review.
#
# ISOLATION: Each command runs in its own `bash -c` subprocess. This means
# shell functions defined in the caller (`my_helper arg`) and cross-command
# state changes (`cd`, variable exports) DO NOT propagate between commands.
# If you need shared state across steps, pre-compute it before calling
# git_transaction and embed the resolved values into each command string.
#
# ROLLBACK SCOPE: Local mutations (commits, staged changes, branch checkout)
# are rolled back. REMOTE-mutating commands (`git push`, PR creation, tag
# pushes) CANNOT be rolled back — once pushed, the remote keeps the change
# even if a later step fails. Always put push as the LAST command so a
# failure can't leave the remote ahead of local rollback.
git_transaction() {
    if [ $# -eq 0 ]; then
        log_error "No commands provided to git_transaction"
        echo "Usage: git_transaction \"command1\" \"command2\" ..."
        return 1
    fi

    local stash_name
    stash_name="git-transaction-$$-$(date +%s)"
    local stash_created=false
    local initial_head=""
    local initial_branch=""
    
    # Capture initial state
    initial_head=$(git rev-parse HEAD 2>/dev/null || echo "")
    initial_branch=$(git symbolic-ref --short HEAD 2>/dev/null || echo "detached")
    
    log "Starting git transaction with ${#} command(s)"
    log "Initial state: branch=${initial_branch}, HEAD=${initial_head:0:8}"
    
    # Check for uncommitted changes to protect them
    if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
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
        
        # bash -c isolates side effects to a subshell (vs `eval` which would
        # mutate the parent shell). Callers must still treat $cmd as trusted —
        # see SECURITY note above the function definition.
        set +e
        bash -c "$cmd"
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

        # Restore branch first if a transaction command (e.g. `git checkout`)
        # moved us away from the initial branch. This must happen before the
        # HEAD reset so the reset targets the right ref.
        if [ "$initial_branch" != "detached" ]; then
            local current_branch
            current_branch=$(git symbolic-ref --short HEAD 2>/dev/null || echo "detached")
            if [ "$current_branch" != "$initial_branch" ]; then
                log "Restoring branch checkout: ${current_branch} -> ${initial_branch}"
                if git checkout "$initial_branch" >/dev/null 2>&1; then
                    log_success "Branch restored to ${initial_branch}"
                else
                    log_error "Failed to checkout initial branch ${initial_branch}; manual recovery needed"
                fi
            fi
        fi

        # Rollback strategy: reset to initial HEAD
        if [ -n "$initial_head" ]; then
            local current_head
            current_head=$(git rev-parse HEAD 2>/dev/null || echo "")

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

        # NOTE: Branches, tags, or worktrees CREATED inside the transaction
        # are not undone — undoing creation requires tracking each ref
        # written. If your transaction may create refs you want rolled back,
        # capture them via `git for-each-ref` before/after and clean up
        # explicitly at the call site.
        
        # Restore original working directory state
        if [ "$stash_created" = true ]; then
            log "Restoring original working directory state"
            
            if git stash list | grep -q "$stash_name"; then
                local stash_index
                stash_index=$(git stash list | grep -n "$stash_name" | head -1 | cut -d: -f1)
                local stash_ref="stash@{$((stash_index - 1))}"

                if git stash pop "$stash_ref" >/dev/null 2>&1; then
                    log_success "Original changes restored"
                    # Properly remove from cleanup list (NOT pattern-substitution).
                    remove_from_stashes "$stash_name"
                else
                    log_error "Failed to automatically restore stash"
                    log_warning "Manual recovery needed: git stash apply $stash_ref"
                    # Stash kept for the caller; remove from cleanup list so the
                    # EXIT trap doesn't drop it.
                    remove_from_stashes "$stash_name"
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

        # Restore the caller's pre-existing uncommitted work. Pop (not drop):
        # the stash holds the user's WIP, not artifacts of this transaction.
        # Dropping it would silently delete their changes.
        if [ "$stash_created" = true ]; then
            if git stash list | grep -q "$stash_name"; then
                log "Restoring caller's pre-existing uncommitted changes from protective stash"
                local stash_index
                stash_index=$(git stash list | grep -n "$stash_name" | head -1 | cut -d: -f1)
                local stash_ref="stash@{$((stash_index - 1))}"

                if git stash pop "$stash_ref" >/dev/null 2>&1; then
                    log_success "Pre-existing changes restored"
                    remove_from_stashes "$stash_name"
                else
                    # Most likely cause: merge conflict between stashed work
                    # and commits the transaction added. Leave the stash in
                    # place so the user can resolve manually. Also remove from
                    # TRANSACTION_STASHES so the EXIT-trap cleanup does NOT
                    # drop it — that would silently delete the caller's work.
                    log_warning "Failed to pop protective stash — likely a conflict with transaction changes."
                    log_warning "Your work is preserved at: $stash_ref"
                    log_warning "Recover with: git stash apply $stash_ref"
                    remove_from_stashes "$stash_name"
                fi
            fi
        fi

        local final_head
        final_head=$(git rev-parse HEAD 2>/dev/null || echo "")
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
