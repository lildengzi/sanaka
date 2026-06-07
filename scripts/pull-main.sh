#!/usr/bin/env bash

set -euo pipefail

source "$(cd "$(dirname "$0")" && pwd)/lib/i18n.sh"
sanaka_load_i18n

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

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
git reset --hard origin/main

sanaka_log "pull.entering_doctor"
bash "$ROOT_DIR/scripts/doctor.sh" --auto

sanaka_log "pull.completed"
