# Gotchas

Known failure points and how to handle them. Update this file when new edge cases are discovered.

## GOTCHA: Memory writes must complete before any merge or main-branch commit

**Symptom**: Session memory (daily log, context, decisions) missing from the sync payload after merge.
**Cause**: Step 6 (Sync to GitHub) ran before Step 4 (Save to Shared Memory) finished. The git-guard deploy captures whatever is on disk at commit time.
**Fix**: Always verify the Step 4 pre-merge checkpoint before any `gh pr merge` or `git-guard deploy`. The workflow enforces this ordering but agents sometimes skip ahead.

---

## GOTCHA: iMac sync exits 0 even on failure — check logs, not exit code

**Symptom**: `/done` reports success but iMac gateway is stale or broken (503 on /health).
**Cause**: `sync-imac-after-deploy.sh` is non-fatal by design (`exit 0` on every failure path). Build failures, SSH timeouts, and lockfile errors are all logged as warnings.
**Fix**: Read the script output for `WARN:` lines. After deploy, verify with `curl -sf http://100.92.200.34:18789/health`. The Control UI build (`node scripts/ui.js build`) is required since v3.8 or /health returns 503.

---

## GOTCHA: validate-feature.sh runs pnpm check in REPO_DIR, not CWD

**Symptom**: Typecheck passes locally but fails in validation, or vice versa.
**Cause**: The script `cd`s to `$REPO_DIR` (defaults to `~/openclaw`) regardless of where you invoke it. If your working directory has different node_modules or a different branch checked out, results diverge.
**Fix**: Ensure `~/openclaw` is on the correct branch and has `pnpm install` run before invoking validation. Pass `--branch` explicitly.

---

## GOTCHA: git add -A in worktrees stages deletions for files not present on disk

**Symptom**: Files vanish from main after a memory-sync commit (e.g., 42 CUA files deleted in one incident).
**Cause**: `git add -A` in a worktree stages deletions for every file in the git index that is absent from the worktree filesystem. Memory-sync worktrees only contain memory/ and skills/.
**Fix**: Always use scoped `git add memory/ skills/` instead of `git add -A` in worktrees. The `auto-update.sh` and `git-guard.sh` scripts were fixed for this.

---

## GOTCHA: save_log.sh silently fails if gh CLI is not authenticated

**Symptom**: Daily log entry has empty PR field or the script errors on `gh pr view`.
**Cause**: `gh pr view` returns non-zero when not on a PR branch or when `gh auth` has expired. The `|| echo ""` fallback hides the error.
**Fix**: Non-critical — the log entry still writes. If PR attribution matters, verify `gh auth status` before running `/done`.
