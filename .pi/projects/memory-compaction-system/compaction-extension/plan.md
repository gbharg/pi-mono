# Spec: Compaction Extension

## Problem

Pi's current compaction is automatic and dumb — it triggers at a token threshold and generates a generic summary. Our orchestrator role needs:
- Control over when compaction happens (nudges, not triggers)
- Automatic checkpoint of project state before any context loss
- Summaries optimized for "what would I tell Gautam if he asked next week?"
- Memory files updated as part of the compaction flow, not afterthought

The existing pi-memory extension has stubs for this but doesn't do the full flow.

## Requirements

### R1: Context monitoring with nudges
- Track context usage on every turn_end
- At 30%: show percentage in status bar
- At 50%: notify "good time to compact if at a natural seam"
- At 60%: notify "top priority to compact — update state files first"
- Never auto-trigger compaction. I decide when.

### R2: Pre-compaction checkpoint (session_before_compact)
- When compaction is triggered (by me via /compact), automatically:
  1. Read active project from projects/index.md
  2. Update state.md with current phase, progress, blockers
  3. Append timestamp to context.md noting compaction
  4. Commit any uncommitted .pi/ changes with message "checkpoint: pre-compaction"
- If no active project, still save todo.md state

### R3: Custom compaction summary
- Override Pi's default summary using session_before_compact return value
- Summary format (three layers):
  1. **Status**: One line — where we are in the active project
  2. **Narrative**: 3-5 sentences — what happened since last compaction, optimized for "what would I tell Gautam next week?"
  3. **Pointers**: File paths to state.md, context.md, decisions.md, todo.md
- Include read_files and modified_files from the compaction preparation

### R4: Post-compaction bootstrap (session_start)
- On every session start:
  1. Read todo.md — check for overdue tasks, show count in status
  2. Read active project state.md + context.md — inject as message
  3. Read pi.md + gautam.md — maintain identity
  4. Read RULES.md — maintain discipline
  5. Show status: "📱 iMessage active | 📁 [project] | 📋 X tasks | 📊 context Y%"

### R5: Session shutdown save
- On session_shutdown:
  1. Remind about EOD checklist
  2. If there are uncommitted .pi/ changes, warn

## Non-requirements
- No auto-compaction trigger (disabled in settings)
- No RAG or embedding-based retrieval
- No cross-session memory beyond files on disk
- No Linear sync during compaction (that's a separate concern)

## Technical Design

### Extension structure
```
~/.pi/agent/extensions/pi-memory/
├── index.ts          # Extension entry point, event handlers
├── checkpoint.ts     # Pre-compaction state save logic
├── bootstrap.ts      # Session start context loading
├── monitor.ts        # Context usage tracking + nudges
└── package.json
```

### Settings (in .pi/settings.json)
```json
{
  "compaction": {
    "enabled": false
  }
}
```
Auto-compaction disabled. Manual /compact only.

### Event flow
```
session_start
  → bootstrap.ts: load todo, project state, identity, rules
  → inject context as sendMessage with triggerTurn: false

turn_end
  → monitor.ts: check ctx.getContextUsage(), show nudges

/compact (user-triggered)
  → session_before_compact
    → checkpoint.ts: update state.md, context.md, git commit
    → return custom summary (status + narrative + pointers)
  → Pi compacts with our summary
  → session reloads with summary + kept messages

session_shutdown
  → remind EOD checklist
  → warn about uncommitted changes
```

## Tasks

1. **Refactor pi-memory extension into multi-file structure** — split index.ts into checkpoint.ts, bootstrap.ts, monitor.ts
2. **Implement context monitoring** (R1) — turn_end hook with threshold nudges
3. **Implement pre-compaction checkpoint** (R2) — session_before_compact with file updates + git commit
4. **Implement custom summary generation** (R3) — return compaction object from session_before_compact
5. **Implement bootstrap loading** (R4) — session_start reads and injects project context
6. **Implement shutdown save** (R5) — session_shutdown with EOD reminder + dirty check
7. **Disable auto-compaction** — set compaction.enabled: false in settings
8. **Test end-to-end** — verify: start → work → /compact → summary quality → restart → context recovered

## Acceptance Criteria

- [ ] Context percentage shows in status bar after every turn
- [ ] Nudge appears at 50% and 60%
- [ ] /compact updates state.md and context.md before summarizing
- [ ] Compaction summary has status, narrative, and file pointers
- [ ] New session loads project context without manual intervention
- [ ] Session shutdown warns about uncommitted .pi/ changes
- [ ] Auto-compaction is disabled — only manual /compact works
