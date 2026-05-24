#!/usr/bin/env bash
set -euo pipefail
TMP=$(mktemp -d)
gh repo clone gbharg/exult-agent "$TMP" -- --depth 1
rm -rf tools/mcp-config
cp -R "$TMP/tools/mcp-config" tools/
rm -rf "$TMP"
echo "Synced. Review with: git diff tools/mcp-config/"
