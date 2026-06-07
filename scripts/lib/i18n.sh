#!/usr/bin/env bash

if [[ -n "${SANAKA_I18N_LOADED:-}" ]]; then
  return 0
fi

SANAKA_I18N_LOADED="1"

sanaka_clear_i18n_messages() {
  local var_name
  while IFS= read -r var_name; do
    unset "$var_name"
  done < <(compgen -A variable SANAKA_I18N_ || true)
}

sanaka_i18n_put() {
  local key="$1"
  local value="$2"
  local var_name
  var_name="$(sanaka_i18n_var_name "$key")"
  printf -v "$var_name" '%s' "$value"
}

sanaka_i18n_var_name() {
  local key="$1"
  key="${key//./_}"
  key="${key//-/_}"
  printf 'SANAKA_I18N_%s' "$key"
}

sanaka_detect_lang() {
  local raw_lang="${SANAKA_LANG:-${LC_ALL:-${LC_MESSAGES:-${LANG:-}}}}"
  raw_lang="${raw_lang%%.*}"
  raw_lang="${raw_lang%%@*}"
  raw_lang="${raw_lang//_/-}"

  case "$raw_lang" in
    zh|zh-*|cmn|cmn-*)
      printf '%s\n' "zh-CN"
      ;;
    en|en-*|"")
      printf '%s\n' "en-US"
      ;;
    *)
      printf '%s\n' "en-US"
      ;;
  esac
}

sanaka_load_i18n() {
  local lib_dir locale_dir selected_lang
  lib_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  locale_dir="$lib_dir/../locales"
  selected_lang="$(sanaka_detect_lang)"

  sanaka_clear_i18n_messages
  source "$locale_dir/en-US.sh"
  if [[ "$selected_lang" != "en-US" && -f "$locale_dir/$selected_lang.sh" ]]; then
    source "$locale_dir/$selected_lang.sh"
  fi

  export SANAKA_ACTIVE_LANG="$selected_lang"
}

sanaka_set_lang() {
  local next_lang="$1"
  export SANAKA_LANG="$next_lang"
  sanaka_load_i18n
}

sanaka_t() {
  local key="$1"
  local var_name
  var_name="$(sanaka_i18n_var_name "$key")"
  if [[ -n "${!var_name+x}" ]]; then
    printf '%s' "${!var_name}"
  else
    printf '%s' "$key"
  fi
}

sanaka_printf() {
  local key="$1"
  shift
  printf "$(sanaka_t "$key")" "$@"
}

sanaka_printf_ln() {
  local key="$1"
  shift
  printf "$(sanaka_t "$key")\n" "$@"
}

sanaka_log() {
  local key="$1"
  shift
  sanaka_printf_ln "$key" "$@"
}

sanaka_section() {
  local key="$1"
  shift
  printf '\n== '
  sanaka_printf "$key" "$@"
  printf ' ==\n'
}
