# gbharg-auto-review

Cloud-hosted auto-review orchestration and local merge gating for `pi`.

## What it does

- Watches non-draft PRs and dispatches review jobs when a PR becomes reviewable.
- Loads machine-readable plan context from the PR body before review starts.
- Runs Codex, Claude, and Gemini review commands in a cloud runner.
- Adds reviewer accounts to the PR.
- Skips duplicate reviewer requests and duplicate same-head reviews from existing automation.
- Checks CodexBar usage before every dispatch and stops a reviewer once it reaches the configured usage ceiling.
- Supports externally managed reviewer apps so the extension can gate and track reviews without launching duplicate review runs.
- Ignores `docs/`, `plan/`, and other non-code-only PRs so documentation updates do not trigger redundant agent reviews.
- Enforces a local merge gate requiring:
  - plan context present
  - at least 3 approvals
  - no active blocking reviews

## Package layout

- `src/index.ts` — Pi extension entrypoint
- `src/cli.ts` — `gbharg-auto-review` CLI
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

The CLI and extension look for `.pi/auto-review.json` in the current repo, or
`PI_AUTO_REVIEW_CONFIG` if set.

```json
{
  "repo": "owner/repo",
  "minimumApprovals": 3,
  "maxUsagePercent": 90,
  "pollIntervalMs": 30000,
  "requestReviewers": false,
  "deployCheckPatterns": ["deploy", "deployment", "vercel"],
  "ignorePathPrefixes": ["docs/", "plan/"],
  "nonCodeExtensions": [".md", ".mdx", ".txt", ".rst", ".adoc", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf"],
  "githubReviewers": ["codex-reviewer", "gemini-reviewer", "claude-reviewer"],
  "reviewerHandles": {
    "codex": ["codex-reviewer"],
    "claude": ["claude-reviewer"],
    "gemini": ["gemini-reviewer"]
  },
  "dispatchModes": {
    "codex": "external",
    "claude": "external",
    "gemini": "external"
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

If `dispatchModes.<model>` is set to `external`, the extension does not launch that model's command at all. It only requests/tracks the reviewer and enforces merge policy, which is the right mode when GitHub Apps or other cloud agents already self-trigger on PR events.

Set `requestReviewers` to `true` only if you want Pi to call GitHub's reviewer-assignment API. Leave it `false` when `githubReviewers` is only being used as an identity map for external reviewer apps.

PRs are ignored when every changed file is either:

- under one of the configured `ignorePathPrefixes`
- or matched by one of the configured `nonCodeExtensions`

That means a docs-only PR, plan-only PR, or a PR that only updates Markdown/images will skip review dispatch and will not be blocked by the local merge gate.

Deploy gating is also part of merge policy. Any status check whose name matches one of the configured `deployCheckPatterns` must exist and finish successfully before the local merge gate will allow the PR to merge.

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
gbharg-auto-review check --pr 42 --repo owner/repo

# Dispatch review jobs for a PR
gbharg-auto-review dispatch --pr 42 --repo owner/repo

# Watch for reviewable PRs and dispatch automatically
gbharg-auto-review watch --repo owner/repo
```
