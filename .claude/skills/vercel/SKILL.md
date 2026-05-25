---
name: vercel
description: "Use when editing the Exult website, deploying changes, managing DNS, running visual QA, or working with the exult repo."
allowed-tools:
  - Bash(git *)
  - Bash(gh *)
  - Bash(pnpm *)
  - Bash(npx *)
  - Bash(vercel *)
  - Bash(curl *)
  - Bash(open *)
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - mcp__playwright__*
---

# /vercel -- Exult Website Operations

## Repository

- **Repo**: gbharg/exult (private)
- **Path**: /Users/Work/Documents/GitHub/exult
- **Framework**: Next.js 16 (React 19, TypeScript 5, SASS, Bootstrap 5)
- **Hosting**: Vercel (project: `exult`, ID: `prj_nrOxaxxlB0BepwOYyNH3SQbwKTDK`)
- **Org**: team_RJLw4zLVT4iBU5h3Lgti1dSU
- **Node**: 24.x
- **Package manager**: pnpm

## Project Structure

```
src/
  app/              # Next.js App Router pages
    about-us/       # Team bios, mission, careers
    api/            # API routes (contact form, etc.)
    blog/           # Blog posts
    contact/        # Contact page
    locations/      # Office locations
    services/       # Service pages
    ...
  components/       # Shared React components
  data/             # Content data files
  lib/              # Utility functions
  types/            # TypeScript definitions
public/             # Static assets (images, fonts, etc.)
exult_assets/       # Media assets
```

## Editing Workflow

### 1. Create a branch
```bash
cd /Users/Work/Documents/GitHub/exult
git checkout main && git pull
git checkout -b feat/<descriptive-slug>
```

### 2. Make changes
Edit files in `/Users/Work/Documents/GitHub/exult/src/`. Content is in the `app/` directory (pages), `components/` (shared UI), and `data/` (structured content).

### 3. Local dev & verify
```bash
cd /Users/Work/Documents/GitHub/exult && pnpm dev
# Dev server runs on http://localhost:3000
```

### 4. Typecheck
```bash
cd /Users/Work/Documents/GitHub/exult && pnpm typecheck
```

### 5. Push & preview
```bash
cd /Users/Work/Documents/GitHub/exult
git add <files> && git commit -m "feat: description"
git push -u origin feat/<slug>
# Vercel auto-deploys a preview from non-main branches
```

### 6. Get preview URL
```bash
cd /Users/Work/Documents/GitHub/exult && vercel ls --limit 5
# Or check Vercel dashboard / gh pr checks
```

### 7. Screenshot preview for QA
Use Playwright MCP to navigate the preview URL and take screenshots:
```
mcp__playwright__browser_navigate → preview URL
mcp__playwright__browser_screenshot → capture
```

Or use the browse CLI:
```bash
browse open <preview-url>
browse screenshot /tmp/exult-preview.png
```

### 8. Create PR
```bash
cd /Users/Work/Documents/GitHub/exult
gh pr create --title "feat: description" --body "Summary of changes"
```

### 9. Deploy to production
After Gautam approves, merge to main:
```bash
cd /Users/Work/Documents/GitHub/exult
gh pr merge <number> --squash
```
Vercel auto-deploys main to production at exulthealthcare.com.

## Vercel CLI

```bash
cd /Users/Work/Documents/GitHub/exult

# Deployments
vercel ls                        # List recent deployments
vercel inspect <url>             # Deployment details
vercel logs <url>                # Build + runtime logs

# Environment variables
vercel env ls                    # List env vars
vercel env add <name>            # Add env var (interactive)
vercel env rm <name>             # Remove env var

# Domains
vercel domains ls                # List domains
vercel domains inspect <domain>  # DNS details

# Manual deploy (prefer git push)
vercel --prebuilt                # Deploy from .vercel/output
vercel --prod                    # Force production deploy
```

## GitHub CLI

```bash
cd /Users/Work/Documents/GitHub/exult

# PRs
gh pr list                       # Open PRs
gh pr create --title "..." --body "..."
gh pr view <number>              # PR details + checks
gh pr checks <number>            # CI/deploy status
gh pr merge <number> --squash

# Issues
gh issue list
gh issue create --title "..." --body "..."

# Releases
gh release list
```

## Screenshots & Visual QA

### Playwright MCP (preferred for quick screenshots)
Use `mcp__playwright__browser_navigate` and `mcp__playwright__browser_screenshot` tools directly. The Playwright MCP is already configured in .mcp.json.

### Browse CLI (for interactive testing)
```bash
browse open https://exulthealthcare.com    # Or preview URL
browse screenshot /tmp/exult-home.png
browse snapshot                             # Accessibility tree
browse click [X-Y]                         # Interact with elements
```

### Sharing screenshots
Screenshots saved to /tmp/ can be:
1. Read directly with the Read tool (Claude sees images)
2. Referenced in PR descriptions
3. Sent via Teams using `send_file` tool

## Production URLs

- **Main site**: https://exulthealthcare.com
- **Vercel preview**: https://exult-<hash>.vercel.app (auto-generated per branch)
- **Vercel dashboard**: Accessible via `vercel` CLI

## Key Config Files

| File | Purpose |
|------|---------|
| `next.config.ts` | Routing, redirects, image domains |
| `vercel.json` | Vercel settings (trailingSlash) |
| `package.json` | Dependencies, scripts |
| `tsconfig.json` | TypeScript config |
| `src/app/layout.tsx` | Root layout (head, fonts, analytics) |

## Gotchas

- **Always preview before production.** Never merge directly to main without verifying the preview deployment.
- **DNS changes need Gautam approval.** DNS misconfiguration can take the site offline.
- **Take screenshots after visual changes.** Use Playwright to capture and verify.
- **Check build logs on failure.** `vercel ls` then `vercel logs <url>`.
- **Environment variables.** Sensitive values (API keys, Resend, Google) are in Vercel project settings, not the repo.
- **pnpm only.** The repo uses pnpm workspaces. Don't use npm or yarn.
- **Redirects in next.config.ts.** Legacy dotCMS URLs redirect here. Don't break them.
- **Website writes need Gautam approval.** Same rule as other services — confirm before pushing to production.

## Subagent Guidelines

When spawned as a subagent for website tasks:
- Report progress via SendMessage at each step (branch, edit, preview, screenshots, merge).
- Always deploy to preview first and share the preview URL. Never push to production without confirmation.
- Take before/after screenshots for visual changes using Playwright.
- DNS changes need explicit Gautam approval.
- Run `pnpm typecheck` before pushing. Fix type errors.
