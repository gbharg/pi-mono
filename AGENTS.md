# Development Rules

## Conversational Style

- Keep answers short and concise
- No emojis in commits, issues, PR comments, or code
- No fluff or cheerful filler text (e.g., "Thanks @user" not "Thanks so much @user!")
- Technical prose only, be direct
- When the user asks a question, answer it first before making edits or running implementation commands.
- When responding to user feedback or an analysis, explicitly say whether you agree or disagree before saying what you changed.

## Code Quality

- Read files in full before wide-ranging changes, before editing files you have not fully inspected, and when asked to investigate or audit. Do not rely on search snippets for broad changes.
- No `any` unless absolutely necessary.
- Inline single-line helpers that have only one call site.
- Check node_modules for external API types; don't guess.
- **No inline imports** (`await import()`, `import("pkg").Type`, dynamic type imports). Top-level imports only.
- Never remove or downgrade code to fix type errors from outdated deps; upgrade the dep instead.
- Use only erasable TypeScript syntax (Node strip-only mode) in code checked by the root config (`packages/*/src`, `packages/*/test`, `packages/coding-agent/examples`): no parameter properties, `enum`, `namespace`/`module`, `import =`, `export =`, or other constructs needing JS emit. Use explicit fields with constructor assignments.
- Always ask before removing functionality or code that appears intentional.
- Do not preserve backward compatibility unless the user asks for it.
- Never hardcode key checks (e.g. `matchesKey(keyData, "ctrl+x")`). Add defaults to `DEFAULT_EDITOR_KEYBINDINGS` or `DEFAULT_APP_KEYBINDINGS` so they stay configurable.
- Never modify `packages/ai/src/models.generated.ts` directly; update `packages/ai/scripts/generate-models.ts` instead.

## Commands

- After code changes (not docs): `npm run check` (full output, no tail). Fix all errors, warnings, and infos before committing. Does not run tests.
- Never run `npm run build` or `npm test` unless requested by the user.
- Never run the full vitest suite directly: it includes e2e tests that activate when endpoint/auth env vars are present. For all non-e2e tests, run `./test.sh` from the repo root. Otherwise run specific tests from the package root: `node ../../node_modules/vitest/dist/cli.js --run test/specific.test.ts`.
- If you create or modify a test file, run it and iterate on test or implementation until it passes.
- For `packages/coding-agent/test/suite/`, use `test/suite/harness.ts` + the faux provider. No real provider APIs, keys, or paid tokens.
- Put issue-specific regressions under `packages/coding-agent/test/suite/regressions/` named `<issue-number>-<short-slug>.test.ts`.
- For ad-hoc scripts, `write` them to a temp file (e.g. `/tmp`), run, edit if needed, remove when done. Don't embed multi-line scripts in `bash` commands.
- Never commit unless the user asks.

## Dependency and Install Security

- Treat npm dep and lockfile changes as reviewed code. Direct external deps stay pinned to exact versions.
- Hydrate/update locally with `npm install --ignore-scripts`; clean/CI-style with `npm ci --ignore-scripts`. Don't run lifecycle scripts unless the user asks.
- If dep metadata changes, refresh `package-lock.json` with `npm install --package-lock-only --ignore-scripts`.
- If `packages/coding-agent/npm-shrinkwrap.json` needs regen, run `node scripts/generate-coding-agent-shrinkwrap.mjs` (verify with `--check` or `npm run check`). New deps with lifecycle scripts require review and an explicit allowlist entry in that script; never add one silently.
- Pre-commit blocks lockfile commits unless `PI_ALLOW_LOCKFILE_CHANGE=1`. Don't bypass unless the user wants the lockfile change committed.

## Git

Multiple pi sessions may be running in this cwd at the same time, each modifying different files. Git operations that touch unstaged, staged, or untracked files outside your own changes will stomp on other sessions' work. Follow these rules:

Committing:

- Only commit files YOU changed in THIS session.
- Stage explicit paths (`git add <path1> <path2>`); never `git add -A` / `git add .`.
- Before committing, run `git status` and verify you are only staging your files.
- `packages/ai/src/models.generated.ts` may always be included alongside your files.

Never run (destroys other agents' work or bypasses checks):

- `git reset --hard`, `git checkout .`, `git clean -fd`, `git stash`, `git add -A`, `git add .`, `git commit --no-verify`.

If rebase conflicts occur:

- Resolve conflicts only in files you modified.
- If a conflict is in a file you did not modify, abort and ask the user.
- Never force push.

## Issues and PRs

See `CONTRIBUTING.md` for the contributor gate (auto-close workflows, `lgtm`/`lgtmi`, quality bar).

When creating issues:

- Add `pkg:*` labels for affected packages (`pkg:agent`, `pkg:ai`, `pkg:coding-agent`, `pkg:tui`); use all that apply.

When posting issue/PR comments:

- Write the comment to a temp file and post with `gh issue/pr comment --body-file` (never multi-line markdown via `--body`).
- Keep comments concise, technical, in the user's tone.
- End every AI-posted comment with the AI-generated disclaimer line specified by the originating prompt (e.g. `This comment is AI-generated by `/wr``).

When closing issues via commit:

- Include `fixes #<number>` or `closes #<number>` in the message so merging auto-closes the issue. For multiple issues, repeat the keyword per issue (`closes #1, closes #2`); a shared keyword (`closes #1, #2`) only closes the first.

## Testing pi Interactive Mode with tmux

Run the TUI in a controlled terminal (from the repo root):

```bash
tmux new-session -d -s pi-test -x 80 -y 24
tmux send-keys -t pi-test "./pi-test.sh" Enter
sleep 3 && tmux capture-pane -t pi-test -p     # capture after startup
tmux send-keys -t pi-test "your prompt here" Enter
tmux send-keys -t pi-test Escape               # special keys (also C-o for ctrl+o, etc.)
tmux kill-session -t pi-test
```

## Changelog

Location: `packages/*/CHANGELOG.md` (one per package).

Sections under `## [Unreleased]`: `### Breaking Changes` (API changes requiring migration), `### Added`, `### Changed`, `### Fixed`, `### Removed`.

Rules:

- All new entries go under `## [Unreleased]`. Read the full section first and append to existing subsections; never duplicate them.
- Released version sections (e.g. `## [0.12.2]`) are immutable; never modify them.

Attribution:

- Internal (from issues): `Fixed foo bar ([#123](https://github.com/earendil-works/pi-mono/issues/123))`
- External contributions: `Added feature X ([#456](https://github.com/earendil-works/pi-mono/pull/456) by [@username](https://github.com/username))`

## Releasing

**Lockstep versioning**: all packages share one version; every release updates all together. `patch` = fixes + additions, `minor` = breaking changes. No major releases.

1. **Update CHANGELOGs**: ask the user whether they ran the `/cl` prompt on the latest commit on `main`. If not, they must run `/cl` first to audit and update each package's `[Unreleased]` section before releasing.

2. **Local smoke test**: build an unpublished release and smoke test from outside the repo (so it can't resolve workspace files):
   ```bash
   npm run release:local -- --out /tmp/pi-local-release --force
   cd /tmp
   /tmp/pi-local-release/node/pi --help
   /tmp/pi-local-release/node/pi --version
   /tmp/pi-local-release/node/pi
   /tmp/pi-local-release/bun/pi --help
   /tmp/pi-local-release/bun/pi --version
   ```
   Verify startup, model/account listing, and at least one real prompt with the intended default provider. Failures are release blockers unless the user explicitly accepts the risk.

3. **Brief the user on the WebAuthn flow before running anything**. Print exactly the following message and then stop and wait for the user to confirm in their next message:

   ```
   Before I run the release script, read this carefully:

   - `npm publish` uses WebAuthn 2FA.
   - A login URL will appear in the live bash output in this TUI. I will NOT see it until the command exits.
   - You must watch the bash output, cmd/ctrl-click the URL, log in in the browser, and select the "don't ask again for N minutes" option so publish can continue.
   - This may happen more than once during the release.

   Reply "ready" once you have read this and are watching the bash output. I will not run the release script until you do.
   ```

   Do not proceed to step 4 until the user explicitly confirms.

4. **Run the release script**:
   ```bash
   npm run release:patch    # fixes + additions
   npm run release:minor    # breaking changes
   ```
   Do not pass a `timeout` to the bash tool for this call. If publish fails partway, stop and report to the user what happened (which package failed, the error output) along with possible solutions. Never rerun the version bump on your own.

5. **After publish succeeds**:
   - Add fresh `## [Unreleased]` sections to package changelogs.
   - Commit with `Add [Unreleased] section for next cycle`.
   - Push `main` and the release tag.

## User Override

If the user's instructions conflict with any rule in this document, ask for explicit confirmation before overriding. Only then execute their instructions.

---

# Production Topology (pi-mono fleet)

This section describes how pi-mono is deployed as a fleet of always-on Claude
orchestrators across multiple hosts. Agents running inside one of these
sessions should identify themselves first (hostname + user + cwd) and then
read the matching subsection.

The contributor conventions above (Conversational Style, Code Quality, Git,
etc.) apply to ALL work in this repo regardless of which host you're on. The
topology below is operational reference — not a license to bypass the rules.

## 1. Hosts

Five production orchestrator sessions:

| # | Host         | User    | cwd                              | Channel       | Number / Endpoint            |
|---|--------------|---------|----------------------------------|---------------|------------------------------|
| 1 | MBP (Work)   | Work    | /Users/Work/pi-mono              | Sendblue      | +16452468277                 |
| 2 | iMac         | agent   | /Users/agent/pi-mono             | BlueBubbles   | iMessage via local BB server |
| 3 | iMac         | exult   | /Users/exult/exult-agent         | Sendblue      | +13053333940                 |
| 4 | iMac         | exult   | /Users/exult/exult-agent         | MS Teams      | Teams bot, separate process  |
| 5 | Hetzner VM   | claude  | /home/claude/repos/exult-agent   | Sendblue      | +16292925296                 |

Hosts 3 and 4 share the same cwd and user but run as two independent
processes in two independent tmux panes with independent pinned session ids.

Sessions 1, 3, and 5 each have their own Sendblue tenant (distinct +number,
api key, secret, webhook signing secret, webhook URL). Never mix credentials.

## 2. Repo Relationships

- `pi-mono` (this repo, https://github.com/gbharg/pi-mono) is canonical for
  hosts 1 and 2. Fork of earendil-works/pi-mono with custom orchestrator
  extensions in `packages/agent`, `packages/coding-agent`, `packages/tui`.
- `exult-agent` (separate repo) is canonical for hosts 3, 4, and 5. It carries
  the Teams + Sendblue channel adapters used by the exult-facing fleet.
- `openclaw` is the legacy codebase that previously hosted the Sendblue
  channel, memory scripts, and hook layer. It is still mounted on MBP and
  iMac filesystems and is referenced by hooks in `~/.claude/settings.json`
  via absolute paths. Memory/state hooks (recall, presence, git-guard,
  pre-compaction-extract, auto-done-trigger, compact-marker) continue to read
  and write inside `/Users/<user>/openclaw/...`. Do not delete openclaw.

The pi-mono orchestrators on hosts 1+2 still load `sendblue-channel` /
`bluebubbles-channel` MCP servers that live under `openclaw/tools/`. Each
session's `.mcp.json` is the source of truth for which channel is active.

## 3. Per-host Configuration

### Host 1 — MBP Work (Sendblue, +16452468277)

- Supervisor wrapper: `/Users/Work/.local/bin/sendblue-pi-forever.sh`
- Tmux respawn shim: `/Users/Work/.local/bin/sendblue-run-tmux.sh`
- launchd plist: `~/Library/LaunchAgents/com.openclaw.sendblue-channel.plist`
- `.mcp.json`: `/Users/Work/pi-mono/.mcp.json` (gitignored; Sendblue creds inline)
- `.env`: not at the pi-mono root. The channel server's own `.env` lives at
  `/Users/Work/openclaw/tools/sendblue-channel/.env`.
- Session pin: `/Users/Work/pi-mono/.sendblue-orchestrator-session-id`
- Lock: `/tmp/sendblue-channel.lock`
- Logs: `/tmp/sendblue-channel.log`, `/tmp/sendblue-channel.err`
- Tmux target: `mbp:1.1`

### Host 2 — iMac agent (BlueBubbles)

- Supervisor wrapper: `/Users/agent/.local/bin/bb-claude-forever.sh`
- Expect helper for login prompts: `/Users/agent/.local/bin/bb-claude-launch.expect`
- launchd plist: `~/Library/LaunchAgents/com.openclaw.bb-claude-forever.plist`
  (currently `.disabled-2026-05-20`; re-enable when ready)
- `.mcp.json`: not present at pi-mono root; BlueBubbles channel is loaded via
  `--dangerously-load-development-channels` from
  `/Users/agent/openclaw/tools/bluebubbles-channel/`.
- BlueBubbles macOS app: launchd-managed via
  `~/Library/LaunchAgents/com.bluebubbles.server.plist` (required)
- Tmux target: `agent:main.5`
- Lock: `/tmp/bb-claude-forever.lock`

### Host 3 — iMac exult Sendblue (+13053333940)

- cwd: `/Users/exult/exult-agent`
- Channel server: `/Users/exult/sendblue-channel/server.ts` (bun)
- `.mcp.json`: `/Users/exult/exult-agent/.mcp.json` (Sendblue creds inline,
  webhook port 18800)
- launchd plist: `/Users/exult/Library/LaunchAgents/` (exact filename
  inaccessible to non-exult users; `launchctl list | grep sendblue` while
  logged in as exult)
- Session pin + logs follow the exult-agent repo conventions; see that repo.

### Host 4 — iMac exult MS Teams

- cwd: `/Users/exult/exult-agent` (shared with host 3, distinct process)
- Channel server: under exult-agent's `tools/teams-channel/`
- launchd companion on MBP (cross-user wrapper):
  `/Users/Work/Library/LaunchAgents/com.exult.teams-channel.plist` calls
  `/Users/Work/Library/Application Support/exult-teams/launch.sh`. iMac
  exult runs the actual channel process.
- Creds env: `MSTEAMS_APP_ID`, `MSTEAMS_APP_PASSWORD`, `MSTEAMS_TENANT_ID`
- Webhook port: 3978
- Public URL: `https://claude-cloud.tail053faf.ts.net/teams/api/messages`
  (Tailscale Funnel)

### Host 5 — Hetzner cloud (Sendblue, +16292925296)

- SSH alias: `claude-cloud` → 46.224.71.218, user `claude`
- cwd: `/home/claude/repos/exult-agent`
- Supervisor wrapper: `/home/claude/.local/bin/exult-agent-forever.sh`
- Channel server: `/home/claude/repos/openclaw/tools/sendblue-channel/` (per
  `~/repos/exult-agent/.mcp.json`)
- systemd units (system, not user): `sendblue-channel.service` (+
  `sendblue-channel.service.d/` drop-in for env), `teams-channel.service`
- `.mcp.json`: `/home/claude/repos/exult-agent/.mcp.json`
- Webhook ports: Sendblue 18802, Teams 3978
- Public URL: `https://claude-cloud.tail053faf.ts.net/sendblue/webhook/...`
- Tmux target: `exult-agent:0.0`

## 4. Restart Procedures

Never `pkill claude` on a host you have not first observed. Each orchestrator
is a long-running conversation; killing it loses in-memory state that has not
yet flushed to disk.

Safe respawn:

1. SSH in as the correct user (Work / agent / exult / claude).
2. Identify the pane:
   `tmux list-panes -a -F '#S:#W.#P #{pane_title} #{pane_current_command}'`
3. Capture context: `tmux capture-pane -t <pane> -p -S -200`
4. With the user's approval:
   - macOS: `launchctl kickstart -k gui/$(id -u)/<label>` (e.g.
     `com.openclaw.sendblue-channel` for host 1). KeepAlive respawns the
     supervisor, which respawns claude into the pane.
   - Hetzner: `sudo systemctl restart sendblue-channel` (or `teams-channel`).
5. Watch `/tmp/sendblue-channel.log` (macOS) or
   `journalctl -u sendblue-channel -f` (Linux) for the dev-channels prompt.

Dev-channels confirmation + login flow:

The harness loads its channel via `--dangerously-load-development-channels`.
On first launch (and after binary upgrade), claude prompts for a `y`
confirmation in the pane. The supervisor scripts answer this via embedded
`expect` / `tmux send-keys` (see `bb-claude-launch.expect` on iMac and the
inline logic in `sendblue-pi-forever.sh`). If the prompt text changes (e.g.
binary upgrade), the auto-answer breaks — `tmux attach`, type `y` manually,
detach. If claude needs OAuth re-login, the supervisor cannot help; attach
and complete the flow by hand.

## 5. Repo Sync

A launchd / systemd job on each host pulls `origin/main` for pi-mono every 30
minutes. Orchestrator sessions never push to main; all changes go through a PR.

- MBP Work: `~/Library/LaunchAgents/com.gbharg.pi-mono-sync.plist`,
  `StartInterval=1800`, runs
  `cd /Users/Work/pi-mono && git fetch origin && git pull --ff-only origin main`,
  logs to `/tmp/pi-mono-sync.log`.
- iMac agent: identical plist at
  `/Users/agent/Library/LaunchAgents/com.gbharg.pi-mono-sync.plist`
  pointing at `/Users/agent/pi-mono`.
- iMac exult and Hetzner: no pi-mono sync (they track exult-agent instead;
  see that repo for its sync mechanism).

If `git pull --ff-only` fails (non-FF, conflict, dirty tree), the cron logs
the failure and exits non-zero. Resolution is manual — SSH in, resolve,
commit or stash, next sync catches up. There is no auto-resolution.

## 6. Communication Architecture

Each Sendblue-bearing host runs its own bun process listening on its own
webhook port. Sendblue's cloud delivers inbound iMessages to that webhook
URL; the bun process writes them into the channel server's in-memory queue;
the local claude orchestrator consumes them via the `sendblue-channel` MCP
server (over stdio). Outbound replies go the reverse path: claude calls the
MCP `reply` tool, the bun process posts to Sendblue's REST API.

Constraints:

- Each host's Sendblue account is a separate tenant with its own +number,
  api key id, secret, and webhook signing secret. Do not call the Sendblue
  REST API for one host using another host's creds.
- Only ONE claude session per host may bind the channel MCP at a time. The
  supervisor's `/tmp/sendblue-channel.lock` enforces this. A stray claude
  session in another pane that loads the same channel via
  `--dangerously-load-development-channels` will starve the orchestrator by
  stealing the webhook port. On MBP, the settings-restore hook actively
  strips `sendblue-channel` from `~/.claude/settings.json` to prevent
  accidental global registration.
- BlueBubbles (host 2) talks to the local BlueBubbles macOS app, not a
  cloud API. The webhook is local + BB-token-authenticated. iMessage
  availability depends on the iMac's signed-in Apple ID.
- Teams (host 4) uses the Bot Framework / MS Graph webhook over Tailscale
  Funnel — see the exult-agent repo for bot registration details.

## 7. Adding a New Host

Checklist for a sixth session:

1. Provision the host. Install: bun, node 22+, tmux, git, gh, the claude
   binary, and (macOS) tailscale.
2. Clone the canonical repo into the chosen cwd (`pi-mono` for self-contained
   hosts, `exult-agent` for the exult fleet).
3. If a new Sendblue +number is needed, register a Sendblue subaccount.
   Capture: api key id, secret, webhook signing secret, +number. Pick an
   unused local webhook port and a Tailscale Funnel subdomain.
4. Drop a `.mcp.json` at the cwd root referencing the channel server in
   `openclaw/tools/<channel>` (or the exult-agent equivalent). Creds inline,
   file gitignored.
5. Copy a `*-forever.sh` supervisor from a sibling host. Edit HOME, WORK_DIR,
   TARGET tmux pane, lock file path. Make it executable.
6. Install the supervisor: launchd plist (macOS) or systemd unit (Linux).
   `RunAtLoad=true`, `KeepAlive=true`, throttle 10–30s. Log to `/tmp/` or
   `~/Library/Logs/`.
7. Add the host to the pi-mono-sync schedule (or exult-agent-sync).
8. Add a row to the topology table above and open a PR.
9. Test: send an inbound message from the new +number to yourself; verify
   claude responds and the supervisor logs the round trip.

Do NOT skip step 3. Re-using another host's Sendblue creds causes both hosts
to receive the same inbound webhook — duplicate replies and account-level
rate-limit collisions.

## See Also

- `CONTRIBUTING.md` — contributor gate for the upstream pi-mono fork.
- `~/.claude/agents/orchestrator.md` (each host) — orchestrator system prompt.
- `~/.claude/settings.json` (each host) — hook registrations.
- `openclaw/tools/sendblue-channel/CLAUDE.md` — channel-specific runtime notes.

## gstack (REQUIRED — global install)

**Before doing ANY work, verify gstack is installed:**

```bash
test -d ~/.claude/skills/gstack/bin && echo "GSTACK_OK" || echo "GSTACK_MISSING"
```

If GSTACK_MISSING: STOP. Do not proceed. Tell the user:

> gstack is required for all AI-assisted work in this repo.
> Install it:
> ```bash
> git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
> cd ~/.claude/skills/gstack && ./setup --team
> ```
> Then restart your AI coding tool.

Do not skip skills, ignore gstack errors, or work around missing gstack.

Using gstack skills: After install, skills like /qa, /ship, /review, /investigate,
and /browse are available. Use /browse for all web browsing.
Use ~/.claude/skills/gstack/... for gstack file paths (the global path).
