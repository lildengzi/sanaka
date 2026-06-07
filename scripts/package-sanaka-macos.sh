#!/bin/bash
set -euo pipefail

source "$(cd "$(dirname "$0")" && pwd)/lib/i18n.sh"
sanaka_load_i18n

if [[ "${1:-}" == "" ]]; then
  sanaka_printf_ln "common.usage_package_macos" "$0" >&2
  exit 1
fi

QEMU_BUILD_DIR="$(cd "$1" && pwd)"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT_ROOT="$REPO_ROOT/release"

cd "$REPO_ROOT"

npm run build
npx electron-builder --dir --mac --config.mac.target=dir

APP_PATH="$(find "$OUTPUT_ROOT" -type d -name 'Sanaka.app' | head -n 1)"

if [[ "$APP_PATH" == "" ]]; then
  sanaka_printf_ln "package_macos.app_not_found" "$OUTPUT_ROOT" >&2
  exit 1
fi

SANAKA_QEMU_AARCH64_ENTITLEMENTS="$REPO_ROOT/build/qemu-aarch64.entitlements.plist" \
  bash "$REPO_ROOT/scripts/embed-qemu-macos.sh" "$QEMU_BUILD_DIR" "$APP_PATH" --sign

LSREGISTER_BIN="/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister"

if [[ -x "$LSREGISTER_BIN" ]]; then
  "$LSREGISTER_BIN" -f "$APP_PATH" >/dev/null 2>&1 || true
fi

touch "$APP_PATH" || true

echo
sanaka_log "package_macos.packaged_app"
echo "$APP_PATH"
