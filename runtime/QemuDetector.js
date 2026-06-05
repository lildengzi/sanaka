const fs = require('fs/promises');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const BINARY_CANDIDATES = {
  x86_64: 'qemu-system-x86_64',
  aarch64: 'qemu-system-aarch64',
  i386: 'qemu-system-i386',
  arm: 'qemu-system-arm',
  riscv64: 'qemu-system-riscv64',
  ppc: 'qemu-system-ppc',
  ppc64: 'qemu-system-ppc64',
  qemuImg: 'qemu-img'
};

function splitPathValue(value) {
  return String(value || '')
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getExecutableExtensions(platform, env) {
  if (platform !== 'win32') {
    return [''];
  }

  const pathext = String(env.PATHEXT || '.EXE;.CMD;.BAT;.COM');
  return pathext
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function isExecutable(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveBinary(binaryName, platform, env, searchRoots = []) {
  if (path.isAbsolute(binaryName) || binaryName.includes(path.sep)) {
    return (await isExecutable(binaryName)) ? binaryName : null;
  }

  const searchPaths = [
    ...searchRoots.filter(Boolean),
    ...splitPathValue(env.PATH)
  ];
  const extensions = getExecutableExtensions(platform, env);

  for (const searchPath of searchPaths) {
    for (const ext of extensions) {
      const suffix = platform === 'win32' || binaryName.toLowerCase().endsWith(ext.toLowerCase()) ? '' : ext;
      const candidate = path.join(searchPath, `${binaryName}${suffix}`);
      if (await isExecutable(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

async function readVersion(commandPath, execFileImpl) {
  try {
    const { stdout, stderr } = await execFileImpl(commandPath, ['--version']);
    const output = `${stdout || ''}\n${stderr || ''}`.trim();
    return output.split(/\r?\n/).find(Boolean) || null;
  } catch {
    return null;
  }
}

function inferAccelerators(platform) {
  if (platform === 'darwin') {
    return ['hvf', 'tcg'];
  }
  if (platform === 'linux') {
    return ['kvm', 'tcg'];
  }
  if (platform === 'win32') {
    return ['whpx', 'tcg'];
  }
  return ['tcg'];
}

function makeInstallHint(platform) {
  if (platform === 'darwin') {
    return 'Use the bundled QEMU in the packaged app, or install QEMU with Homebrew: brew install qemu';
  }
  if (platform === 'linux') {
    return 'Install QEMU from your distribution packages, for example: sudo apt install qemu-system qemu-utils';
  }
  if (platform === 'win32') {
    return 'Install QEMU and ensure the qemu-system binaries are available on PATH.';
  }
  return 'Install QEMU and ensure the qemu-system binaries are available on PATH.';
}

function makeBundledSearchRoots(options = {}) {
  const roots = [];
  const resourcesPath = options.resourcesPath || process.resourcesPath;

  if (typeof resourcesPath === 'string' && resourcesPath.trim()) {
    roots.push(path.join(resourcesPath, 'qemu', 'bin'));
  }

  for (const entry of options.searchRoots || []) {
    if (typeof entry === 'string' && entry.trim()) {
      roots.push(entry);
    }
  }

  return Array.from(new Set(roots.map((entry) => path.resolve(entry))));
}

class QemuDetector {
  constructor(options = {}) {
    this.platform = options.platform || process.platform;
    this.arch = options.arch || process.arch;
    this.env = options.env || process.env;
    this.execFileImpl = options.execFileImpl || execFileAsync;
    this.searchRoots = makeBundledSearchRoots(options);
  }

  async detect() {
    const binaries = {};

    for (const [key, binaryName] of Object.entries(BINARY_CANDIDATES)) {
      const resolvedPath = await resolveBinary(binaryName, this.platform, this.env, this.searchRoots);
      binaries[key] = {
        name: binaryName,
        found: Boolean(resolvedPath),
        path: resolvedPath,
        version: resolvedPath ? await readVersion(resolvedPath, this.execFileImpl) : null
      };
    }

    const availableSystemTargets = Object.entries(binaries)
      .filter(([key, entry]) => key !== 'qemuImg' && entry.found)
      .map(([key]) => key);

    return {
      checkedAt: new Date().toISOString(),
      platform: this.platform,
      arch: this.arch,
      available: availableSystemTargets.length > 0,
      availableSystemTargets,
      accelerators: inferAccelerators(this.platform),
      installHint: makeInstallHint(this.platform),
      binaries
    };
  }
}

module.exports = {
  QemuDetector,
  BINARY_CANDIDATES,
  inferAccelerators
};
