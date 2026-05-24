#!/usr/bin/env bash
# Sync tools/mcp-config/ from gbharg/exult-agent main.
#
# Safety:
#   - Stage upstream into a sibling dir (tools/mcp-config.new), then swap
#     atomically. Never `rm -rf tools/mcp-config` before the copy succeeds.
#   - Exclude .env files from upstream so local-only secrets are not clobbered.
#   - tmpdir is removed on any exit path via trap.
set -euo pipefail

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

gh repo clone gbharg/exult-agent "$TMP/upstream" -- --depth 1

SRC="$TMP/upstream/tools/mcp-config"
if [ ! -d "$SRC" ]; then
  echo "error: upstream missing $SRC — has the directory moved?" >&2
  exit 1
fi

# Stage upstream copy alongside the live dir. rsync excludes any .env files
# (local secrets that must never be overwritten from upstream).
rm -rf tools/mcp-config.new
mkdir -p tools/mcp-config.new
rsync -a --exclude='.env' --exclude='*.env' "$SRC"/ tools/mcp-config.new/

# Preserve any local-only .env files from the live dir into the staged copy
# so the swap doesn't drop them on the floor.
if [ -d tools/mcp-config ]; then
  while IFS= read -r -d '' f; do
    rel="${f#tools/mcp-config/}"
    mkdir -p "tools/mcp-config.new/$(dirname "$rel")"
    cp -p "$f" "tools/mcp-config.new/$rel"
  done < <(find tools/mcp-config -type f \( -name '.env' -o -name '*.env' \) -print0)
fi

# Atomic swap: only after the staged dir is fully built.
rm -rf tools/mcp-config
mv tools/mcp-config.new tools/mcp-config

echo "Synced. Review with: git diff tools/mcp-config/"
