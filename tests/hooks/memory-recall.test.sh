#!/bin/bash
# memory-recall.test.sh — shell tests for .claude/hooks/memory-recall.sh
#
# Stubs `qmd` via PATH override and asserts:
#   1. Only `pi-mono-memory` present → output contains only local URIs.
#   2. Both collections present → output has both, with per-collection caps.
#   3. Neither collection present → hook exits 0, no <memory-recall> block.
#
# Usage: bash tests/hooks/memory-recall.test.sh
# Exit code 0 = all tests pass; non-zero = some test failed.

set -u

# Resolve repo root from this script's path so the test works from any CWD.
THIS_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_ROOT=$(cd "$THIS_DIR/../.." && pwd)
HOOK="$REPO_ROOT/.claude/hooks/memory-recall.sh"

if [ ! -f "$HOOK" ]; then
    echo "FAIL: hook not found at $HOOK" >&2
    exit 1
fi

FAILS=0
PASSES=0

# Each test creates a per-test sandbox dir containing a `qmd` stub script.
# That dir is prepended to PATH so the hook calls the stub instead of real qmd.
make_stub() {
    # $1 = sandbox dir, $2 = "local" | "shared" | "both" | "none"
    local dir=$1
    local mode=$2
    mkdir -p "$dir"
    cat >"$dir/qmd" <<STUB
#!/bin/bash
# Stubbed qmd — emits canned output based on subcommand + -c arg.
MODE='$mode'

# Parse the requested collection (last -c arg) for \`search\`.
COLLECTION=""
prev=""
for a in "\$@"; do
    if [ "\$prev" = "-c" ]; then
        COLLECTION=\$a
    fi
    prev=\$a
done

case "\$1" in
    collection)
        # \`qmd collection list\` — print one collection per line.
        case "\$MODE" in
            local)  printf 'pi-mono-memory\n' ;;
            shared) printf 'agent-memory-shared\n' ;;
            both)   printf 'pi-mono-memory\nagent-memory-shared\n' ;;
            none)   : ;;
        esac
        ;;
    search)
        # \`qmd search ... -c <col> -n <N> --files\` — emit hash,score,uri rows.
        case "\$COLLECTION" in
            pi-mono-memory)
                printf '#abc111,5.4,qmd://pi-mono-memory/learnings/foo.md\n'
                printf '#abc222,4.1,qmd://pi-mono-memory/daily/2026-05-25.md\n'
                printf '#abc333,3.7,qmd://pi-mono-memory/decisions/bar.md\n'
                ;;
            agent-memory-shared)
                printf '#sha111,9.9,qmd://agent-memory-shared/user-gautam.md\n'
                ;;
        esac
        ;;
esac
exit 0
STUB
    chmod +x "$dir/qmd"
}

run_hook() {
    # $1 = sandbox dir (PATH prefix), $2 = prompt text
    local dir=$1
    local prompt=$2
    PATH="$dir:$PATH" printf '{"prompt":"%s","session_id":"t"}' "$prompt" \
        | PATH="$dir:$PATH" bash "$HOOK"
}

assert() {
    # $1 = description, $2 = "0" pass / non-zero fail
    if [ "$2" = "0" ]; then
        PASSES=$((PASSES + 1))
        printf 'PASS: %s\n' "$1"
    else
        FAILS=$((FAILS + 1))
        printf 'FAIL: %s\n' "$1" >&2
    fi
}

SANDBOX_ROOT=$(mktemp -d)
trap 'rm -rf "$SANDBOX_ROOT"' EXIT

PROMPT='please recall my user identity and daily notes'

# --- Test 1: only pi-mono-memory exists ----------------------------------
T1_DIR="$SANDBOX_ROOT/t1"
make_stub "$T1_DIR" local
T1_OUT=$(run_hook "$T1_DIR" "$PROMPT")

echo "$T1_OUT" | grep -q '<memory-recall>'
assert "T1: local-only emits <memory-recall> block" "$?"

echo "$T1_OUT" | grep -q 'qmd://pi-mono-memory/'
assert "T1: local-only output contains pi-mono-memory URIs" "$?"

echo "$T1_OUT" | grep -q 'qmd://agent-memory-shared/'
if [ "$?" -eq 0 ]; then
    assert "T1: local-only output omits agent-memory-shared URIs" "1"
else
    assert "T1: local-only output omits agent-memory-shared URIs" "0"
fi

# --- Test 2: both collections exist --------------------------------------
T2_DIR="$SANDBOX_ROOT/t2"
make_stub "$T2_DIR" both
T2_OUT=$(run_hook "$T2_DIR" "$PROMPT")

echo "$T2_OUT" | grep -q '<memory-recall>'
assert "T2: both emits <memory-recall> block" "$?"

echo "$T2_OUT" | grep -q 'qmd://pi-mono-memory/'
assert "T2: both contains pi-mono-memory URIs" "$?"

echo "$T2_OUT" | grep -q 'qmd://agent-memory-shared/user-gautam.md'
assert "T2: both contains the agent-memory-shared URI" "$?"

# Per-collection cap: max 3 local + 1 shared (head -4 final cap).
T2_LOCAL_COUNT=$(echo "$T2_OUT" | grep -c 'qmd://pi-mono-memory/')
T2_SHARED_COUNT=$(echo "$T2_OUT" | grep -c 'qmd://agent-memory-shared/')
if [ "$T2_LOCAL_COUNT" -le 3 ] && [ "$T2_LOCAL_COUNT" -ge 1 ]; then
    assert "T2: local URIs within 1..3 cap (got $T2_LOCAL_COUNT)" "0"
else
    assert "T2: local URIs within 1..3 cap (got $T2_LOCAL_COUNT)" "1"
fi
if [ "$T2_SHARED_COUNT" -eq 1 ]; then
    assert "T2: shared URIs == 1 (got $T2_SHARED_COUNT)" "0"
else
    assert "T2: shared URIs == 1 (got $T2_SHARED_COUNT)" "1"
fi

# --- Test 3: neither collection exists -----------------------------------
T3_DIR="$SANDBOX_ROOT/t3"
make_stub "$T3_DIR" none
T3_OUT=$(run_hook "$T3_DIR" "$PROMPT")
T3_RC=$?

if [ "$T3_RC" -eq 0 ]; then
    assert "T3: neither — hook exits 0" "0"
else
    assert "T3: neither — hook exits 0 (got $T3_RC)" "1"
fi

if [ -z "$T3_OUT" ]; then
    assert "T3: neither — no output" "0"
else
    assert "T3: neither — no output (got: $T3_OUT)" "1"
fi

# --- Test 4: relevance ordering — local URIs precede shared URIs ---------
# When both collections return results, the printf'd order is local then
# shared; the awk-based dedup preserves that order (a `sort -u` would
# alphabetize and break BM25 relevance ranking).
T4_DIR="$SANDBOX_ROOT/t4"
make_stub "$T4_DIR" both
T4_OUT=$(run_hook "$T4_DIR" "$PROMPT")

# Extract just the qmd:// URIs in the order they appear in the output.
T4_ORDER=$(echo "$T4_OUT" | grep -oE 'qmd://[A-Za-z0-9_./-]+')
T4_FIRST_LOCAL_LINE=$(echo "$T4_ORDER" | grep -n 'qmd://pi-mono-memory/' | head -1 | cut -d: -f1)
T4_FIRST_SHARED_LINE=$(echo "$T4_ORDER" | grep -n 'qmd://agent-memory-shared/' | head -1 | cut -d: -f1)

if [ -n "$T4_FIRST_LOCAL_LINE" ] && [ -n "$T4_FIRST_SHARED_LINE" ] \
        && [ "$T4_FIRST_LOCAL_LINE" -lt "$T4_FIRST_SHARED_LINE" ]; then
    assert "T4: local URIs precede shared URIs (local@$T4_FIRST_LOCAL_LINE < shared@$T4_FIRST_SHARED_LINE)" "0"
else
    assert "T4: local URIs precede shared URIs (local@$T4_FIRST_LOCAL_LINE shared@$T4_FIRST_SHARED_LINE)" "1"
fi

# --- Summary -------------------------------------------------------------
echo
printf 'Results: %d passed, %d failed\n' "$PASSES" "$FAILS"
[ "$FAILS" -eq 0 ]
