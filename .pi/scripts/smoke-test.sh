#!/bin/bash
# E2E smoke test for all Pi services
# Run after every deploy and on daily cron

PASS=0
FAIL=0

check() {
  local name="$1"
  local cmd="$2"
  if eval "$cmd" > /dev/null 2>&1; then
    echo "  ✓ $name"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $name"
    FAIL=$((FAIL + 1))
  fi
}

echo "Pi Agent Smoke Test — $(date)"
echo ""

echo "Services:"
check "SendBlue webhook (port 3001)" "curl -sf http://localhost:3001/health"
check "Linear webhook (port 3002)" "curl -sf http://localhost:3002/health"
check "MCP bridge (port 3100)" "curl -sf http://localhost:3100/health"

echo ""
echo "External access:"
check "Tailscale Funnel → SendBlue" "curl -skf https://gautams-imac.tail053faf.ts.net:8443/sendblue/health"
check "Tailscale Funnel → Linear" "curl -skf https://gautams-imac.tail053faf.ts.net:8443/linear/health"

echo ""
echo "launchd services:"
check "com.imessage-channel" "launchctl list com.imessage-channel 2>/dev/null"
check "com.pi-agent.linear-webhook" "launchctl list com.pi-agent.linear-webhook 2>/dev/null"
check "com.pi-agent.mcp-bridge" "launchctl list com.pi-agent.mcp-bridge 2>/dev/null"
check "com.pi-agent.eod-check" "launchctl list com.pi-agent.eod-check 2>/dev/null"
check "com.pi-agent.task-reminder" "launchctl list com.pi-agent.task-reminder 2>/dev/null"

echo ""
echo "Files:"
check ".pi/AGENT.md exists" "test -f /Users/agent/pi-mono/.pi/AGENT.md"
check ".pi/RULES.md exists" "test -f /Users/agent/pi-mono/.pi/RULES.md"
check ".pi/README.md exists" "test -f /Users/agent/pi-mono/.pi/README.md"
check ".pi/memory/todo.md exists" "test -f /Users/agent/pi-mono/.pi/memory/todo.md"
check ".pi/memory/pi.md exists" "test -f /Users/agent/pi-mono/.pi/memory/pi.md"
check ".pi/.env exists (creds)" "test -f /Users/agent/pi-mono/.pi/.env"
check "Inbox dir exists" "test -d /Users/agent/.imessage-channel/inbox"

echo ""
echo "Validation:"
check ".pi/ structure valid" "cd /Users/agent/pi-mono && .pi/scripts/validate-structure.sh"

echo ""
echo "—————————————————"
echo "Results: $PASS passed, $FAIL failed"

if [ $FAIL -gt 0 ]; then
  echo "SMOKE TEST FAILED"
  exit 1
else
  echo "ALL CLEAR"
  exit 0
fi
