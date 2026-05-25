#!/usr/bin/env bash
# Sync the .claude/skills/ subset listed in .claude/skills/MIRRORED.txt
# from gbharg/exult-agent at the SHA pinned in `.skills-upstream-sha`
# (override with SKILLS_UPSTREAM_SHA env var; default falls back to "main").
#
# Modeled after openclaw/scripts/sync-mcp-config.sh. Safety properties:
# - Clone, stage, and swap all happen on a tmp dir. The destructive removal
#   of each target skill dir only runs AFTER `cp -R` into a staging sibling
#   succeeds, so a partial failure leaves the working tree intact.
# - tmpdir is unconditionally cleaned up via trap on any exit path.
# - .env files are stripped defensively before staging; secrets must never
#   round-trip through this script even if upstream slips one in.
# - Skills NOT listed in MIRRORED.txt are left alone (this repo also has
#   first-party skills like amd-add-patient, plan, done — those are NOT
#   touched).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST="$REPO_ROOT/.claude/skills/MIRRORED.txt"
SHA_FILE="$REPO_ROOT/.skills-upstream-sha"
SKILLS_DIR="$REPO_ROOT/.claude/skills"
STAGE_DIR="$REPO_ROOT/tools/.skills-tmp"

if [ ! -f "$MANIFEST" ]; then
  echo "error: missing manifest at $MANIFEST" >&2
  exit 1
fi

# Resolve the upstream SHA. Env var wins so CI/dry-runs can target any ref.
SHA="${SKILLS_UPSTREAM_SHA:-}"
if [ -z "$SHA" ] && [ -f "$SHA_FILE" ]; then
  SHA="$(grep -v '^#' "$SHA_FILE" | tr -d '[:space:]' | head -c 40)"
fi
SHA="${SHA:-main}"

echo "Syncing skills from gbharg/exult-agent@${SHA}"

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# Shallow clone is fine for `main`; for a pinned SHA we need history, so
# fall back to a full clone + checkout.
if [ "$SHA" = "main" ]; then
  gh repo clone gbharg/exult-agent "$TMP/upstream" -- --depth 1
else
  gh repo clone gbharg/exult-agent "$TMP/upstream"
  (cd "$TMP/upstream" && git checkout --quiet "$SHA")
fi

UPSTREAM_SKILLS="$TMP/upstream/.claude/skills"
if [ ! -d "$UPSTREAM_SKILLS" ]; then
  echo "error: upstream tarball is missing .claude/skills (path moved?). Aborting; local tree unchanged." >&2
  exit 1
fi

# Strip any .env files defensively before staging.
find "$TMP/upstream" -type f -name '*.env' -print -delete || true

# Read the manifest: one skill slug per line, skip comments + blanks.
mapfile -t SKILLS < <(grep -vE '^\s*(#|$)' "$MANIFEST")
if [ "${#SKILLS[@]}" -eq 0 ]; then
  echo "error: manifest is empty — nothing to sync" >&2
  exit 1
fi

# Stage each skill in tools/.skills-tmp/<slug>. Upstream `autobrowse` is a
# symlink to .agents/skills/autobrowse; cp -RL resolves it so the stage tree
# contains the real files.
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR"

declare -a STAGED=()
declare -a MISSING=()
for slug in "${SKILLS[@]}"; do
  src="$UPSTREAM_SKILLS/$slug"
  if [ ! -e "$src" ]; then
    MISSING+=("$slug")
    continue
  fi
  cp -RL "$src" "$STAGE_DIR/$slug"
  STAGED+=("$slug")
done

if [ "${#MISSING[@]}" -gt 0 ]; then
  echo "error: the following skills are listed in MIRRORED.txt but missing upstream:" >&2
  printf '  - %s\n' "${MISSING[@]}" >&2
  echo "Either remove them from the manifest or fix the upstream path. Aborting; local tree unchanged." >&2
  exit 1
fi

# Atomic-ish swap per skill: rm old, mv new. Bash arrays don't bind across
# loops if the swap fails partway, so we accept the risk that a crash mid-loop
# leaves the tree in a partially-synced state — `git status` will show which
# skills landed and the operator can retry. Critically, we already proved
# every staged dir exists before this loop starts.
for slug in "${STAGED[@]}"; do
  rm -rf "$SKILLS_DIR/$slug"
  mv "$STAGE_DIR/$slug" "$SKILLS_DIR/$slug"
done

rm -rf "$STAGE_DIR"

echo
echo "Synced ${#STAGED[@]} skills from gbharg/exult-agent@${SHA}:"
printf '  - %s\n' "${STAGED[@]}"
echo
echo "Drift summary:"
if git -C "$REPO_ROOT" diff --stat -- .claude/skills/ > /tmp/skills-drift.txt 2>&1 && [ -s /tmp/skills-drift.txt ]; then
  cat /tmp/skills-drift.txt
else
  echo "  (no changes — local tree already matches upstream@${SHA})"
fi

echo
echo "Review with: git -C $REPO_ROOT diff .claude/skills/"
echo "If you bumped the pin, also update .skills-upstream-sha:"
echo "  echo '$SHA' > $SHA_FILE"
