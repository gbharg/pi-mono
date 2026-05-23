#!/bin/bash
# Hook: plan-progress.sh
# Referenced by: plan/SKILL.md
# Trigger: called during plan lifecycle (init, update, clear)
# Purpose: Wrapper that delegates to the canonical plan-progress.sh
#   at ~/openclaw/config/claude/hooks/plan-progress.sh
# TODO(AI-158): Implement hook logic
exec /Users/Work/openclaw/config/claude/hooks/plan-progress.sh "$@"
