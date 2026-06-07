#!/usr/bin/env bash

set -euo pipefail

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
  section "当前镜像配置"
  log "npm registry: ${NPM_REGISTRY:-<未设置>}"
  log "electron mirror: ${ELECTRON_MIRROR_URL:-<未设置>}"
  if [[ -n "$CURRENT_ELECTRON_VERSION" ]]; then
    log "electron version: $CURRENT_ELECTRON_VERSION"
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
    printf '测速中: %s ... ' "$label" >&2
    if [[ "$mode" == "npm" ]]; then
      if seconds="$(probe_npm_registry "$url")"; then
        printf '%ss\n' "$seconds" >&2
      else
        printf '失败\n' >&2
        continue
      fi
    else
      if seconds="$(probe_electron_mirror "$url")"; then
        printf '%ss\n' "$seconds" >&2
      else
        printf '失败\n' >&2
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

  section "写入镜像配置"
  npm config set registry "$(trim_trailing_slash "$npm_registry")"
  write_user_npmrc_key "electron_mirror" "$(normalize_with_trailing_slash "$electron_mirror")"
  export ELECTRON_MIRROR="$(normalize_with_trailing_slash "$electron_mirror")"
  log "已设置 npm registry: $(trim_trailing_slash "$npm_registry")"
  log "已设置 electron mirror: $(normalize_with_trailing_slash "$electron_mirror")"
}

confirm() {
  local prompt="$1"
  local answer
  printf '%s [Y/n] ' "$prompt"
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

  section "测速 npm 镜像"
  npm_result="$(pick_fastest_mirror "npm" "${NPM_CANDIDATES[@]}" || true)"
  if [[ -z "$npm_result" ]]; then
    log "没有测到可用的 npm registry。"
    return 1
  fi
  best_npm="${npm_result%%|*}"
  best_npm_time="${npm_result#*|}"

  section "测速 Electron 镜像"
  electron_result="$(pick_fastest_mirror "electron" "${ELECTRON_CANDIDATES[@]}" || true)"
  if [[ -z "$electron_result" ]]; then
    log "没有测到可用的 Electron 镜像。"
    return 1
  fi
  best_electron="${electron_result%%|*}"
  best_electron_time="${electron_result#*|}"

  section "测速结果"
  log "最快 npm registry: $best_npm (${best_npm_time}s)"
  log "最快 Electron mirror: $best_electron (${best_electron_time}s)"

  if [[ "$AUTO_MODE" == "true" ]]; then
    apply_mirrors "$best_npm" "$best_electron"
    return 0
  fi

  if confirm "是否切换到这组镜像？"; then
    apply_mirrors "$best_npm" "$best_electron"
  else
    log "已取消写入镜像配置。"
  fi
}

repair_electron_cache() {
  log "清理 Electron 相关缓存..."
  rm -rf node_modules/electron node_modules/@electron node_modules/fs-extra
  rm -rf "$HOME/.cache/electron" "$HOME/.npm/_electron"
}

repair_full_node_modules() {
  log "整包清理 node_modules..."
  rm -rf node_modules
}

verify_npm_cache() {
  log "检查 npm 缓存..."
  if npm cache verify >/dev/null 2>&1; then
    return 0
  fi

  log "npm 缓存校验失败，强制清理..."
  npm cache clean --force >/dev/null 2>&1 || true
}

install_dependencies() {
  log "安装/修复依赖..."
  if npm install; then
    return 0
  fi

  log "首次 npm install 失败，尝试修复 Electron 相关依赖后重试..."
  repair_electron_cache
  if npm install; then
    return 0
  fi

  log "第二次 npm install 仍失败，清空 node_modules 后最后重试一次..."
  repair_full_node_modules
  npm install
}

run_repair_flow() {
  verify_npm_cache
  install_dependencies

  if [[ "$SKIP_BUILD" != "true" ]]; then
    section "构建检查"
    npm run build
  fi
}

print_menu() {
  cat <<'EOF'

Sanaka Doctor
1. 一键检查、修复并构建
2. 只检查并修复依赖
3. 测试镜像速度并切换
4. 查看当前镜像配置
5. 退出

EOF
}

run_menu() {
  local choice
  while true; do
    print_menu
    printf '请选择 [1-5]: '
    read -r choice || exit 0
    case "$choice" in
      1)
        test_and_offer_best_mirrors || true
        run_repair_flow
        log "doctor 完成。"
        return 0
        ;;
      2)
        test_and_offer_best_mirrors || true
        SKIP_BUILD="true"
        run_repair_flow
        log "依赖修复完成。"
        return 0
        ;;
      3)
        test_and_offer_best_mirrors
        ;;
      4)
        print_current_config
        ;;
      5)
        log "已退出。"
        return 0
        ;;
      *)
        log "请输入 1 到 5。"
        ;;
    esac
  done
}

main() {
  log "当前目录: $ROOT_DIR"

  require_command git "没找到 git。请先安装 Git。"
  require_command node "没找到 node。请先安装 Node.js。"
  require_command npm "没找到 npm。请先安装 Node.js。"
  require_command curl "没找到 curl。请先安装 curl。"

  load_electron_version

  if [[ "$AUTO_MODE" == "true" ]]; then
    test_and_offer_best_mirrors || true
    run_repair_flow
    log "doctor 完成。"
    return 0
  fi

  if [[ "$MENU_MODE" == "true" || $# -eq 0 ]]; then
    run_menu
    return 0
  fi

  run_repair_flow
  log "doctor 完成。"
}

main "$@"
