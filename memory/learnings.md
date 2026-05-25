# learnings — pi-mono

Durable lessons. Each entry: **Rule**, **Why:**, **How to apply:**.

---

## Worktree-isolate when other pi sessions are active

**Rule:** for any branch work in `~/pi-mono`, use `git worktree add <path> -b <branch> origin/main` instead of `git checkout -b`.

**Why:** `AGENTS.md` warns that multiple pi sessions may share this cwd and that
destructive git ops (`reset --hard`, `stash`, `add -A`) stomp on other agents'
work. A worktree gives you a clean cwd off `main` while leaving the other
session's uncommitted files untouched.

**How to apply:** when starting a new branch in pi-mono, default to a worktree
under `/tmp/pi-mono-<slug>-wt`. Remove with `git worktree remove` when the PR
merges.
