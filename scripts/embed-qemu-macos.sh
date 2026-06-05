#!/bin/bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <qemu-build-dir> <Sanaka.app> [--sign]" >&2
  exit 1
fi

BUILD_DIR="$(cd "$1" && pwd)"
APP_PATH="$2"
DO_SIGN="false"

if [[ "${3:-}" == "--sign" ]]; then
  DO_SIGN="true"
fi

if [[ ! -d "$APP_PATH" ]]; then
  echo "App bundle not found: $APP_PATH" >&2
  exit 1
fi

QEMU_BIN_DIR="$APP_PATH/Contents/Resources/qemu/bin"
QEMU_SHARE_DIR="$APP_PATH/Contents/Resources/qemu/share/qemu"
FRAMEWORKS_DIR="$APP_PATH/Contents/Frameworks"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEFAULT_AARCH64_ENTITLEMENTS="$SCRIPT_DIR/../build/qemu-aarch64.entitlements.plist"
AARCH64_ENTITLEMENTS="${SANAKA_QEMU_AARCH64_ENTITLEMENTS:-$DEFAULT_AARCH64_ENTITLEMENTS}"

rm -rf "$QEMU_BIN_DIR" "$QEMU_SHARE_DIR"
mkdir -p "$QEMU_BIN_DIR" "$QEMU_SHARE_DIR" "$FRAMEWORKS_DIR"

SYSTEM_TARGETS=(
  x86_64
  i386
  aarch64
  arm
  riscv64
  ppc
  ppc64
)

copy_binary() {
  local source_path="$1"
  local target_name="$2"
  cp -f "$source_path" "$QEMU_BIN_DIR/$target_name"
  chmod u+w "$QEMU_BIN_DIR/$target_name"
}

for arch in "${SYSTEM_TARGETS[@]}"; do
  if [[ -f "$BUILD_DIR/qemu-system-$arch-unsigned" ]]; then
    copy_binary "$BUILD_DIR/qemu-system-$arch-unsigned" "qemu-system-$arch"
  elif [[ -f "$BUILD_DIR/qemu-system-$arch" ]]; then
    copy_binary "$BUILD_DIR/qemu-system-$arch" "qemu-system-$arch"
  else
    echo "Missing QEMU system binary for $arch in $BUILD_DIR" >&2
    exit 1
  fi
done

for tool in qemu-img; do
  if [[ -f "$BUILD_DIR/$tool" ]]; then
    copy_binary "$BUILD_DIR/$tool" "$tool"
  fi
done

if [[ -d "$BUILD_DIR/pc-bios" ]]; then
  rm -rf "$QEMU_SHARE_DIR"
  mkdir -p "$QEMU_SHARE_DIR"
  cp -R "$BUILD_DIR/pc-bios/." "$QEMU_SHARE_DIR/"
fi

prune_uefi_firmware() {
  if [[ "${SANAKA_KEEP_UEFI_FIRMWARE:-0}" == "1" ]]; then
    return 0
  fi

  find "$QEMU_SHARE_DIR" -maxdepth 1 -type f \( \
    -name 'edk2-*.fd' -o \
    -name 'edk2-*.bin' \
  \) \
    ! -name 'edk2-x86_64-code.fd' \
    ! -name 'edk2-x86_64-secure-code.fd' \
    -delete
}

prune_uefi_firmware

is_system_dep() {
  local dep="$1"
  [[ "$dep" == /usr/lib/* ]] || [[ "$dep" == /System/Library/* ]]
}

queue_dependencies() {
  local file_path="$1"
  otool -L "$file_path" | tail -n +2 | awk '{print $1}'
}

copy_dependency_recursive() {
  local dep="$1"
  local real_dep
  real_dep="$(python3 - <<'PY' "$dep"
import os, sys
print(os.path.realpath(sys.argv[1]))
PY
)"
  local base_name
  base_name="$(basename "$real_dep")"
  local target_dep="$FRAMEWORKS_DIR/$base_name"

  if is_system_dep "$real_dep"; then
    return 0
  fi

  if [[ ! -f "$real_dep" ]]; then
    echo "Dependency not found: $real_dep" >&2
    return 1
  fi

  if [[ ! -f "$target_dep" ]]; then
    cp -fL "$real_dep" "$target_dep"
    chmod u+w "$target_dep"
    while IFS= read -r nested; do
      [[ -n "$nested" ]] || continue
      copy_dependency_recursive "$nested"
    done < <(queue_dependencies "$real_dep")
  fi
}

while IFS= read -r binary; do
  while IFS= read -r dep; do
    [[ -n "$dep" ]] || continue
    if ! is_system_dep "$dep"; then
      copy_dependency_recursive "$dep"
    fi
  done < <(queue_dependencies "$binary")
done < <(find "$QEMU_BIN_DIR" -type f -perm -111 2>/dev/null)

rewrite_binary_deps() {
  local binary="$1"
  while IFS= read -r dep; do
    [[ -n "$dep" ]] || continue
    if ! is_system_dep "$dep"; then
      install_name_tool -change "$dep" "@executable_path/../../../Frameworks/$(basename "$(python3 - <<'PY' "$dep"
import os, sys
print(os.path.realpath(sys.argv[1]))
PY
)")" "$binary"
    fi
  done < <(queue_dependencies "$binary")
}

rewrite_dylib_deps() {
  local dylib="$1"
  install_name_tool -id "@loader_path/$(basename "$dylib")" "$dylib"
  while IFS= read -r dep; do
    [[ -n "$dep" ]] || continue
    if ! is_system_dep "$dep"; then
      install_name_tool -change "$dep" "@loader_path/$(basename "$(python3 - <<'PY' "$dep"
import os, sys
print(os.path.realpath(sys.argv[1]))
PY
)")" "$dylib"
    fi
  done < <(queue_dependencies "$dylib")
}

while IFS= read -r dylib; do
  rewrite_dylib_deps "$dylib"
done < <(find "$FRAMEWORKS_DIR" -maxdepth 1 -type f -name '*.dylib' | sort)

while IFS= read -r binary; do
  rewrite_binary_deps "$binary"
done < <(find "$QEMU_BIN_DIR" -type f -perm -111 2>/dev/null)

if [[ "$DO_SIGN" == "true" ]]; then
  while IFS= read -r dylib; do
    codesign --force --sign - "$dylib"
  done < <(find "$FRAMEWORKS_DIR" -maxdepth 1 -type f -name '*.dylib' | sort)

  while IFS= read -r binary; do
    if [[ "$(basename "$binary")" == "qemu-system-aarch64" && -f "$AARCH64_ENTITLEMENTS" ]]; then
      codesign --force --sign - --entitlements "$AARCH64_ENTITLEMENTS" "$binary"
    else
      codesign --force --sign - "$binary"
    fi
  done < <(find "$QEMU_BIN_DIR" -type f -perm -111 2>/dev/null)

  codesign --force --deep --sign - "$APP_PATH"
fi

echo
echo "Embedded QEMU into: $APP_PATH"
echo "QEMU binaries: $QEMU_BIN_DIR"
echo "Frameworks: $FRAMEWORKS_DIR"
echo "Shared resources: $QEMU_SHARE_DIR"
