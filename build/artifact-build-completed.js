const fs = require('node:fs/promises');
const path = require('node:path');
const { buildArtifactFileName } = require('./artifact-names');

exports.default = async function artifactBuildCompleted(context) {
  const filePath = context?.file;
  if (!filePath) {
    return;
  }

  const ext = path.extname(filePath).replace(/^\./, '');
  if (!ext) {
    return;
  }

  const electronPlatformName = context.packager?.platform?.nodeName || context.packager?.platform?.buildConfigurationKey || '';
  const archName = context.arch == null
    ? ''
    : (context.packager?.expandMacro ? context.packager.expandMacro('${arch}', context.arch) : String(context.arch));

  const nextFileName = buildArtifactFileName({
    platform: electronPlatformName,
    arch: archName,
    ext
  });

  if (!nextFileName || path.basename(filePath) === nextFileName) {
    return;
  }

  const nextPath = path.join(path.dirname(filePath), nextFileName);
  await fs.rm(nextPath, { force: true }).catch(() => undefined);
  await fs.rename(filePath, nextPath);
  context.file = nextPath;
};
