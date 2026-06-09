const packageJson = require('../package.json');

function normalizeVersion(version) {
  return String(version || '0.0.0').trim().replace(/-/g, '');
}

function normalizePlatform(platform) {
  switch (String(platform || '').toLowerCase()) {
    case 'darwin':
    case 'mac':
    case 'macos':
      return 'macos';
    case 'win':
    case 'win32':
    case 'windows':
      return 'win';
    case 'linux':
      return 'linux';
    default:
      return String(platform || '').toLowerCase();
  }
}

function normalizeArch(platform, arch) {
  const normalizedPlatform = normalizePlatform(platform);
  const normalizedArch = String(arch || '').toLowerCase();

  if (normalizedPlatform === 'macos') {
    if (normalizedArch === 'arm64' || normalizedArch === 'aarch64') {
      return 'aarch64';
    }
    if (normalizedArch === 'x64' || normalizedArch === 'x86_64') {
      return 'x64';
    }
  }

  if (normalizedPlatform === 'linux') {
    if (normalizedArch === 'x64' || normalizedArch === 'x86_64') {
      return 'amd64';
    }
    if (normalizedArch === 'arm64' || normalizedArch === 'aarch64') {
      return 'aarch64';
    }
  }

  if (normalizedPlatform === 'win') {
    if (normalizedArch === 'x64' || normalizedArch === 'x86_64') {
      return 'x64';
    }
    if (normalizedArch === 'ia32' || normalizedArch === 'x86') {
      return 'x86';
    }
    if (normalizedArch === 'arm64' || normalizedArch === 'aarch64') {
      return 'arm64';
    }
  }

  return normalizedArch || 'unknown';
}

function buildArtifactBaseName(options = {}) {
  const version = normalizeVersion(options.version || packageJson.version);
  const platform = normalizePlatform(options.platform);
  const arch = normalizeArch(platform, options.arch);
  return `sanaka-${version}-${platform}-${arch}`;
}

function buildArtifactFileName(options = {}) {
  const ext = String(options.ext || '').replace(/^\./, '');
  const baseName = buildArtifactBaseName(options);
  return ext ? `${baseName}.${ext}` : baseName;
}

function printUsageAndExit() {
  console.error('Usage: node build/artifact-names.js <base|file> <platform> <arch> [ext]');
  process.exit(1);
}

if (require.main === module) {
  const [, , mode, platform, arch, ext] = process.argv;
  if (!mode || !platform || !arch) {
    printUsageAndExit();
  }

  if (mode === 'base') {
    console.log(buildArtifactBaseName({ platform, arch }));
  } else if (mode === 'file') {
    if (!ext) {
      printUsageAndExit();
    }
    console.log(buildArtifactFileName({ platform, arch, ext }));
  } else {
    printUsageAndExit();
  }
}

module.exports = {
  normalizeVersion,
  normalizePlatform,
  normalizeArch,
  buildArtifactBaseName,
  buildArtifactFileName
};
