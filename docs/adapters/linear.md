# Linear Adapter Reference

Linear was the original tracker adapter for the orchestration system. It is not required for normal branch, commit, PR, or agent workflows. Use this file only when operating a configured Linear adapter.

## State Machine

When the Linear adapter is enabled, the original project states were:

```
Backlog → Shaping → Planned → In Progress → Review → Done
```

The original task states were:

```
Backlog → Todo → Plan → In Progress → In Review → Done
         ↑                                ↓
         └────────── (blocked/dependency) ─┘
```

## Rules

- Nothing moves to `In Progress` without a spec in `Plan` state.
- Sub-agents own state up to `In Review`.
- Pi owns transition to `Done` and parent task state.
