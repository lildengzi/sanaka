#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "这里不是 Git 仓库。"
  exit 1
fi

BRANCH="$(git branch --show-current)"

if [[ -z "${BRANCH}" ]]; then
  echo "当前不在分支上，先切回一个分支再推。"
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  MESSAGE="${1:-Update}"
  git add -A
  git commit -m "$MESSAGE"
else
  echo "没有本地改动，直接推送。"
fi

echo "推送到 origin/${BRANCH} ..."
git push origin "$BRANCH"
echo "完成。"
