#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "当前目录: $ROOT_DIR"

if ! command -v git >/dev/null 2>&1; then
  echo "没找到 git。请先安装 Git。"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "没找到 npm。请先安装 Node.js。"
  exit 1
fi

echo "拉取远程最新代码..."
git fetch origin
git reset --hard origin/main

echo "进入 doctor 自动检查与修复..."
sh "$ROOT_DIR/scripts/doctor.sh" --auto

echo "完成。现在可以运行: npm start"
