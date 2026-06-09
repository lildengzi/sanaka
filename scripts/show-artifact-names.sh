#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "$0")" && pwd)/lib/i18n.sh"
sanaka_load_i18n

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

MAC_DMG_NAME="$(node "$REPO_ROOT/build/artifact-names.js" file macos arm64 dmg)"
WIN_EXE_NAME="$(node "$REPO_ROOT/build/artifact-names.js" file win x64 exe)"
LINUX_DEB_NAME="$(node "$REPO_ROOT/build/artifact-names.js" file linux x64 deb)"

sanaka_log "package_macos.packaged_dmg_name"
echo "$MAC_DMG_NAME"
echo
sanaka_log "package_windows.installer_name"
echo "$WIN_EXE_NAME"
echo
sanaka_log "package_linux.deb_name"
echo "$LINUX_DEB_NAME"
