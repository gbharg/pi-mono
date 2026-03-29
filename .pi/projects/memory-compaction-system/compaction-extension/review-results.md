# Extension Code Review: pi-memory

**Date:** 2026-03-29  
**Scope:** 5 TypeScript files in `~/.pi/agent/extensions/pi-memory/` + settings.json  
**Verdict:** ⚠️ 2 bugs found, 1 hardening issue — otherwise solid

---

## File-by-File Review

### 1. `paths.ts` — ✅ Exports verified, 🐛 Regex bug

**Exports:** `PI_DIR`, `MEMORY_DIR`, `PROJECTS_DIR`, `readFileOr`, `getActiveProject` — all present ✅

- `readFileOr` wraps `readFileSync` in try/catch with fallback ✅
- `getActiveProject` uses `readFileOr` + `existsSync` for safe access ✅
- No local imports (leaf module) ✅

**🐛 BUG — Double-escaped regex (line 16):**
```
Actual bytes:  /\\[([^\\]]+)\\]\\(([^)]+)\\)/
Matches:       \[text\]\(url\)   ← backslash-escaped markdown
Should match:  [text](url)       ← standard markdown
```
The regex has literal `\\` (0x5c 0x5c) in the source. In a JS regex literal, `\\` matches a literal backslash character. This means the pattern looks for `\[text\]\(url\)` instead of standard markdown `[text](url)`. `getActiveProject()` will **always return null** when `index.md` uses normal markdown links.

**Fix:**
```typescript
const match = index.match(/\[([^\]]+)\]\(([^)]+)\)/);
```

---

### 2. `bootstrap.ts` — ✅ Exports verified, 🐛 Regex bug

**Exports:** `registerBootstrap` ✅  
**Event:** `session_start` ✅  
**Imports:** `./paths.js` ✅

- All file reads use `readFileOr` — no unprotected I/O ✅
- `sendMessage` calls with `display: false` and `deliverAs: "nextTurn"` ✅
- UI status guarded by `ctx.hasUI` check ✅

**🐛 BUG — Double-escaped checkbox regex (line 10):**
```
Actual bytes:  /^- \\[ \\]/
Matches:       "- \[ \]"   ← backslash-escaped brackets
Should match:  "- [ ]"     ← standard markdown checkbox
```
`openTasks` will always be 0, so the task count status line is never shown.

**Fix:**
```typescript
const openTasks = todo.split("\n").filter((l) => l.match(/^- \[ \]/)).length;
```

---

### 3. `monitor.ts` — ✅ Clean

**Exports:** `registerMonitor` ✅  
**Event:** `turn_end` ✅  
**Imports:** `./paths.js` ✅

- Early-returns when `usage` is null or `ctx.hasUI` is false ✅
- Context threshold logic (50%/60%) is clear and correct ✅
- No file I/O — no error handling needed ✅
- `getActiveProject()` already handles its own errors internally ✅

No issues.

---

### 4. `checkpoint.ts` — ✅ Exports verified, ⚠️ Hardening issue, 🐛 Inherits regex bug

**Exports:** `registerCheckpoint` ✅  
**Events:** `session_before_compact`, `session_shutdown` ✅  
**Imports:** `./paths.js` ✅

**Return type from `session_before_compact`:**
```typescript
{
  compaction: {
    summary: string,                              // ✅
    firstKeptEntryId: event.preparation.firstKeptEntryId,  // ✅
    tokensBefore: event.preparation.tokensBefore,          // ✅
    details: {                                     // ✅
      readFiles: string[],
      modifiedFiles: string[],
      activeProject: string | null,
      phase: string,
      openTasks: number,
    }
  }
}
```
Return shape matches the expected type ✅

**File I/O safety:**
- `appendFileSync` guarded by `existsSync` + try/catch ✅
- `readFileOr` used for todo.md and state.md ✅
- Both `execSync` calls wrapped in try/catch ✅

**⚠️ ISSUE — Second `execSync` missing `timeout` and explicit `stdio: "pipe"` (line 61):**
```typescript
// Current:
const status = execSync("git status --porcelain .pi/", { cwd, encoding: "utf-8" });

// Recommended:
const status = execSync("git status --porcelain .pi/", { cwd, encoding: "utf-8", timeout: 10000, stdio: "pipe" });
```
The first `execSync` (line 19) correctly has `timeout: 10000` and `stdio: "pipe"`. The second one in `session_shutdown` is missing `timeout`, which means a hung git process could block shutdown indefinitely. While `stdio` defaults to `"pipe"` for `execSync`, being explicit is better for consistency.

**🐛 Inherits the checkbox regex bug (line 22):** Same `\\[ \\]` double-escape issue as bootstrap.ts. `openTasks` in the compaction summary will always be 0.

---

### 5. `index.ts` — ✅ Clean

**Imports:** `registerBootstrap`, `registerMonitor`, `registerCheckpoint` ✅  
**Import paths:** `./bootstrap.js`, `./monitor.js`, `./checkpoint.js` ✅  
**Calls all three** with `pi` argument ✅  
**Default export** function signature matches extension API ✅

No issues.

---

### 6. `settings.json` — ✅ Confirmed

```json
{ "compaction": { "enabled": false } }
```
`compaction.enabled` is `false` ✅

---

## Cross-Cutting Checks

| Check | Result |
|-------|--------|
| **No circular imports** | ✅ `paths.ts` has zero local imports (leaf). `bootstrap`, `monitor`, `checkpoint` each import only from `paths`. `index` imports from the other three. Acyclic. |
| **All .js import paths correct** | ✅ All 6 local imports use `.js` extensions: `./paths.js` ×3, `./bootstrap.js`, `./monitor.js`, `./checkpoint.js` |
| **Return type of `session_before_compact`** | ✅ Returns `{ compaction: { summary, firstKeptEntryId, tokensBefore, details } }` — matches spec |
| **All file reads use try/catch or readFileOr** | ✅ Every `readFileSync` is inside `readFileOr`. `appendFileSync` is in try/catch. `existsSync` is used before file access. |
| **`execSync` calls have timeout + stdio: pipe** | ⚠️ First call (line 19): `timeout: 10000, stdio: "pipe"` ✅. Second call (line 61): **missing both** |
| **No hardcoded secrets or credentials** | ✅ No API keys, tokens, passwords, or credentials anywhere |

---

## Summary of Issues

### 🐛 Bugs (2)

| # | Severity | File(s) | Description |
|---|----------|---------|-------------|
| 1 | **High** | `paths.ts:16` | Double-escaped regex `\\[` in markdown link matcher. `getActiveProject()` will always return `null` for standard markdown links. Cascading impact: bootstrap won't load project context, monitor shows "no project", checkpoint summary omits project info. |
| 2 | **High** | `bootstrap.ts:10`, `checkpoint.ts:22` | Double-escaped regex `\\[ \\]` in checkbox matcher. Open task count will always be 0. |

### ⚠️ Hardening (1)

| # | Severity | File | Description |
|---|----------|------|-------------|
| 3 | **Medium** | `checkpoint.ts:61` | `execSync("git status ...")` in `session_shutdown` missing `timeout` and explicit `stdio: "pipe"`. Could hang indefinitely. |

### Recommended Fixes

```diff
--- a/paths.ts
+++ b/paths.ts
@@ -13,7 +13,7 @@
 export function getActiveProject(): string | null {
   const indexPath = join(PROJECTS_DIR, "index.md");
   const index = readFileOr(indexPath, "");
-  const match = index.match(/\\[([^\\]]+)\\]\\(([^)]+)\\)/);
+  const match = index.match(/\[([^\]]+)\]\(([^)]+)\)/);

--- a/bootstrap.ts
+++ b/bootstrap.ts
@@ -7,7 +7,7 @@
     const todo = readFileOr(join(MEMORY_DIR, "todo.md"), "");
-    const openTasks = todo.split("\n").filter((l) => l.match(/^- \\[ \\]/)).length;
+    const openTasks = todo.split("\n").filter((l) => l.match(/^- \[ \]/)).length;

--- a/checkpoint.ts
+++ b/checkpoint.ts
@@ -19,7 +19,7 @@
     const todoSummary = readFileOr(join(MEMORY_DIR, "todo.md"), "");
-    const openTasks = todoSummary.split("\n").filter((l) => l.match(/^- \\[ \\]/)).length;
+    const openTasks = todoSummary.split("\n").filter((l) => l.match(/^- \[ \]/)).length;

@@ -58,7 +58,7 @@
-      const status = execSync("git status --porcelain .pi/", { cwd, encoding: "utf-8" });
+      const status = execSync("git status --porcelain .pi/", { cwd, encoding: "utf-8", timeout: 10000, stdio: "pipe" });
```
