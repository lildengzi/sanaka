#!/usr/bin/env bash

set -euo pipefail

source "$(cd "$(dirname "$0")" && pwd)/lib/i18n.sh"
sanaka_load_i18n

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  sanaka_log "push.not_git_repo"
  exit 1
fi

BRANCH="$(git branch --show-current)"

if [[ -z "${BRANCH}" ]]; then
  sanaka_log "push.not_on_branch"
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  MESSAGE="${1:-Update}"
  git add -A
  git commit -m "$MESSAGE"
else
  sanaka_log "push.no_local_changes"
fi

sanaka_log "push.pushing" "$BRANCH"
git push origin "$BRANCH"
sanaka_log "common.done"
