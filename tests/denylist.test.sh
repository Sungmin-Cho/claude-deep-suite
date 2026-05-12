#!/usr/bin/env bash
# denylist.test.sh — case-based assertions for the 7 documented dangerous-command
# families enforced by examples/hooks-strict-mode/scripts/denylist-guard.sh.
#
# M5.5 #7 acceptance — see docs/deep-suite-harness-roadmap.md §M5.5 #7.
#
# Invariants asserted per family:
#   1. denylist-guard.sh <family> without override env → exit 2, stderr contains
#      "refused: <family>" + family-specific WHY substring.
#   2. denylist-guard.sh <family> with override env (CLAUDE_ALLOW_<FAMILY>=1) → exit 0.
#   3. Stdin JSON is drained without SIGPIPE (script consumes stdin before
#      branching on the family argv).
# Plus the negative path:
#   4. Unknown family argv → fail-closed with exit 2 + "unknown family" in stderr.
#
# Companion to tests/examples.test.js which only checks settings.json covers the
# 7 families and that shellcheck passes. This test EXECUTES the guard per family
# so a future regression in case-branch logic (e.g. dropping a `;;` or wiring the
# wrong override var) gets caught.
#
# Designed to run on both macOS bash 3.2 and GNU bash 5+ (M5.5 #4 CI matrix).

set -u  # NB: not -e — we expect non-zero exits and inspect them manually.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GUARD="$REPO_ROOT/examples/hooks-strict-mode/scripts/denylist-guard.sh"

if [[ ! -x "$GUARD" ]]; then
  printf 'FAIL: denylist-guard.sh missing or not executable at %s\n' "$GUARD" >&2
  exit 1
fi

PASS=0
FAIL=0
FAILURES=()

# assert_exit <expected_exit> <actual_exit> <label>
assert_exit() {
  local expected="$1" actual="$2" label="$3"
  if [[ "$actual" -eq "$expected" ]]; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    FAILURES+=("$label: expected exit $expected, got $actual")
    printf '  ✗ %s: expected exit %s, got %s\n' "$label" "$expected" "$actual" >&2
  fi
}

# assert_stderr_contains <needle> <stderr_text> <label>
assert_stderr_contains() {
  local needle="$1" haystack="$2" label="$3"
  if printf '%s' "$haystack" | grep -qF -- "$needle"; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    FAILURES+=("$label: stderr missing substring '$needle'")
    printf '  ✗ %s: stderr missing substring %q\n' "$label" "$needle" >&2
    printf '    stderr was: %q\n' "$haystack" >&2
  fi
}

# run_family <family> [<override_var>=<value>]... — runs guard with stdin
# JSON and a clean PATH; returns triple: <exit>|<stdout>|<stderr_b64>.
# We base64 stderr to keep it on a single line for stable parsing across
# bash 3.2 (no readarray) without inventing a delimiter.
run_family() {
  local family="$1"; shift
  local tmp_err tmp_out exit_code
  tmp_err="$(mktemp -t denylist-err.XXXXXX)"
  tmp_out="$(mktemp -t denylist-out.XXXXXX)"
  # Stdin payload mimics what Claude Code's hook engine pipes in: a JSON
  # blob describing the Bash invocation. Content is irrelevant to the
  # guard's branch (argv decides) — we only verify stdin is drained.
  local stdin_payload='{"tool":"Bash","input":{"command":"placeholder"}}'

  # Run with the override env vars passed as arguments (KEY=VAL form).
  env "$@" bash "$GUARD" "$family" <<<"$stdin_payload" \
    >"$tmp_out" 2>"$tmp_err" && exit_code=0 || exit_code=$?

  local out err
  out="$(cat "$tmp_out")"
  err="$(cat "$tmp_err")"
  rm -f "$tmp_out" "$tmp_err"

  printf '%s\n%s\n%s\n' "$exit_code" "$out" "$err"
}

# parse_run <triple_output> sets RESULT_EXIT / RESULT_STDOUT / RESULT_STDERR.
parse_run() {
  local triple="$1"
  RESULT_EXIT="$(printf '%s\n' "$triple" | sed -n '1p')"
  RESULT_STDOUT="$(printf '%s\n' "$triple" | sed -n '2p')"
  # Everything from line 3 onward is stderr (may be multiline).
  RESULT_STDERR="$(printf '%s\n' "$triple" | awk 'NR>=3' )"
}

# Each family row: family|override_env|why_substring
# `why_substring` mirrors a unique fragment of the `why` line in denylist-guard.sh
# — strong enough to detect a wrong-family wiring in settings.json (e.g. if a
# rule said `denylist-guard.sh rm-rf` but pointed at force-push WHY text).
FAMILY_ROWS=(
  "force-push|CLAUDE_ALLOW_FORCE_PUSH|overwrites upstream history"
  "hard-reset-remote|CLAUDE_ALLOW_HARD_RESET_REMOTE|discards local commits"
  "rm-rf|CLAUDE_ALLOW_RM_RF|recursive delete is catastrophic"
  "sql-destructive|CLAUDE_ALLOW_SQL_DESTRUCTIVE|DROP TABLE / TRUNCATE"
  "kubectl-destructive|CLAUDE_ALLOW_KUBECTL_DESTRUCTIVE|shared infrastructure"
  "npm-publish|CLAUDE_ALLOW_NPM_PUBLISH|publishes a package version"
  "curl-pipe-shell|CLAUDE_ALLOW_CURL_PIPE_SHELL|fetched over the network"
)

# Sanity: ensure we kept all 7 documented families in step with denylist-guard.sh
# case statement (defense in depth — examples.test.js asserts the same set from
# settings.json side, this asserts from the test side).
if [[ ${#FAMILY_ROWS[@]} -ne 7 ]]; then
  printf 'FAIL: FAMILY_ROWS has %s entries, expected 7\n' "${#FAMILY_ROWS[@]}" >&2
  exit 1
fi

printf 'denylist.test.sh — running 7 family blocks + overrides + unknown fallback\n'

for row in "${FAMILY_ROWS[@]}"; do
  family="${row%%|*}"
  rest="${row#*|}"
  override="${rest%%|*}"
  why="${rest#*|}"

  printf '  · %s\n' "$family"

  # 1) Block path: no override → exit 2 with family-named refusal.
  triple="$(run_family "$family")"
  parse_run "$triple"
  assert_exit 2 "$RESULT_EXIT" "$family block exit"
  assert_stderr_contains "refused: $family" "$RESULT_STDERR" "$family block refusal banner"
  assert_stderr_contains "$why" "$RESULT_STDERR" "$family block WHY text"
  assert_stderr_contains "$override" "$RESULT_STDERR" "$family block override hint"

  # 2) Override path: env=1 → exit 0, stderr empty.
  triple="$(run_family "$family" "$override=1")"
  parse_run "$triple"
  assert_exit 0 "$RESULT_EXIT" "$family override exit"
  if [[ -n "$RESULT_STDERR" ]]; then
    FAIL=$((FAIL + 1))
    FAILURES+=("$family override: expected empty stderr, got: $RESULT_STDERR")
    printf '  ✗ %s override: expected empty stderr, got %q\n' "$family" "$RESULT_STDERR" >&2
  else
    PASS=$((PASS + 1))
  fi

  # 3) Override=0 must still block (only literal "1" overrides — script reads
  #    "${!override:-0}" == "1", so any other value is treated as off).
  triple="$(run_family "$family" "$override=0")"
  parse_run "$triple"
  assert_exit 2 "$RESULT_EXIT" "$family override=0 still blocks"
done

# 4) Unknown family → fail-closed with explicit unknown-family error.
printf '  · unknown-family fail-closed\n'
triple="$(run_family "definitely-not-a-real-family")"
parse_run "$triple"
assert_exit 2 "$RESULT_EXIT" "unknown family exit"
assert_stderr_contains "unknown family" "$RESULT_STDERR" "unknown family banner"
assert_stderr_contains "definitely-not-a-real-family" "$RESULT_STDERR" "unknown family echoes argv"

# 5) No-arg invocation should also fail closed (family defaults to "unknown").
printf '  · no-argv fail-closed\n'
tmp_err="$(mktemp -t denylist-err.XXXXXX)"
exit_code=0
bash "$GUARD" </dev/null >/dev/null 2>"$tmp_err" || exit_code=$?
no_arg_stderr="$(cat "$tmp_err")"
rm -f "$tmp_err"
assert_exit 2 "$exit_code" "no-arg exit"
assert_stderr_contains "unknown family" "$no_arg_stderr" "no-arg unknown banner"

printf '\nResults: %s passed, %s failed\n' "$PASS" "$FAIL"
if [[ "$FAIL" -gt 0 ]]; then
  printf '\nFAILURES:\n'
  for f in "${FAILURES[@]}"; do
    printf '  - %s\n' "$f"
  done
  exit 1
fi
exit 0
