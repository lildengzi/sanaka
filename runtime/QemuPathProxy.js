const crypto = require('crypto');
const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const { execFileSync } = require('child_process');

function hasNonAsciiCharacters(value) {
  return /[^\x00-\x7F]/.test(String(value || ''));
}

function isAsciiOnly(value) {
  return !hasNonAsciiCharacters(value);
}

function normalizeQemuProxyPath(filePath) {
  return String(filePath || '').replace(/\\/g, '/');
}

function makeProxyFileName(slot, sourcePath) {
  const digest = crypto.createHash('sha1').update(String(sourcePath || '')).digest('hex').slice(0, 10);
  const extension = path.win32.extname(String(sourcePath || ''));
  const safeExtension = /^[.A-Za-z0-9_-]{0,16}$/.test(extension) ? extension : '';
  return `${slot}-${digest}${safeExtension}`;
}

function normalizeWindowsComparisonPath(value) {
  return String(value || '').replace(/\//g, '\\').toLowerCase();
}

async function pathExists(fsPromisesImpl, targetPath) {
  try {
    await fsPromisesImpl.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

class QemuPathProxy {
  constructor(options = {}) {
    this.platform = options.platform || process.platform;
    this.fs = options.fs || fs;
    this.fsPromises = options.fsPromises || fsPromises;
    this.path = options.pathModule || path;
    this.execFileSync = options.execFileSyncImpl || execFileSync;
  }

  async resolveMachinePaths({ machine, runtimeDir, log }) {
    if (this.platform !== 'win32') {
      return {
        machine,
        mappings: []
      };
    }

    const nextMachine = structuredClone(machine);
    const mappings = [];

    for (let index = 0; index < (nextMachine.disks || []).length; index += 1) {
      const disk = nextMachine.disks[index];
      const result = await this.resolveLaunchPath({
        sourcePath: disk.path,
        runtimeDir,
        slot: `disk-${index}`,
        log
      });
      nextMachine.disks[index] = {
        ...disk,
        path: result.qemuPath
      };
      mappings.push(result);
    }

    if (nextMachine.media?.iso) {
      const result = await this.resolveLaunchPath({
        sourcePath: nextMachine.media.iso,
        runtimeDir,
        slot: 'iso-0',
        log
      });
      nextMachine.media.iso = result.qemuPath;
      mappings.push(result);
    }

    if (nextMachine.media?.floppy) {
      const result = await this.resolveLaunchPath({
        sourcePath: nextMachine.media.floppy,
        runtimeDir,
        slot: 'floppy-0',
        log
      });
      nextMachine.media.floppy = result.qemuPath;
      mappings.push(result);
    }

    if (nextMachine.advanced?.firmware?.code_path) {
      const result = await this.resolveLaunchPath({
        sourcePath: nextMachine.advanced.firmware.code_path,
        runtimeDir,
        slot: 'firmware-code',
        log
      });
      nextMachine.advanced.firmware.code_path = result.qemuPath;
      mappings.push(result);
    }

    if (nextMachine.advanced?.firmware?.vars_path) {
      const result = await this.resolveLaunchPath({
        sourcePath: nextMachine.advanced.firmware.vars_path,
        runtimeDir,
        slot: 'firmware-vars',
        log
      });
      nextMachine.advanced.firmware.vars_path = result.qemuPath;
      mappings.push(result);
    }

    return {
      machine: nextMachine,
      mappings
    };
  }

  async resolveLaunchPath({ sourcePath, runtimeDir, slot, log }) {
    const originalPath = String(sourcePath || '').trim();
    if (!originalPath || this.platform !== 'win32') {
      return {
        sourcePath: originalPath,
        qemuPath: originalPath,
        strategy: 'direct'
      };
    }

    const normalizedSourcePath = this.path.win32.normalize(originalPath);
    if (!hasNonAsciiCharacters(normalizedSourcePath)) {
      const directPath = normalizeQemuProxyPath(normalizedSourcePath);
      this.#log(log, `${slot}: direct -> ${directPath}`);
      return {
        sourcePath: normalizedSourcePath,
        qemuPath: directPath,
        strategy: 'direct'
      };
    }

    const shortPath = this.#tryGetShortPath(normalizedSourcePath);
    if (shortPath && isAsciiOnly(shortPath)) {
      const qemuPath = normalizeQemuProxyPath(shortPath);
      this.#log(log, `${slot}: short-path -> ${qemuPath}`);
      return {
        sourcePath: normalizedSourcePath,
        qemuPath,
        strategy: 'short-path'
      };
    }

    const proxyRoot = this.path.join(runtimeDir, 'path-proxy');
    await this.fsPromises.mkdir(proxyRoot, { recursive: true });

    const baseName = this.path.win32.basename(normalizedSourcePath);
    const parentDir = this.path.win32.dirname(normalizedSourcePath);

    if (isAsciiOnly(baseName)) {
      const proxyDir = this.path.join(proxyRoot, `${slot}-dir`);
      try {
        await this.#replaceExistingProxy(proxyDir);
        await this.fsPromises.symlink(parentDir, proxyDir, 'junction');
        const qemuPath = normalizeQemuProxyPath(this.path.join(proxyDir, baseName));
        await this.#assertProxyResolvesToSource(qemuPath, normalizedSourcePath, 'runtime-junction');
        this.#log(log, `${slot}: runtime-junction -> ${qemuPath}`);
        return {
          sourcePath: normalizedSourcePath,
          qemuPath,
          strategy: 'runtime-junction'
        };
      } catch (error) {
        this.#log(log, `${slot}: runtime-junction failed -> ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const proxyFilePath = this.path.join(proxyRoot, makeProxyFileName(slot, normalizedSourcePath));
    if (this.#isSameWindowsVolume(normalizedSourcePath, proxyFilePath)) {
      try {
        await this.#replaceExistingProxy(proxyFilePath);
        await this.fsPromises.link(normalizedSourcePath, proxyFilePath);
        const qemuPath = normalizeQemuProxyPath(proxyFilePath);
        await this.#assertHardlinkMatchesSource(proxyFilePath, normalizedSourcePath);
        this.#log(log, `${slot}: runtime-hardlink -> ${qemuPath}`);
        return {
          sourcePath: normalizedSourcePath,
          qemuPath,
          strategy: 'runtime-hardlink'
        };
      } catch (error) {
        this.#log(log, `${slot}: runtime-hardlink failed -> ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    try {
      await this.#replaceExistingProxy(proxyFilePath);
      await this.fsPromises.symlink(normalizedSourcePath, proxyFilePath, 'file');
      const qemuPath = normalizeQemuProxyPath(proxyFilePath);
      await this.#assertProxyResolvesToSource(qemuPath, normalizedSourcePath, 'runtime-symlink');
      this.#log(log, `${slot}: runtime-symlink -> ${qemuPath}`);
      return {
        sourcePath: normalizedSourcePath,
        qemuPath,
        strategy: 'runtime-symlink'
      };
    } catch (error) {
      this.#log(log, `${slot}: runtime-symlink failed -> ${error instanceof Error ? error.message : String(error)}`);
    }

    const fallbackPath = normalizeQemuProxyPath(normalizedSourcePath);
    this.#log(log, `${slot}: fallback-original -> ${fallbackPath}`);
    return {
      sourcePath: normalizedSourcePath,
      qemuPath: fallbackPath,
      strategy: 'fallback-original'
    };
  }

  #tryGetShortPath(targetPath) {
    if (targetPath.includes('"')) {
      return null;
    }

    try {
      const output = this.execFileSync('cmd.exe', ['/d', '/s', '/c', `for %I in ("${targetPath}") do @echo %~fsI`], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      });
      const value = String(output || '').trim();
      return value || null;
    } catch {
      return null;
    }
  }

  #isSameWindowsVolume(leftPath, rightPath) {
    const leftRoot = this.path.win32.parse(leftPath).root.toLowerCase();
    const rightRoot = this.path.win32.parse(rightPath).root.toLowerCase();
    return Boolean(leftRoot) && leftRoot === rightRoot;
  }

  async #replaceExistingProxy(targetPath) {
    if (!(await pathExists(this.fsPromises, targetPath))) {
      return;
    }

    const stats = await this.fsPromises.lstat(targetPath);
    if (stats.isDirectory() && !stats.isSymbolicLink()) {
      await this.fsPromises.rm(targetPath, { recursive: true, force: true });
      return;
    }
    await this.fsPromises.unlink(targetPath);
  }

  async #assertProxyResolvesToSource(proxyPath, sourcePath, strategy) {
    const realpathImpl = this.fsPromises.realpath;
    if (!realpathImpl) {
      return;
    }

    const resolvedTarget =
      typeof realpathImpl.native === 'function'
        ? await realpathImpl.native(proxyPath)
        : await realpathImpl(proxyPath);
    if (normalizeWindowsComparisonPath(resolvedTarget) !== normalizeWindowsComparisonPath(sourcePath)) {
      throw new Error(`${strategy} resolved to a different file.`);
    }
  }

  async #assertHardlinkMatchesSource(proxyPath, sourcePath) {
    if (typeof this.fsPromises.stat !== 'function') {
      return;
    }

    const [sourceStat, proxyStat] = await Promise.all([
      this.fsPromises.stat(sourcePath),
      this.fsPromises.stat(proxyPath)
    ]);

    const sameSize = Number(sourceStat.size) === Number(proxyStat.size);
    const inodeComparable = Number(sourceStat.ino) > 0 && Number(proxyStat.ino) > 0;
    const sameIdentity = inodeComparable
      ? sourceStat.ino === proxyStat.ino
      : Number(proxyStat.nlink || 0) > 1 && sameSize;

    if (!sameIdentity) {
      throw new Error('runtime-hardlink resolved to a different file.');
    }
  }

  #log(log, message) {
    if (typeof log === 'function') {
      log(`[path-proxy] ${message}`);
    }
  }
}

module.exports = {
  QemuPathProxy,
  hasNonAsciiCharacters,
  normalizeQemuProxyPath
};
