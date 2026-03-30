# gbharg-pr-review-cloud

Cloud-hosted pull request review orchestration and local merge gating for `pi`.

## What it does

- Watches non-draft PRs and dispatches review jobs when a PR becomes reviewable.
- Loads machine-readable plan context from the PR body before review starts.
- Runs Codex, Claude, and Gemini review commands in a cloud runner.
- Adds reviewer accounts to the PR.
- Skips duplicate reviewer requests and duplicate same-head reviews from existing automation.
- Checks CodexBar usage before every dispatch and stops a reviewer once it reaches the configured usage ceiling.
- Enforces a local merge gate requiring:
  - plan context present
  - at least 3 approvals
  - no active blocking reviews

## Package layout

- `src/index.ts` — Pi extension entrypoint
- `src/cli.ts` — `gbharg-pr-review-cloud` CLI
- `src/plan-context.ts` — PR body plan context parser/renderer
- `src/policy.ts` — approval and merge gate evaluation
- `src/github.ts` — `gh`-backed GitHub operations
- `src/runner.ts` — cloud runner command interpolation and execution

## Plan context format

Embed this in the PR body:

```html
<!-- pi-review:plan-context
{
  "version": 1,
  "source": { "kind": "file", "value": ".claude/plans/codex:feature.md" },
  "issue": "AI-123",
  "summary": "Short summary",
  "acceptanceCriteria": ["criterion 1", "criterion 2"],
  "functionalChecks": ["npm test --workspace foo"],
  "codeQualityChecks": ["npm run check"]
}
-->
```

## Config

The CLI and extension look for `.pi/gbharg-pr-review-cloud.json` in the current repo, or
`PI_PR_REVIEW_CLOUD_CONFIG` if set.

```json
{
  "repo": "owner/repo",
  "minimumApprovals": 3,
  "maxUsagePercent": 90,
  "pollIntervalMs": 30000,
  "githubReviewers": ["codex-reviewer", "gemini-reviewer", "claude-reviewer"],
  "reviewerHandles": {
    "codex": ["codex-reviewer"],
    "claude": ["claude-reviewer"],
    "gemini": ["gemini-reviewer"]
  },
  "commands": {
    "codex": {
      "command": "ssh",
      "args": ["review-box", "codex", "exec", "--pr", "{pr}", "--repo", "{repo}", "--plan-context", "{planContextFile}"]
    },
    "claude": {
      "command": "ssh",
      "args": ["review-box", "claude", "--pr", "{pr}", "--repo", "{repo}", "--plan-context", "{planContextFile}"]
    },
    "gemini": {
      "command": "ssh",
      "args": ["review-box", "gemini", "--pr", "{pr}", "--repo", "{repo}", "--plan-context", "{planContextFile}"]
    }
  }
}
```

Quota checks default to:

```bash
codexbar usage --provider <codex|claude|gemini> --source cli --format json
```

The dispatcher runs that check every time a review is triggered. If CodexBar reports a usage window at or above `maxUsagePercent`, or if the reviewer already has a review or review request on the current PR head, that reviewer is skipped for the current dispatch.

Supported placeholders:

- `{repo}`
- `{pr}`
- `{url}`
- `{title}`
- `{headRef}`
- `{headSha}`
- `{planContextFile}`

## Usage

```bash
# Check whether a PR may be merged
gbharg-pr-review-cloud check --pr 42 --repo owner/repo

# Dispatch review jobs for a PR
gbharg-pr-review-cloud dispatch --pr 42 --repo owner/repo

# Watch for reviewable PRs and dispatch automatically
gbharg-pr-review-cloud watch --repo owner/repo
```
