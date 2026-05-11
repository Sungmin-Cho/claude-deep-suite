#!/usr/bin/env bash
# SessionStart hook — rotates stale per-session state files left over from
# previous Claude Code runs (>24h old). Idempotent and safe on a clean repo.
#
# Suite role: this is the baseline "recover from prior-session debris" pattern
# described in guides/hook-patterns.md §3.1. Plugins SHOULD adapt this when
# their per-session state lives in a different directory.
set -euo pipefail

# Where the previous session's leftover state lives. Override via env var
# CLAUDE_BASELINE_STATE_DIR for testing.
state_dir="${CLAUDE_BASELINE_STATE_DIR:-${CLAUDE_PLUGIN_DATA:-.claude/state}}"

if [[ ! -d "$state_dir" ]]; then
  # Nothing to clean. Quiet success (don't pollute SessionStart output).
  exit 0
fi

# Find files older than 1 day (mtime) and rotate them aside. We do not delete
# outright — the user may want to inspect what was abandoned.
#
# `-print -quit` returns 0 (truthy) iff at least one matching file exists.
# Using find's `-exec` with mv keeps each file's mtime/permissions intact.
shopt -s nullglob
moved=0
while IFS= read -r -d '' f; do
  ts="$(date +%s)"
  mv "$f" "${f}.stale-${ts}"
  moved=$((moved + 1))
done < <(find "$state_dir" -maxdepth 1 -type f -mtime +1 \
  ! -name '*.stale-*' \
  ! -name 'metrics.jsonl' \
  -print0 2>/dev/null)

if (( moved > 0 )); then
  echo "session-open: rotated ${moved} stale state file(s) in ${state_dir}"
fi
exit 0
