# Autoresearch Changelog — careful

## Experiment 0 — baseline

**Score:** 3/5 (60.0%)
**Change:** None — original skill
**Failing evals:**
- Allows safe exceptions: 0/12 — sed regex fails to strip `rm -rf ` prefix, so safe targets like `node_modules` never match the case statement
- No false positives on edge cases: 7/11 — quoted strings (`echo 'rm -rf /'`, `grep 'DROP TABLE'`) and piped commands trigger false blocks because patterns match the full command string without context awareness

## Experiment 1 — DISCARDED

**Score:** 2/5 (40.0%) — REGRESSION from 60.0%
**Change:** Replace sed line 31 with `sed -E 's/^.*rm[[:space:]]+//;s/-[a-zA-Z]+[[:space:]]+//g;s/--recursive[[:space:]]+//'`
**Result:** Fixed safe exceptions (0/12 -> 12/12) but broke dangerous command blocking. The `g` flag on `-[a-zA-Z]+[[:space:]]+` partially matches inside `--recursive`, stripping `-recursive ` and leaving a `-` prefix that the case statement treats as a flag. `rm --recursive /tmp/mydata` incorrectly allowed.
**Action:** Reverted to baseline.

## Experiment 2 — KEPT

**Score:** 3/5 (60.0%)
**Change:** Fix sed substitution order — strip `--[a-zA-Z][-a-zA-Z]*` (long flags) BEFORE `-[a-zA-Z]+` (short flags). This prevents the short-flag pattern from partially matching inside long flags like `--recursive`.
**Result:** Same aggregate score as baseline, but fixes EVAL 3 (safe exceptions: 0/12 -> 12/12). EVAL 5 still failing (6/11) due to quoted-string false positives.

## Experiment 3 — KEPT

**Score:** 4/5 (80.0%)
**Change:** Enhanced safe-exception sed to strip ALL `--long-flag` patterns (not just `--recursive`): `s/--[a-zA-Z][-a-zA-Z]*[[:space:]]+//g` runs before short-flag stripping.
**Result:** Fixes `rm -r --force /tmp/important` which was previously allowed because `--force` was partially matched by the short-flag pattern. EVAL 1: 15/15. EVAL 5 still 6/11.

## Experiment 4 — KEPT

**Score:** 4/5 (80.0%)
**Change:** Added `CMD_SAFE` variable that strips single-quoted and double-quoted strings before pattern matching. All destructive checks (rm, git, kubectl, docker) now use `CMD_SAFE` instead of raw `CMD`. SQL checks (DROP/TRUNCATE) use raw `CMD_LOWER` to catch SQL in quoted args.
**Result:** EVAL 5 improved dramatically (6/11 -> 11/11) — `echo 'rm -rf /'`, `grep 'DROP TABLE' schema.sql` etc. no longer trigger false positives. However, EVAL 1 regressed (15/15 -> 14/15) because `psql -c "DROP TABLE users"` has the SQL extracted truncated by the JSON grep layer due to embedded escaped quotes.

## Experiment 5 — KEPT

**Score:** 4/5 (80.0%)
**Change:** Added trailing-backslash detection to JSON command extraction. If grep output ends with `\` (indicating truncation at an escaped quote), the Python fallback is triggered to properly parse the JSON.
**Result:** Fixes `psql -c "DROP TABLE users"` — Python correctly extracts the full command including quoted SQL. However, the test harness was producing malformed JSON (unescaped inner quotes), so the fix only works with properly escaped JSON input (as Claude Code actually sends).

## Experiment 6 — KEPT

**Score:** 5/5 (100.0%)
**Change:** SQL client-aware detection. Introduced `IS_SQL_CLIENT` flag that checks if the command starts with a known SQL client (`psql`, `mysql`, `sqlite3`, `mongosh`, `mongo`, `sqlcmd`, `bq`). SQL checks now use `CMD_SAFE_LOWER` for general detection (prevents false positives on `grep 'DROP TABLE'`) but ALSO check raw `CMD` when a SQL client is the command (catches `psql -c "DROP TABLE users"` where the SQL is in quotes).
**Result:** All 58 test cases pass. EVAL 1: 15/15, EVAL 2: 15/15, EVAL 3: 12/12, EVAL 4: 5/5, EVAL 5: 11/11.
