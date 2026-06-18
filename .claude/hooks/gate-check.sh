#!/usr/bin/env bash
# Stop hook — gate guardrail for ffu-web.
#
# When tracked source under src/ has uncommitted changes, run the repo gates and BLOCK the turn from
# ending red (the failure is fed back so it gets fixed first). This turns "never push red" from a
# memory into a guardrail.
#
# Deliberately scoped to GATES, not commit/push: pushing is an outward, hard-to-reverse action that
# needs judgment a hook can't supply (right branch? change complete? good message?). The hook only
# guarantees the tree is green; committing + pushing stays a deliberate step.
set -uo pipefail

input=$(cat)

# Don't re-run on the stop that this hook itself triggered (avoids a fix→stop→gate loop).
if [ "$(printf '%s' "$input" | jq -r '.stop_hook_active // false')" = "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# Skip pure-conversation turns: only gate when source actually changed (modified, staged, or new).
if [ -z "$(git status --porcelain -- src 2>/dev/null)" ]; then
  exit 0
fi

# Capture first so the exit status comes from the gate chain itself, never a pipe (a piped gate
# command would mask its failing exit code — the bug behind a past red push).
if ! out=$(npm run typecheck 2>&1 && npm run lint 2>&1 && npm test 2>&1); then
  {
    echo "✗ Gates failed — fix before committing/pushing (typecheck → lint → test):"
    printf '%s\n' "$out" | tail -n 50
  } >&2
  exit 2 # Stop hook: block the stop and feed stderr back so it gets fixed.
fi

exit 0
