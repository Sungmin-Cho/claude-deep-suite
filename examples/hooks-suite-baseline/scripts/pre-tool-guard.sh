#!/usr/bin/env bash
# PreToolUse hook — baseline guard. Blocks the most common foot-gun
# (force-push) outright; everything else is allowed. Pair with the inner
# `if` rule in .claude/settings.json so this script only runs on
# `Bash(git push --force *)` / `Bash(git push -f *)` invocations.
#
# Per Claude Code hook semantics: exit code 2 BLOCKS the tool call; exit
# code 1 is a non-blocking warning; exit 0 allows. We must exit 2 to
# actually prevent the operation.
#
# Override: set CLAUDE_ALLOW_FORCE_PUSH=1 in the shell that ran `claude`.
set -euo pipefail

# Claude Code passes tool invocation JSON on stdin. We don't parse it here
# (the `if` matcher already narrowed us to force-push). Drain stdin so the
# JSON-producing side doesn't get SIGPIPE on our quick exit. Mirror the
# strict-mode pack's identical pattern in denylist-guard.sh.
cat >/dev/null || true

if [[ "${CLAUDE_ALLOW_FORCE_PUSH:-0}" == "1" ]]; then
  exit 0
fi

cat <<'EOF' >&2
✗ refused: 'git push --force' requires explicit user override.

  If you really mean to overwrite upstream history (you almost never should),
  set CLAUDE_ALLOW_FORCE_PUSH=1 in the shell that launched Claude Code, then
  retry the operation. Hooks inherit env vars from that shell.

  Safer alternatives:
    - git push --force-with-lease   (refuses if remote moved)
    - git revert <bad-commit>       (forward-only history fix)
    - open a new branch and PR      (preserve the existing commit graph)
EOF
exit 2
