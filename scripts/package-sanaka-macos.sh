#!/bin/bash
set -euo pipefail

if [[ "${1:-}" == "" ]]; then
  echo "Usage: $0 <qemu-build-dir>" >&2
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
  echo "Unable to locate packaged Sanaka.app under $OUTPUT_ROOT" >&2
  exit 1
fi

SANAKA_QEMU_AARCH64_ENTITLEMENTS="$REPO_ROOT/build/qemu-aarch64.entitlements.plist" \
  bash "$REPO_ROOT/scripts/embed-qemu-macos.sh" "$QEMU_BUILD_DIR" "$APP_PATH" --sign

echo
echo "Packaged app with embedded QEMU:"
echo "$APP_PATH"
