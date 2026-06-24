# Linear Adapter Reference

Linear was the original tracker adapter for the orchestration system. It is not required for normal branch, commit, PR, or agent workflows. Use this file only when operating a configured Linear adapter.

## Credentials

Only configured Linear adapter runs need Linear credentials.

- `LINEAR_API_KEY`: Personal API key for direct Linear API access. Create it from Linear Settings > API > Personal API Keys.
- `LINEAR_APP_TOKEN`: OAuth app token for app-backed Linear integration. Create it from Linear Settings > Integrations > Create OAuth App > App Token.

## Adapter Configuration

These variables are also Linear-adapter-only:

- `LINEAR_TEAM_ID`: Team identifier whose workflow states back the adapter.
- `LINEAR_STATE_IN_REVIEW`: Linear state name or ID used when the wrapper moves completed agent work to review.

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
