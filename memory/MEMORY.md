# MEMORY.md — pi-mono session index

This file is the entry point. New sessions should skim it then read `context.md`
+ today's `daily/YYYY-MM-DD.md`.

## Always load

| File | When |
| --- | --- |
| `memory/context.md` | every session |
| `memory/daily/$(date +%Y-%m-%d).md` | every session, if present |

## Load on demand

| File / dir | Trigger |
| --- | --- |
| `memory/learnings.md` | before fixing a class of bug you've hit before |
| `memory/decisions/` | when changing architecture or revisiting a decision |
| `memory/sessions/<id>.md` | when the auto-recall hook surfaces a relevant id |

## How to write

- Daily log: append `## HH:MM — <tag> | <one-line>` block under today's heading.
- Session extract: emitted automatically by `memory-pre-compact.sh`; edit by hand if you want to polish before commit.
- Decision: `decisions/NNNN-slug.md` with context/decision/consequences.
- Learning: append to `learnings.md` with `Why:` + `How to apply:` lines.

See `README.md` for the full system.
