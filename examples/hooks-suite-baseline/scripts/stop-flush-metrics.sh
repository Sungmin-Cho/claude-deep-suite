#!/usr/bin/env bash
# Stop hook — appends a single NDJSON line to the session metrics log
# before Claude ends its turn. Future SessionStart can read this to compute
# basic session-frequency / duration stats; the dashboard's suite-collector
# can aggregate across sessions.
#
# Suite role: minimal "metric flush" pattern from guides/hook-patterns.md
# §3.4. Real plugins typically emit envelope-wrapped artifacts here
# (compaction-state.json, session-receipt.json, etc.).
set -euo pipefail

metrics_dir="${CLAUDE_PLUGIN_DATA:-.claude/state}"
metrics_file="${metrics_dir}/metrics.jsonl"
mkdir -p "$metrics_dir"

# RFC 3339 UTC timestamp (date -u +%Y-%m-%dT%H:%M:%SZ works on both
# macOS BSD date and GNU date).
ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
session="${CLAUDE_SESSION_ID:-unknown}"

# JSON-escape session id defensively (CLAUDE_SESSION_ID is normally a UUID,
# but the env var is user-influenceable so we sanitize before string-interp).
# Strip double-quote and backslash via bash parameter expansion (no tr/sed,
# avoids shellcheck SC1003 around the escape-pair in a character class).
session_safe="${session//\"/}"
session_safe="${session_safe//\\/}"

# Single-line NDJSON record. Keep it tiny — every Stop event appends one
# line. Big payloads belong in dedicated envelope artifacts.
printf '{"ts":"%s","event":"stop","session":"%s"}\n' "$ts" "$session_safe" >> "$metrics_file"
exit 0
