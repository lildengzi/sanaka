#!/bin/bash
set -euo pipefail

source "$(cd "$(dirname "$0")" && pwd)/lib/i18n.sh"
sanaka_load_i18n

if [[ "${1:-}" == "" ]]; then
  sanaka_printf_ln "common.usage_build_qemu" "$0" >&2
  exit 1
fi

SOURCE_DIR="$(cd "$1" && pwd)"
BUILD_DIR_NAME="${2:-build-sanaka}"
BUILD_DIR="$SOURCE_DIR/$BUILD_DIR_NAME"

TARGETS="x86_64-softmmu,i386-softmmu,aarch64-softmmu,arm-softmmu,riscv64-softmmu,ppc-softmmu,ppc64-softmmu"

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

"$SOURCE_DIR/configure" \
  --target-list="$TARGETS" \
  --disable-docs \
  --disable-gtk \
  --disable-sdl \
  --disable-cocoa \
  --disable-curses \
  --disable-opengl \
  --disable-spice \
  --disable-spice-protocol \
  --disable-vde \
  --disable-libiscsi \
  --disable-libssh \
  --disable-libusb \
  --disable-usb-redir \
  --disable-gnutls \
  --disable-curl \
  --disable-capstone \
  --disable-guest-agent \
  --enable-slirp \
  --audio-drv-list=coreaudio

make -j"$(sysctl -n hw.logicalcpu)"

echo
sanaka_log "build_qemu.built_in" "$BUILD_DIR"
sanaka_log "build_qemu.key_binaries"
find "$BUILD_DIR" -maxdepth 1 \( -name 'qemu-system-*-unsigned' -o -name 'qemu-img' \) | sort
