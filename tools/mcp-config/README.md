> VENDORED from gbharg/exult-agent — source of truth lives there. Use scripts/sync-mcp-config.sh to refresh. Drift CI warns; merge after intentional override.

# mcp-config

Unified renderer for per-host `.mcp.json` files. **Phase 1** lands the system
with byte-identical parity to today's hand-rolled configs and **does not** wire
any supervisor — zero behavior change.

## What this is

A TypeScript renderer (`render.ts`) that takes:

- A channel registry (`channels/{sendblue,teams,bluebubbles}.ts`) — declares
  the messaging channels we model, their env requirements (secret vs config),
  and launch style.
- A host descriptor (`hosts/<host>.ts`) — declares which channels run on that
  host, what bun binary to use, what the tool dirs are, and any host-specific
  env overrides (webhook URL, port, etc.).
- A per-host secrets file (`hosts/<host>.env`, gitignored).

…and produces a canonical `.mcp.json` (alphabetical keys, 2-space indent,
trailing newline). The golden files under `golden/<host>.mcp.json` are the
captured-from-prod outputs we render against in `render.test.ts`.

## Why it's not wired into supervisors yet

The supervisors (`sendblue-pi-forever.sh`, `run-channel-tmux.sh`, etc.) still
read each host's existing `.mcp.json`. Phase 1 only proves that the renderer
can reproduce what's there. **Phase 2** will:

1. Add a pre-supervisor render step that writes `.mcp.json` on each host.
2. Switch each supervisor to read from a generated path.
3. Move secrets out of host descriptors and into the per-host `.env`.

Phase 2 is its own PR so the parity layer can sit in production a while first.

## Usage

```bash
# Render to stdout
bun tools/mcp-config/render.ts --host claude-cloud --check

# Write to a file
bun tools/mcp-config/render.ts --host claude-cloud --out .mcp.json

# Skip a channel whose required env is missing
bun tools/mcp-config/render.ts --host mbp-work --allow-missing teams
```

Flags:

| Flag | Description |
|------|-------------|
| `--host <name>` | Required. Host descriptor id under `hosts/`. |
| `--out <path>` | Write to file. Default is stdout. |
| `--check` | Print to stdout only (no file write). |
| `--allow-missing <channel>` | Skip the channel with a warning. Repeatable. |
| `--env-file <path>` | Explicit path to the per-host .env. |

## Adding a host

1. Capture the host's current `.mcp.json` somewhere you can read it.
2. `cp hosts/claude-cloud.ts hosts/<newhost>.ts` and edit `hostname`, `user`,
   `repoRoot`, `binaries.bun`, `tailscaleHost`, `channels`, and `extraServers`.
3. `cp hosts/claude-cloud.env.example hosts/<newhost>.env.example` and list the
   secret env vars the host needs.
4. Canonicalize the captured `.mcp.json` and save it as
   `golden/<newhost>.mcp.json`. Add the host to `HOST_CASES` in
   `render.test.ts`.
5. `bun test tools/mcp-config/render.test.ts` until the snapshot matches.

## Adding a channel

1. Create `channels/<channel>.ts` exporting a `ChannelDef`.
2. Register it in `channels/index.ts`.
3. Reference it by id in any host that runs it: `{ channel: "<channel>" }`.

If a host has env or path quirks for that channel, use the `HostChannelRef`
overrides: `env`, `launchStyle`, `toolDirAbs`, `bunOverride`.

## Launch styles

Three are supported in phase 1 because each host varies today:

- `bash-cd-exec`: `bash -c "cd <toolDir> && exec <bun> run <entry>"`. Used by
  claude-cloud, mbp-work, gautams-imac-agent for sendblue.
- `bun-run-abs`: `<bun> run <abs entry>` with `cwd` set. Used by
  gautams-imac-exult for sendblue + teams.
- `bun-run-args`: `<bun> run --cwd <dir> --shell=bun --silent start`. Used by
  gautams-imac-agent for `bb-imessage`.

Phase 2 may collapse to one canonical form once the parity transition is done.

## File layout

```
tools/mcp-config/
  README.md
  canonical.ts             stable JSON serializer
  render.ts                CLI + library entry
  render.test.ts           snapshot tests vs golden/
  types.ts                 shared types
  channels/
    index.ts               registry
    sendblue.ts
    teams.ts
    bluebubbles.ts
  hosts/
    claude-cloud.ts
    claude-cloud.env.example
    gautams-imac-exult.ts
    gautams-imac-agent.ts
    mbp-work.ts
  golden/
    claude-cloud.mcp.json
    gautams-imac-exult.mcp.json
    gautams-imac-agent.mcp.json
    mbp-work.mcp.json
```

`.rendered-by` is written when the CLI writes a file (with `--out`); ignored.

## extraServers (passthrough)

Hosts can declare `extraServers: { ... }` for MCP server entries that aren't
modeled by this system yet (advancedmd, ringcentral, gmail, fetch, lume,
docstrange, playwright, …). These are emitted exactly as written so the
phase 1 render stays byte-identical. Phase 2+ will promote them into proper
`ChannelDef`s with explicit env schemas.
