#!/usr/bin/env bash

set -euo pipefail

source "$(cd "$(dirname "$0")" && pwd)/lib/i18n.sh"
sanaka_load_i18n

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

TARGET_BRANCH="${1:-main}"

sanaka_log "common.current_directory" "$ROOT_DIR"

if ! command -v git >/dev/null 2>&1; then
  sanaka_log "pull.missing_git"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  sanaka_log "pull.missing_npm"
  exit 1
fi

sanaka_log "pull.fetching"
git fetch origin

if ! git show-ref --verify --quiet "refs/remotes/origin/${TARGET_BRANCH}"; then
  echo "Remote branch origin/${TARGET_BRANCH} does not exist."
  exit 1
fi

if git show-ref --verify --quiet "refs/heads/${TARGET_BRANCH}"; then
  git checkout "${TARGET_BRANCH}"
else
  git checkout -b "${TARGET_BRANCH}" "origin/${TARGET_BRANCH}"
fi

git reset --hard "origin/${TARGET_BRANCH}"

sanaka_log "pull.entering_doctor"
bash "$ROOT_DIR/scripts/doctor.sh" --auto

sanaka_log "pull.completed"
