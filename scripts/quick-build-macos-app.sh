#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEFAULT_QEMU_BUILD_DIR="/Volumes/sks/src/qemu-11.0.1/build-sanaka"
QEMU_BUILD_DIR="${1:-$DEFAULT_QEMU_BUILD_DIR}"

if [[ ! -d "$QEMU_BUILD_DIR" ]]; then
  echo "QEMU build directory not found:" >&2
  echo "  $QEMU_BUILD_DIR" >&2
  echo >&2
  echo "Usage:" >&2
  echo "  sh scripts/quick-build-macos-app.sh [qemu-build-dir]" >&2
  exit 1
fi

echo "Using QEMU build directory:"
echo "  $QEMU_BUILD_DIR"
echo

cd "$REPO_ROOT"
bash "$REPO_ROOT/scripts/package-sanaka-macos.sh" "$QEMU_BUILD_DIR"

