# pi-mono memory

Lightweight session memory for AI coding work in this repo. Modeled on
openclaw's pattern but trimmed for a small, mostly-single-agent codebase.

## Layout

```
memory/
├── README.md        — this file
├── MEMORY.md        — index. Loaded at session start.
├── context.md       — current focus, active branches, blocked items
├── learnings.md     — durable lessons and fix recipes
├── decisions/       — ADR-lite, one file per architectural decision
├── daily/           — daily logs (YYYY-MM-DD.md)
└── sessions/        — pre-compact session extracts (one file per session_id)
```

## Hooks (`.claude/hooks/`)

Wired in `.claude/settings.json` and shipped with the repo so any contributor's
Claude Code session picks them up automatically.

| Hook | Event | Purpose |
| --- | --- | --- |
| `memory-recall.sh` | `UserPromptSubmit` | Inject top-3 `qmd` matches from `pi-mono-memory` for the user prompt |
| `memory-bootstrap.sh` | `SessionStart` | Inject `context.md` + today's daily log on the first prompt of a session |
| `memory-pre-compact.sh` | `PreCompact` | Append a marker to today's daily; persist a session extract |

All hooks are best-effort and never block the session.

## qmd integration

First-time setup (one command, idempotent):

```bash
qmd collection add pi-mono-memory "$PWD/memory" 2>/dev/null || true
qmd context add "$PWD/memory" "pi-mono session memory — daily logs, decisions, learnings, session extracts"
qmd update pi-mono-memory
```

Refresh after writing new memory:

```bash
qmd update pi-mono-memory
```

Query manually:

```bash
qmd query 'lex:auth flow' --collection pi-mono-memory
```

## Conventions

- **Daily log entries**: prepend a timestamp + tag, append in chronological order.
- **Session extracts**: file name is `sessions/<session_id>.md`. Keep them under ~2KB; this is a working memory, not a transcript archive.
- **Decisions**: ADR-lite. Filename `decisions/NNNN-short-slug.md` where NNNN is monotonic. Include: context, decision, consequences.
- **Learnings**: short rules with a "Why:" line and a "How to apply:" line so future-you can judge edge cases.
- **No secrets**, ever. The whole tree is committed.

## Right-sized: what this is NOT

To keep maintenance cheap, this system intentionally omits:

- per-agent directories (`agents/<agent>/`) — flatten everything to root
- session snapshot archive — `/done` snapshots stay local
- Linear sync, learnings.sh CLI, statusline integration
- ontology / entities / agent-pool — over-engineered for one repo

If pi-mono grows into a multi-agent shop, port more pieces from
`~/openclaw/memory/` then.
