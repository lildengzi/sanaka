#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
REPO_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
TARGET_ISO="$REPO_DIR/sanaka-tools.iso"

printf '%s\n' "当前目录: $REPO_DIR"

if [ -f "$TARGET_ISO" ]; then
  printf '%s\n' "删除旧的 sanaka-tools.iso ..."
  rm -f "$TARGET_ISO"
fi

printf '%s\n' "重新生成 sanaka-tools.iso ..."

node <<'EOF'
const fs = require('fs/promises');
const path = require('path');
const { IsoImageService } = require(path.join(process.cwd(), 'runtime/IsoImageService'));
const { SanakaToolsService } = require(path.join(process.cwd(), 'runtime/SanakaToolsService'));

async function main() {
  const repoDir = process.cwd();
  const outputPath = path.join(repoDir, 'sanaka-tools.iso');
  const tmpRoot = path.join(repoDir, '.tmp-sanaka-tools-userdata');

  const isoService = new IsoImageService({ platform: process.platform });
  const service = new SanakaToolsService({
    app: {
      getPath(name) {
        if (name === 'userData') {
          return tmpRoot;
        }
        return repoDir;
      },
      getAppPath() {
        return repoDir;
      }
    },
    isoService
  });

  const generatedPath = await service.ensureBundledIso();
  await fs.copyFile(generatedPath, outputPath);
  console.log(outputPath);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
EOF

printf '%s\n' "完成: $TARGET_ISO"
