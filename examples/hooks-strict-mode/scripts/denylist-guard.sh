#!/usr/bin/env bash
# PreToolUse hook — dangerous-command denylist. Blocks 7 families of
# foot-guns outright. Pair with the inner `if` rules in .claude/settings.json
# so this script is invoked once per matched family.
#
# The hook receives the matched tool input on stdin as JSON; we read only the
# fields we need and rely on the `if` matcher to scope invocations. Each
# blocked family has its own override env var so the user can opt-in with
# minimum blast radius.
#
# Suite role: this is the strict-mode pack referenced from
# guides/hook-patterns.md §5. Copy this entire directory tree if you want
# defense-in-depth on top of the baseline pack.
set -euo pipefail

# Hooks receive the tool invocation as JSON on stdin. We don't strictly need
# to parse it here (the `if` matcher already narrowed us to a single family
# per script invocation), but we drain stdin so the JSON producer doesn't
# get SIGPIPE.
_consumed_stdin="$(cat || true)"
: "${_consumed_stdin:=}"   # silence unused-var lint without disabling shellcheck

family="${1:-unknown}"

case "$family" in
  force-push)
    override="CLAUDE_ALLOW_FORCE_PUSH"
    why="overwrites upstream history; can destroy teammates' commits"
    safer="git push --force-with-lease  (refuses if remote moved)"
    ;;
  hard-reset-remote)
    override="CLAUDE_ALLOW_HARD_RESET_REMOTE"
    why="discards local commits to match the remote — destructive and silent"
    safer="git stash  → inspect  → git reset --hard ORIG_HEAD if truly unwanted"
    ;;
  rm-rf)
    override="CLAUDE_ALLOW_RM_RF"
    why="recursive delete is catastrophic and unrecoverable"
    safer="prefer targeted file removal: 'rm path/to/file'"
    ;;
  sql-destructive)
    override="CLAUDE_ALLOW_SQL_DESTRUCTIVE"
    why="DROP TABLE / TRUNCATE on production data is unrecoverable"
    safer="run against a staging database, or wrap in a transaction with rollback rehearsal"
    ;;
  kubectl-destructive)
    override="CLAUDE_ALLOW_KUBECTL_DESTRUCTIVE"
    why="kubectl delete / drain affects shared infrastructure"
    safer="kubectl get  to inspect; coordinate with on-call before destructive ops"
    ;;
  npm-publish)
    override="CLAUDE_ALLOW_NPM_PUBLISH"
    why="publishes a package version irreversibly to the npm registry"
    safer="bump version + git tag + manual publish from a CI release pipeline"
    ;;
  curl-pipe-shell)
    override="CLAUDE_ALLOW_CURL_PIPE_SHELL"
    why="executes arbitrary code fetched over the network; supply-chain risk"
    safer="download the script, inspect, then run locally"
    ;;
  *)
    # Unknown family — fail closed (defense in depth).
    cat >&2 <<EOF
✗ denylist-guard.sh invoked with unknown family '${family}'.
  This indicates a misconfigured hook entry. Edit .claude/settings.json or
  pass one of the known families: force-push, hard-reset-remote, rm-rf,
  sql-destructive, kubectl-destructive, npm-publish, curl-pipe-shell.
EOF
    exit 2
    ;;
esac

if [[ "${!override:-0}" == "1" ]]; then
  exit 0
fi

cat >&2 <<EOF
✗ refused: ${family} ($why)

  Override (only after careful thought): set ${override}=1 in the shell
  that launched Claude Code, then retry. Hooks inherit env vars from that
  shell, so a one-off retry needs a one-off export.

  Safer alternative:
    ${safer}
EOF
exit 2
