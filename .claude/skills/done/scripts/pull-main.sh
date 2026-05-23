#!/bin/bash
# pull-main.sh — Safely fast-forward local main to origin/main after /done
#
# Works regardless of which branch is currently checked out.
# Never switches branches or disrupts worktrees.
#
# Strategy:
#   - On main: git pull --ff-only (fast-forward only, no merge commits)
#   - On feature branch: git update-ref to advance local main pointer
#     without touching the working tree
#   - Skips if local main has diverged (needs manual resolution)
#   - Skips if another worktree has main checked out
#
# Usage: pull-main.sh [--repo <path>] [--remote <name>] [--quiet]
# Exit: always 0 (non-fatal — failures are logged, never block /done)

set -euo pipefail

REPO_DIR="${MEMORY_REPO:-$HOME/openclaw}"
REMOTE="origin"
BRANCH="main"
QUIET=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --repo)    REPO_DIR="$2"; shift 2 ;;
        --remote)  REMOTE="$2"; shift 2 ;;
        --quiet)   QUIET=1; shift ;;
        *)         shift ;;
    esac
done

say() { [[ "$QUIET" -eq 1 ]] || echo "$*"; }

# Verify repo exists
if [[ ! -d "$REPO_DIR/.git" ]]; then
    say "SKIP: $REPO_DIR is not a git repository"
    exit 0
fi

cd "$REPO_DIR"

# 1. Fetch latest main from remote
if ! git fetch "$REMOTE" "$BRANCH" 2>/dev/null; then
    say "WARN: fetch failed (network?), skipping pull-main"
    exit 0
fi

# 2. Determine current branch
current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

# 3. Resolve refs
local_main=$(git rev-parse "refs/heads/$BRANCH" 2>/dev/null || echo "")
remote_main=$(git rev-parse "$REMOTE/$BRANCH" 2>/dev/null || echo "")

if [[ -z "$remote_main" ]]; then
    say "WARN: $REMOTE/$BRANCH not found after fetch"
    exit 0
fi

if [[ "$local_main" == "$remote_main" ]]; then
    say "main already up to date"
    exit 0
fi

# 4. Branch-aware pull strategy
if [[ "$current_branch" == "$BRANCH" ]]; then
    # --- ON MAIN: pull directly ---
    # Use --ff-only to avoid creating merge commits. If main has diverged,
    # this fails safely and we skip rather than risk a messy merge.
    if git pull --ff-only "$REMOTE" "$BRANCH" 2>/dev/null; then
        new_head=$(git rev-parse --short HEAD 2>/dev/null)
        say "Pulled main (ff-only → $new_head)"
    else
        say "WARN: main has diverged from $REMOTE, skipping pull"
    fi
else
    # --- ON FEATURE BRANCH: advance local main ref without checkout ---

    # Safety: check if local main is an ancestor of remote main (fast-forwardable)
    if [[ -n "$local_main" ]] && ! git merge-base --is-ancestor "$local_main" "$remote_main" 2>/dev/null; then
        say "WARN: local main has diverged from $REMOTE/$BRANCH, skipping"
        exit 0
    fi

    # Safety: check no other worktree has main checked out
    # (update-ref would desync that worktree's HEAD)
    while IFS= read -r wt_line; do
        [[ -z "$wt_line" ]] && continue
        # Skip the primary worktree (that's us — we're on a feature branch)
        wt_path=$(echo "$wt_line" | awk '{print $1}')
        [[ "$wt_path" == "$REPO_DIR" ]] && continue

        wt_branch=$(echo "$wt_line" | sed -n 's/.*\[//;s/\].*//p')
        if [[ "$wt_branch" == "$BRANCH" ]]; then
            say "WARN: worktree at $wt_path has $BRANCH checked out, skipping update-ref"
            exit 0
        fi
    done < <(git worktree list 2>/dev/null)

    # Advance the local main ref (no working tree changes, no checkout)
    short_old="${local_main:0:7}"
    short_new="${remote_main:0:7}"
    if [[ -n "$local_main" ]]; then
        git update-ref "refs/heads/$BRANCH" "$remote_main" "$local_main" 2>/dev/null
    else
        git update-ref "refs/heads/$BRANCH" "$remote_main" 2>/dev/null
    fi
    say "Fast-forwarded main ($short_old → $short_new)"
fi

exit 0
