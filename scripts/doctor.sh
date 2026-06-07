#!/usr/bin/env bash

set -euo pipefail

source "$(cd "$(dirname "$0")" && pwd)/lib/i18n.sh"
sanaka_load_i18n

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

SKIP_BUILD="false"
AUTO_MODE="false"
MENU_MODE="false"

NPM_REGISTRY=""
ELECTRON_MIRROR_URL=""
CURRENT_ELECTRON_VERSION=""

NPM_CANDIDATES=(
  "https://registry.npmjs.org"
  "https://registry.npmmirror.com"
  "https://mirrors.cloud.tencent.com/npm/"
  "https://repo.huaweicloud.com/repository/npm/"
)

ELECTRON_CANDIDATES=(
  "https://github.com/electron/electron/releases/download/"
  "https://npmmirror.com/mirrors/electron/"
  "https://mirrors.huaweicloud.com/electron/"
)

for arg in "$@"; do
  case "$arg" in
    --no-build)
      SKIP_BUILD="true"
      ;;
    --auto)
      AUTO_MODE="true"
      ;;
    --menu)
      MENU_MODE="true"
      ;;
    *)
      ;;
  esac
done

log() {
  printf '%s\n' "$1"
}

section() {
  printf '\n== %s ==\n' "$1"
}

require_command() {
  local cmd="$1"
  local hint="$2"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    log "$hint"
    exit 1
  fi
}

trim_trailing_slash() {
  local value="$1"
  value="${value%/}"
  printf '%s' "$value"
}

normalize_with_trailing_slash() {
  local value="$1"
  value="$(trim_trailing_slash "$value")"
  printf '%s/' "$value"
}

load_electron_version() {
  if CURRENT_ELECTRON_VERSION="$(node -p "const pkg=require('./package.json'); (pkg.devDependencies&&pkg.devDependencies.electron)||(pkg.dependencies&&pkg.dependencies.electron)||''" 2>/dev/null)"; then
    CURRENT_ELECTRON_VERSION="${CURRENT_ELECTRON_VERSION#^}"
    CURRENT_ELECTRON_VERSION="${CURRENT_ELECTRON_VERSION#~}"
  else
    CURRENT_ELECTRON_VERSION=""
  fi
}

read_current_config() {
  NPM_REGISTRY="$(npm config get registry 2>/dev/null || true)"
  if [[ "$NPM_REGISTRY" == "undefined" ]]; then
    NPM_REGISTRY=""
  fi

  ELECTRON_MIRROR_URL="${ELECTRON_MIRROR:-}"
  if [[ -z "$ELECTRON_MIRROR_URL" ]]; then
    ELECTRON_MIRROR_URL="$(read_user_npmrc_key "electron_mirror")"
  fi
}

read_user_npmrc_key() {
  local key="$1"
  local npmrc_path="$HOME/.npmrc"
  if [[ ! -f "$npmrc_path" ]]; then
    return 0
  fi

  awk -F= -v lookup="$key" '
    $1 == lookup {
      value = substr($0, index($0, "=") + 1)
      gsub(/^"/, "", value)
      gsub(/"$/, "", value)
      print value
    }
  ' "$npmrc_path" | tail -n 1
}

write_user_npmrc_key() {
  local key="$1"
  local value="$2"
  local npmrc_path="$HOME/.npmrc"
  local temp_path
  temp_path="$(mktemp)"

  if [[ -f "$npmrc_path" ]]; then
    grep -v "^${key}=" "$npmrc_path" >"$temp_path" || true
  fi

  printf '%s="%s"\n' "$key" "$value" >>"$temp_path"
  mv "$temp_path" "$npmrc_path"
}

print_current_config() {
  read_current_config
  sanaka_section "doctor.current_mirror_config"
  sanaka_log "doctor.registry_value" "${NPM_REGISTRY:-$(sanaka_t "doctor.unset")}"
  sanaka_log "doctor.electron_mirror_value" "${ELECTRON_MIRROR_URL:-$(sanaka_t "doctor.unset")}"
  if [[ -n "$CURRENT_ELECTRON_VERSION" ]]; then
    sanaka_log "doctor.electron_version_value" "$CURRENT_ELECTRON_VERSION"
  fi
}

probe_url_time() {
  local url="$1"
  local result

  if ! result="$(
    curl -L --silent --show-error \
      --output /dev/null \
      --connect-timeout 4 \
      --max-time 12 \
      --write-out '%{http_code} %{time_total}' \
      "$url" 2>/dev/null
  )"; then
    return 1
  fi

  local http_code total_time
  http_code="$(printf '%s' "$result" | awk '{print $1}')"
  total_time="$(printf '%s' "$result" | awk '{print $2}')"

  if [[ "$http_code" != "200" && "$http_code" != "204" ]]; then
    return 1
  fi

  printf '%s' "$total_time"
}

probe_npm_registry() {
  local base_url="$1"
  local normalized
  normalized="$(normalize_with_trailing_slash "$base_url")"
  probe_url_time "${normalized}-/ping?write=true"
}

probe_electron_mirror() {
  local base_url="$1"
  local normalized
  normalized="$(normalize_with_trailing_slash "$base_url")"

  if [[ -z "$CURRENT_ELECTRON_VERSION" ]]; then
    return 1
  fi

  if [[ "$normalized" == "https://github.com/electron/electron/releases/download/" ]]; then
    probe_url_time "${normalized}v${CURRENT_ELECTRON_VERSION}/SHASUMS256.txt"
    return
  fi

  probe_url_time "${normalized}${CURRENT_ELECTRON_VERSION}/SHASUMS256.txt"
}

pick_fastest_mirror() {
  local mode="$1"
  shift
  local candidates=("$@")
  local fastest=""
  local fastest_time=""
  local label url seconds

  for url in "${candidates[@]}"; do
    label="$url"
    sanaka_printf "doctor.testing_one" "$label" >&2
    if [[ "$mode" == "npm" ]]; then
      if seconds="$(probe_npm_registry "$url")"; then
        printf '%ss\n' "$seconds" >&2
      else
        sanaka_printf_ln "doctor.testing_failed" >&2
        continue
      fi
    else
      if seconds="$(probe_electron_mirror "$url")"; then
        printf '%ss\n' "$seconds" >&2
      else
        sanaka_printf_ln "doctor.testing_failed" >&2
        continue
      fi
    fi

    if [[ -z "$fastest_time" ]] || awk "BEGIN { exit !($seconds < $fastest_time) }"; then
      fastest="$url"
      fastest_time="$seconds"
    fi
  done

  if [[ -n "$fastest" ]]; then
    printf '%s|%s\n' "$fastest" "$fastest_time"
  fi
}

apply_mirrors() {
  local npm_registry="$1"
  local electron_mirror="$2"

  sanaka_section "doctor.writing_mirrors"
  npm config set registry "$(trim_trailing_slash "$npm_registry")"
  write_user_npmrc_key "electron_mirror" "$(normalize_with_trailing_slash "$electron_mirror")"
  export ELECTRON_MIRROR="$(normalize_with_trailing_slash "$electron_mirror")"
  sanaka_log "doctor.set_npm_registry" "$(trim_trailing_slash "$npm_registry")"
  sanaka_log "doctor.set_electron_mirror" "$(normalize_with_trailing_slash "$electron_mirror")"
}

confirm() {
  local prompt="$1"
  local answer
  sanaka_printf "common.yes_no" "$prompt"
  read -r answer || true
  case "${answer:-Y}" in
    Y|y|yes|YES|"")
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

test_and_offer_best_mirrors() {
  local npm_result electron_result
  local best_npm best_npm_time best_electron best_electron_time

  sanaka_section "doctor.testing_npm"
  npm_result="$(pick_fastest_mirror "npm" "${NPM_CANDIDATES[@]}" || true)"
  if [[ -z "$npm_result" ]]; then
    sanaka_log "doctor.no_npm_registry"
    return 1
  fi
  best_npm="${npm_result%%|*}"
  best_npm_time="${npm_result#*|}"

  sanaka_section "doctor.testing_electron"
  electron_result="$(pick_fastest_mirror "electron" "${ELECTRON_CANDIDATES[@]}" || true)"
  if [[ -z "$electron_result" ]]; then
    sanaka_log "doctor.no_electron_mirror"
    return 1
  fi
  best_electron="${electron_result%%|*}"
  best_electron_time="${electron_result#*|}"

  sanaka_section "doctor.testing_result"
  sanaka_log "doctor.fastest_npm" "$best_npm" "$best_npm_time"
  sanaka_log "doctor.fastest_electron" "$best_electron" "$best_electron_time"

  if [[ "$AUTO_MODE" == "true" ]]; then
    apply_mirrors "$best_npm" "$best_electron"
    return 0
  fi

  if confirm "$(sanaka_t "doctor.switch_prompt")"; then
    apply_mirrors "$best_npm" "$best_electron"
  else
    sanaka_log "doctor.switch_cancelled"
  fi
}

repair_electron_cache() {
  sanaka_log "doctor.clean_electron_cache"
  rm -rf node_modules/electron node_modules/@electron node_modules/fs-extra
  rm -rf "$HOME/.cache/electron" "$HOME/.npm/_electron"
}

repair_full_node_modules() {
  sanaka_log "doctor.clean_node_modules"
  rm -rf node_modules
}

verify_npm_cache() {
  sanaka_log "doctor.verify_npm_cache"
  if npm cache verify >/dev/null 2>&1; then
    return 0
  fi

  sanaka_log "doctor.verify_npm_cache_failed"
  npm cache clean --force >/dev/null 2>&1 || true
}

install_dependencies() {
  sanaka_log "doctor.install_dependencies"
  if npm install; then
    return 0
  fi

  sanaka_log "doctor.install_retry_electron"
  repair_electron_cache
  if npm install; then
    return 0
  fi

  sanaka_log "doctor.install_retry_full"
  repair_full_node_modules
  npm install
}

run_repair_flow() {
  verify_npm_cache
  install_dependencies

  if [[ "$SKIP_BUILD" != "true" ]]; then
    sanaka_section "doctor.build_check"
    npm run build
  fi
}

print_menu() {
  printf '\n%s\n' "$(sanaka_t "doctor.title")"
  sanaka_printf_ln "doctor.menu_1"
  sanaka_printf_ln "doctor.menu_2"
  sanaka_printf_ln "doctor.menu_3"
  sanaka_printf_ln "doctor.menu_4"
  sanaka_printf_ln "doctor.menu_5"
  printf '\n'
}

run_menu() {
  local choice
  while true; do
    print_menu
    sanaka_printf "common.select_1_5"
    read -r choice || exit 0
    case "$choice" in
      1)
        test_and_offer_best_mirrors || true
        run_repair_flow
        sanaka_log "doctor.completed"
        return 0
        ;;
      2)
        test_and_offer_best_mirrors || true
        SKIP_BUILD="true"
        run_repair_flow
        sanaka_log "doctor.deps_completed"
        return 0
        ;;
      3)
        test_and_offer_best_mirrors
        ;;
      4)
        print_current_config
        ;;
      5)
        sanaka_log "common.exit"
        return 0
        ;;
      *)
        sanaka_log "common.invalid_1_5"
        ;;
    esac
  done
}

main() {
  sanaka_log "common.current_directory" "$ROOT_DIR"

  require_command git "$(sanaka_t "doctor.missing_git")"
  require_command node "$(sanaka_t "doctor.missing_node")"
  require_command npm "$(sanaka_t "doctor.missing_npm")"
  require_command curl "$(sanaka_t "doctor.missing_curl")"

  load_electron_version

  if [[ "$AUTO_MODE" == "true" ]]; then
    test_and_offer_best_mirrors || true
    run_repair_flow
    sanaka_log "doctor.completed"
    return 0
  fi

  if [[ "$MENU_MODE" == "true" || $# -eq 0 ]]; then
    run_menu
    return 0
  fi

  run_repair_flow
  sanaka_log "doctor.completed"
}

main "$@"
