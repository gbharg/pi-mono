# Spec: Compaction Extension

## File Changes

### 1. Split `~/.pi/agent/extensions/pi-memory/index.ts` into 4 files

**Delete:** `~/.pi/agent/extensions/pi-memory/index.ts` (current monolith, 140 lines)

**Create:** `~/.pi/agent/extensions/pi-memory/index.ts` (new, ~30 lines)
```typescript
// Entry point — registers event handlers from submodules
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerBootstrap } from "./bootstrap.js";
import { registerMonitor } from "./monitor.js";
import { registerCheckpoint } from "./checkpoint.js";
import { MEMORY_DIR, PROJECTS_DIR } from "./paths.js";

export default function (pi: ExtensionAPI) {
  registerBootstrap(pi);
  registerMonitor(pi);
  registerCheckpoint(pi);
}
```

**Create:** `~/.pi/agent/extensions/pi-memory/paths.ts` (~15 lines)
```typescript
import { join } from "node:path";
import { homedir } from "node:os";
import { readFileSync, existsSync } from "node:fs";

export const PI_DIR = join(homedir(), "pi-mono", ".pi");
export const MEMORY_DIR = join(PI_DIR, "memory");
export const PROJECTS_DIR = join(PI_DIR, "projects");

export function readFileOr(path: string, fallback: string): string {
  try { return readFileSync(path, "utf-8"); } catch { return fallback; }
}

export function getActiveProject(): string | null {
  const indexPath = join(PROJECTS_DIR, "index.md");
  const index = readFileOr(indexPath, "");
  const match = index.match(/\[([^\]]+)\]\(([^)]+)\)/);
  if (match) {
    const stateFile = join(PROJECTS_DIR, match[2]);
    if (existsSync(stateFile)) {
      return stateFile.replace(/\/state\.md$/, "").split("/").pop() || null;
    }
  }
  return null;
}
```

**Create:** `~/.pi/agent/extensions/pi-memory/bootstrap.ts` (~60 lines)
```typescript
// session_start handler: loads todo, project state, identity, rules
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { join } from "node:path";
import { MEMORY_DIR, PROJECTS_DIR, readFileOr, getActiveProject } from "./paths.js";

export function registerBootstrap(pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    const statusParts: string[] = [];

    // 1. Todo — count open tasks
    const todo = readFileOr(join(MEMORY_DIR, "todo.md"), "");
    const openTasks = todo.split("\n").filter((l) => l.match(/^- \[ \]/)).length;
    if (openTasks > 0) statusParts.push(`📋 ${openTasks} tasks`);

    // 2. Active project state + context
    const activeProject = getActiveProject();
    if (activeProject) {
      const context = readFileOr(join(PROJECTS_DIR, activeProject, "context.md"), "");
      const state = readFileOr(join(PROJECTS_DIR, activeProject, "state.md"), "");
      statusParts.push(`📁 ${activeProject}`);

      if (context) {
        pi.sendMessage({
          customType: "pi-memory",
          content: `[Memory: active project ${activeProject}]\n\n${context}`,
          display: false,
        }, { deliverAs: "nextTurn" });
      }
    }

    // 3. Identity — pi.md, gautam.md
    const piId = readFileOr(join(MEMORY_DIR, "pi.md"), "");
    const gautam = readFileOr(join(MEMORY_DIR, "gautam.md"), "");
    if (piId || gautam) {
      pi.sendMessage({
        customType: "pi-memory",
        content: `[Identity loaded]\n\n${piId}\n\n---\n\n${gautam}`,
        display: false,
      }, { deliverAs: "nextTurn" });
    }

    // 4. Rules
    const rules = readFileOr(join(MEMORY_DIR, "..", "RULES.md"), "");
    if (rules) {
      pi.sendMessage({
        customType: "pi-memory",
        content: `[Rules loaded]\n\n${rules}`,
        display: false,
      }, { deliverAs: "nextTurn" });
    }

    // 5. Status bar
    if (ctx.hasUI && statusParts.length > 0) {
      ctx.ui.setStatus("pi-memory", statusParts.join(" | "));
    }
  });
}
```

**Create:** `~/.pi/agent/extensions/pi-memory/monitor.ts` (~40 lines)
```typescript
// turn_end handler: tracks context usage, shows nudges
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getActiveProject } from "./paths.js";

export function registerMonitor(pi: ExtensionAPI) {
  pi.on("turn_end", async (_event, ctx) => {
    const usage = ctx.getContextUsage();
    if (!usage) return;

    const pct = Math.round((usage.tokens / usage.contextWindow) * 100);
    const project = getActiveProject() || "no project";

    if (pct >= 60) {
      if (ctx.hasUI) {
        ctx.ui.notify(
          `⚠️ Context at ${pct}% — top priority to compact. Update state.md and context.md first.`,
          "warning",
        );
        ctx.ui.setStatus("pi-memory", `🔴 ${pct}% | 📁 ${project}`);
      }
    } else if (pct >= 50) {
      if (ctx.hasUI) {
        ctx.ui.setStatus("pi-memory", `🟡 ${pct}% — natural seam? | 📁 ${project}`);
      }
    } else if (pct >= 30) {
      if (ctx.hasUI) {
        ctx.ui.setStatus("pi-memory", `📊 ${pct}% | 📁 ${project}`);
      }
    } else {
      if (ctx.hasUI) {
        ctx.ui.setStatus("pi-memory", `📊 ${pct}% | 📁 ${project}`);
      }
    }
  });
}
```

**Create:** `~/.pi/agent/extensions/pi-memory/checkpoint.ts` (~80 lines)
```typescript
// session_before_compact: checkpoint state + generate custom summary
// session_shutdown: EOD reminder + dirty check
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { join } from "node:path";
import { existsSync, appendFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { MEMORY_DIR, PROJECTS_DIR, PI_DIR, readFileOr, getActiveProject } from "./paths.js";

export function registerCheckpoint(pi: ExtensionAPI) {
  pi.on("session_before_compact", async (event, ctx) => {
    const activeProject = getActiveProject();
    const ts = new Date().toISOString();

    // 1. Checkpoint project state
    if (activeProject) {
      const projectDir = join(PROJECTS_DIR, activeProject);
      const stateFile = join(projectDir, "state.md");
      const contextFile = join(projectDir, "context.md");

      if (existsSync(stateFile)) {
        try {
          appendFileSync(stateFile, `\n<!-- Checkpoint: ${ts} -->\n`);
        } catch {}
      }
    }

    // 2. Git commit any uncommitted .pi/ changes
    try {
      const cwd = join(PI_DIR, "..");
      execSync("git add .pi/ && git diff --cached --quiet .pi/ || git commit -m 'checkpoint: pre-compaction'", {
        cwd,
        timeout: 10000,
        stdio: "pipe",
      });
    } catch {}

    // 3. Generate custom summary
    const todoSummary = readFileOr(join(MEMORY_DIR, "todo.md"), "");
    const openTasks = todoSummary.split("\n").filter((l) => l.match(/^- \[ \]/)).length;
    const projectState = activeProject
      ? readFileOr(join(PROJECTS_DIR, activeProject, "state.md"), "")
      : "";

    // Extract phase from frontmatter
    const phaseMatch = projectState.match(/^phase:\s*(.+)$/m);
    const phase = phaseMatch ? phaseMatch[1].trim() : "unknown";

    const summary = [
      `## Status`,
      activeProject ? `Active project: ${activeProject} (phase: ${phase}). ${openTasks} open tasks.` : `No active project. ${openTasks} open tasks.`,
      ``,
      `## What Happened`,
      `[Session narrative — Pi should fill this in before triggering /compact]`,
      ``,
      `## Files`,
      activeProject ? `- Project state: .pi/projects/${activeProject}/state.md` : "",
      activeProject ? `- Project context: .pi/projects/${activeProject}/context.md` : "",
      activeProject ? `- Decisions: .pi/projects/${activeProject}/decisions.md` : "",
      `- Todo: .pi/memory/todo.md`,
      `- Identity: .pi/memory/pi.md, .pi/memory/gautam.md`,
      `- Rules: .pi/RULES.md`,
    ].filter(Boolean).join("\n");

    if (ctx.hasUI) {
      ctx.ui.notify("State checkpointed. Compacting with custom summary.", "info");
    }

    return {
      compaction: {
        summary,
        firstKeptEntryId: event.preparation.firstKeptEntryId,
        tokensBefore: event.preparation.tokensBefore,
        details: {
          readFiles: event.preparation.fileOps?.readFiles || [],
          modifiedFiles: event.preparation.fileOps?.modifiedFiles || [],
          activeProject,
          phase,
          openTasks,
        },
      },
    };
  });

  // Session shutdown
  pi.on("session_shutdown", async (_event, ctx) => {
    // Check for uncommitted .pi/ changes
    let dirty = false;
    try {
      const cwd = join(PI_DIR, "..");
      const status = execSync("git status --porcelain .pi/", { cwd, encoding: "utf-8" });
      dirty = status.trim().length > 0;
    } catch {}

    if (ctx.hasUI) {
      if (dirty) {
        ctx.ui.notify("⚠️ Uncommitted .pi/ changes! Commit before closing.", "warning");
      }
      ctx.ui.notify("Remember EOD checklist (.pi/memory/eod-checklist.md)", "info");
    }
  });
}
```

### 2. Update `~/.pi/agent/extensions/pi-memory/package.json`

No changes needed — already has the right pi.extensions entry.

### 3. Create `~/pi-mono/.pi/settings.json`

**Create:** `~/pi-mono/.pi/settings.json`
```json
{
  "compaction": {
    "enabled": false
  }
}
```

This disables auto-compaction at the project level. Manual /compact only.

## Task Breakdown for Sub-Agents

| Task | Files | Agent |
|------|-------|-------|
| 1. Create paths.ts | paths.ts (new) | worker |
| 2. Create bootstrap.ts | bootstrap.ts (new) | worker |
| 3. Create monitor.ts | monitor.ts (new) | worker |
| 4. Create checkpoint.ts | checkpoint.ts (new) | worker |
| 5. Rewrite index.ts | index.ts (replace) | worker |
| 6. Create settings.json | .pi/settings.json (new) | worker |
| 7. Test | verify all hooks fire correctly | reviewer |

Tasks 1-6 can be done by a single worker since they're all in the same extension directory and tightly coupled. Task 7 is a separate review.
