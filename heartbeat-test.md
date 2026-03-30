# Agent Heartbeat System

## Overview

The agent heartbeat system tracks and monitors worker agent activity during task execution through automatic activity streaming to Linear.

## How It Works

1. **Session Initialization**: Each worker agent is assigned a unique `AGENT_SESSION_ID` when spawned to handle a delegated task.

2. **Automatic Streaming**: The agent wrapper automatically streams three types of activity to Linear:
   - Tool executions (bash commands, file reads, edits, etc.)
   - Agent thoughts and reasoning
   - Task completion status

3. **Heartbeat Monitoring**: The activity stream serves as an implicit heartbeat, allowing the orchestration system to:
   - Monitor agent liveness and progress
   - Track resource usage and tool invocations
   - Detect hung or stalled agents
   - Provide real-time visibility into agent work

4. **Zero Manual Overhead**: Agents don't need to manually post updates or ping the system—all activity is captured transparently through the wrapper layer.

## Environment

- `AGENT_SESSION_ID`: Unique identifier for the agent session
- `AGENT_ISSUE_ID`: Linear issue being worked on
- `AGENT_BRANCH`: Git branch for commits
- `LINEAR_APP_TOKEN`: Used by wrapper for activity posting

The heartbeat mechanism ensures that parallel agents can work autonomously while maintaining full observability for orchestration and debugging.
