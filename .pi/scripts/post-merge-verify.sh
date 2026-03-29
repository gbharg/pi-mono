#!/bin/bash
# Post-merge verification — run after every merge to main
# Ensures the merged code is actually running locally
# From post-mortem root cause #1: PR merged but never deployed

set -e

echo "Post-merge verification — $(date)"
echo ""

# 1. Run smoke test
echo "Step 1: Smoke test"
if ! .pi/scripts/smoke-test.sh; then
  echo "❌ Smoke test failed after merge. Consider reverting: git revert HEAD"
  exit 1
fi

# 2. Check all services are running with current code
echo ""
echo "Step 2: Service health"
SERVICES_OK=true
for svc in com.imessage-channel com.pi-agent.linear-webhook com.pi-agent.mcp-bridge; do
  if launchctl list "$svc" > /dev/null 2>&1; then
    echo "  ✓ $svc running"
  else
    echo "  ✗ $svc NOT running"
    SERVICES_OK=false
  fi
done

if [ "$SERVICES_OK" = false ]; then
  echo ""
  echo "⚠️ Some services not running. Restart with:"
  echo "  launchctl load ~/Library/LaunchAgents/com.*.plist"
fi

# 3. Validate .pi/ structure
echo ""
echo "Step 3: Structure validation"
if .pi/scripts/validate-structure.sh > /dev/null 2>&1; then
  echo "  ✓ .pi/ structure valid"
else
  echo "  ✗ .pi/ structure invalid"
  .pi/scripts/validate-structure.sh
fi

echo ""
echo "Post-merge verification complete."
