# Review: Compaction Extension

## Validation Checklist

### File Structure
- [ ] `~/.pi/agent/extensions/pi-memory/paths.ts` exists and exports PI_DIR, MEMORY_DIR, PROJECTS_DIR, readFileOr, getActiveProject
- [ ] `~/.pi/agent/extensions/pi-memory/bootstrap.ts` exists and exports registerBootstrap
- [ ] `~/.pi/agent/extensions/pi-memory/monitor.ts` exists and exports registerMonitor
- [ ] `~/.pi/agent/extensions/pi-memory/checkpoint.ts` exists and exports registerCheckpoint
- [ ] `~/.pi/agent/extensions/pi-memory/index.ts` imports and calls all three register functions
- [ ] `~/pi-mono/.pi/settings.json` exists with `compaction.enabled: false`
- [ ] Old monolith index.ts is fully replaced (no duplicate logic)

### TypeScript
- [ ] No import errors — all paths resolve (paths.js imports in sibling files)
- [ ] No circular dependencies
- [ ] Types match Pi's ExtensionAPI (session_start, turn_end, session_before_compact, session_shutdown events)
- [ ] session_before_compact return type matches CompactionEntry shape (summary, firstKeptEntryId, tokensBefore, details)

### Bootstrap (session_start)
- [ ] Reads todo.md and counts open tasks
- [ ] Reads active project from index.md → state.md + context.md
- [ ] Injects project context via pi.sendMessage with deliverAs: "nextTurn"
- [ ] Reads pi.md and gautam.md for identity
- [ ] Reads RULES.md
- [ ] Shows status bar with task count + project name
- [ ] Handles missing files gracefully (readFileOr fallback)

### Monitor (turn_end)
- [ ] Calls ctx.getContextUsage() and calculates percentage
- [ ] Shows percentage in status bar at all levels (≥30%)
- [ ] Nudges at 50%: "natural seam?" message in status
- [ ] Nudges at 60%: notify warning
- [ ] Includes project name in status
- [ ] Handles null usage gracefully (returns early)

### Checkpoint (session_before_compact)
- [ ] Timestamps state.md with HTML comment
- [ ] Runs git add .pi/ && git commit (with timeout, silent on nothing to commit)
- [ ] Generates custom summary with three sections: Status, What Happened, Files
- [ ] Returns compaction object with correct firstKeptEntryId and tokensBefore from event.preparation
- [ ] details includes readFiles, modifiedFiles, activeProject, phase, openTasks
- [ ] Handles no active project gracefully

### Shutdown (session_shutdown)
- [ ] Checks git status --porcelain .pi/ for uncommitted changes
- [ ] Warns if dirty
- [ ] Reminds about EOD checklist
- [ ] Handles errors in git check gracefully (try/catch)

### Settings
- [ ] Auto-compaction disabled (compaction.enabled: false)
- [ ] Manual /compact still works

## Test Plan

### Test 1: Cold start
1. Start a new Pi session
2. Verify: status bar shows task count + project name
3. Verify: context messages injected (project context, identity, rules)

### Test 2: Context monitoring
1. Have a conversation that grows context
2. Verify: percentage appears in status bar after each turn
3. At 50%+: verify nudge message appears

### Test 3: Manual compaction
1. Run /compact
2. Verify: state.md gets timestamp comment
3. Verify: git commit happens (or no-op if clean)
4. Verify: custom summary appears with Status/What Happened/Files sections
5. After compaction: verify session reloads with summary + kept messages

### Test 4: Session restart
1. Close and reopen Pi session
2. Verify: project context loads automatically
3. Verify: can answer "what were we working on?" from loaded context

### Test 5: Shutdown
1. Exit Pi session
2. With uncommitted .pi/ changes: verify warning appears
3. Verify: EOD checklist reminder appears

## Deployment

After all tests pass:
1. Git commit all extension files
2. Run /reload in active Pi session to pick up changes
3. Run smoke test: `~/pi-mono/.pi/scripts/smoke-test.sh`
4. Verify Pi still starts cleanly
