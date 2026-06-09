#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "$0")" && pwd)/lib/i18n.sh"
sanaka_load_i18n

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT_ROOT="$REPO_ROOT/release"

resolve_qemu_dir() {
  if [[ -n "${1:-}" ]]; then
    printf '%s\n' "$1"
    return 0
  fi

  local candidates=(
    "/c/Program Files/qemu"
    "/c/Program Files/QEMU"
    "/mnt/c/Program Files/qemu"
    "/mnt/c/Program Files/QEMU"
    "C:/Program Files/qemu"
    "C:/Program Files/QEMU"
  )

  for candidate in "${candidates[@]}"; do
    if [[ -d "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  return 1
}

QEMU_DIR="$(resolve_qemu_dir "${1:-}" || true)"

if [[ -z "$QEMU_DIR" ]]; then
  sanaka_log "package_windows.qemu_not_found" >&2
  sanaka_printf_ln "common.usage_package_windows" "$0" >&2
  exit 1
fi

cd "$REPO_ROOT"

npm run build
npx electron-builder --dir --win

APP_DIR="$(find "$OUTPUT_ROOT" -maxdepth 2 -type d -name 'win-unpacked' | head -n 1)"

if [[ "$APP_DIR" == "" ]]; then
  sanaka_printf_ln "package_windows.app_not_found" "$OUTPUT_ROOT" >&2
  exit 1
fi

bash "$REPO_ROOT/scripts/embed-qemu-windows.sh" "$QEMU_DIR" "$APP_DIR"

ARTIFACT_BASE_NAME="$(node "$REPO_ROOT/build/artifact-names.js" base win x64)"
INSTALLER_NAME="$(node "$REPO_ROOT/build/artifact-names.js" file win x64 exe)"

echo
sanaka_log "package_windows.packaged_app"
echo "$APP_DIR"
echo
sanaka_log "package_windows.artifact_base_name"
echo "$ARTIFACT_BASE_NAME"
echo
sanaka_log "package_windows.installer_name"
echo "$INSTALLER_NAME"
