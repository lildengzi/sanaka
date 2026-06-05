const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const SUPPORTED_IMAGE_FORMATS = ['qcow2', 'qed', 'qcow', 'vmdk', 'vpc', 'vdi', 'raw'];
const SIZE_UNITS = {
  MB: 'M',
  GB: 'G'
};

function normalizeImageFormat(format) {
  const normalized = String(format || '').trim().toLowerCase();
  if (normalized === 'img') return 'raw';
  if (normalized === 'vhd') return 'vpc';
  return normalized;
}

function ensureSupportedFormat(format) {
  const normalized = normalizeImageFormat(format);
  if (!SUPPORTED_IMAGE_FORMATS.includes(normalized)) {
    throw new Error(`Unsupported disk image format: ${format}`);
  }
  return normalized;
}

function ensureSizeUnit(unit) {
  const normalized = String(unit || '').trim().toUpperCase();
  if (!Object.prototype.hasOwnProperty.call(SIZE_UNITS, normalized)) {
    throw new Error(`Unsupported size unit: ${unit}`);
  }
  return normalized;
}

function formatSizeArgument(size, unit) {
  const numericSize = Number(size);
  if (!Number.isFinite(numericSize) || numericSize <= 0) {
    throw new Error('Disk image size must be a positive number.');
  }
  const normalizedUnit = ensureSizeUnit(unit);
  return `${numericSize}${SIZE_UNITS[normalizedUnit]}`;
}

function buildDefaultFileName(name, format) {
  const normalizedName = String(name || '').trim();
  if (!normalizedName) {
    throw new Error('Disk image name is required.');
  }
  const ext = format === 'raw' ? 'img' : format;
  return normalizedName.toLowerCase().endsWith(`.${ext}`) ? normalizedName : `${normalizedName}.${ext}`;
}

function buildCreateOptions(options = {}) {
  const parts = [];
  if (options.backingFile) {
    parts.push(`backing_file=${options.backingFile}`);
  }
  if (options.backingFormat) {
    parts.push(`backing_fmt=${ensureSupportedFormat(options.backingFormat)}`);
  }
  if (options.preallocate) {
    parts.push('preallocation=full');
  }
  return parts;
}

function buildConvertArguments(request) {
  const args = ['convert', '-O', ensureSupportedFormat(request.targetFormat)];
  const sourceFormat = request.sourceFormat ? ensureSupportedFormat(request.sourceFormat) : null;

  if (sourceFormat) {
    args.push('-f', sourceFormat);
  }
  if (request.options?.compression) {
    args.push('-c');
  }
  if (request.options?.sparse === false) {
    args.push('-S', '0');
  } else if (request.options?.sparse === true) {
    args.push('-S', '4k');
  }

  const optionParts = [];
  if (request.options?.backingFile) {
    optionParts.push(`backing_file=${request.options.backingFile}`);
  }
  if (request.options?.backingFormat) {
    optionParts.push(`backing_fmt=${ensureSupportedFormat(request.options.backingFormat)}`);
  }
  if (request.options?.preallocate) {
    optionParts.push('preallocation=full');
  }
  if (optionParts.length > 0) {
    args.push('-o', optionParts.join(','));
  }

  args.push(path.resolve(request.sourcePath), path.resolve(request.targetPath));
  return args;
}

function supportsCompression(format) {
  return format === 'qcow2' || format === 'qcow';
}

function extractBackingFile(info) {
  return info['full-backing-filename'] || info['backing-filename'] || info.backingFile || undefined;
}

class DiskImageService {
  constructor(options = {}) {
    this.getEnvironment = options.getEnvironment || (async () => null);
    this.execFileImpl = options.execFileImpl || execFileAsync;
    this.fs = options.fsImpl || fs;
    this.tempRoot = options.tempRoot || os.tmpdir();
  }

  async getInfo(filePath) {
    const absolutePath = path.resolve(filePath);
    const output = await this.#runQemuImg(['info', '--output=json', absolutePath]);
    const parsed = JSON.parse(output || '{}');
    const stats = await this.fs.stat(absolutePath);

    return {
      path: absolutePath,
      format: ensureSupportedFormat(parsed.format),
      virtualSize: Number(parsed['virtual-size'] || 0),
      actualSize: Number(parsed['actual-size'] || stats.size || 0),
      backingFile: extractBackingFile(parsed)
    };
  }

  async create(request) {
    try {
      const format = ensureSupportedFormat(request.format);
      const targetPath = await this.#resolveCreateTargetPath(request, format);
      const args = ['create', '-f', format];
      const optionParts = buildCreateOptions(request.options);
      if (optionParts.length > 0) {
        args.push('-o', optionParts.join(','));
      }
      args.push(targetPath, formatSizeArgument(request.size, request.unit));

      await this.#runQemuImg(args);
      return {
        ok: true,
        path: targetPath,
        info: await this.getInfo(targetPath)
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to create disk image.'
      };
    }
  }

  async resize(request) {
    try {
      const absolutePath = path.resolve(request.path);
      const args = ['resize'];
      if (request.shrink) {
        args.push('--shrink');
      }
      args.push(absolutePath, formatSizeArgument(request.newSize, request.unit));
      await this.#runQemuImg(args);
      return {
        ok: true,
        path: absolutePath,
        info: await this.getInfo(absolutePath)
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to resize disk image.'
      };
    }
  }

  async convert(request) {
    try {
      if (!request.sourcePath) {
        throw new Error('Source disk image path is required.');
      }

      const sourcePath = path.resolve(request.sourcePath);
      const targetFormat = ensureSupportedFormat(request.targetFormat);
      const targetPath = request.targetPath
        ? path.resolve(request.targetPath)
        : path.join(path.dirname(sourcePath), `${path.parse(sourcePath).name}.${targetFormat === 'raw' ? 'img' : targetFormat}`);

      if (sourcePath === targetPath) {
        throw new Error('Source and target paths must be different for format conversion.');
      }

      await this.fs.mkdir(path.dirname(targetPath), { recursive: true });
      await this.#runQemuImg(
        buildConvertArguments({
          ...request,
          targetFormat,
          sourcePath,
          targetPath
        })
      );

      return {
        ok: true,
        path: targetPath,
        info: await this.getInfo(targetPath)
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to convert disk image.'
      };
    }
  }

  async reclaimSpace(filePath) {
    const absolutePath = path.resolve(filePath);
    const beforeStats = await this.fs.stat(absolutePath);
    const imageInfo = await this.getInfo(absolutePath);
    const tempDirectory = await this.fs.mkdtemp(path.join(this.tempRoot, 'sanaka-reclaim-'));
    const tempOutputPath = path.join(tempDirectory, path.basename(absolutePath));
    const backupPath = path.join(path.dirname(absolutePath), `${path.basename(absolutePath)}.sanaka-backup`);

    try {
      const convertResult = await this.convert({
        sourcePath: absolutePath,
        targetPath: tempOutputPath,
        targetFormat: imageInfo.format,
        options: {
          compression: supportsCompression(imageInfo.format),
          sparse: true
        }
      });

      if (!convertResult.ok) {
        throw new Error(convertResult.error || 'Failed to reclaim unused space.');
      }

      await this.fs.rename(absolutePath, backupPath);
      try {
        await this.fs.rename(tempOutputPath, absolutePath);
        await this.fs.rm(backupPath, { force: true });
      } catch (error) {
        await this.fs.rename(backupPath, absolutePath).catch(() => null);
        throw error;
      }

      const afterStats = await this.fs.stat(absolutePath);
      return {
        ok: true,
        path: absolutePath,
        reclaimedBytes: Math.max(0, beforeStats.size - afterStats.size),
        info: await this.getInfo(absolutePath)
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to reclaim unused space.'
      };
    } finally {
      await this.fs.rm(tempDirectory, { recursive: true, force: true }).catch(() => null);
    }
  }

  async #resolveCreateTargetPath(request, format) {
    if (request.path) {
      const targetPath = path.resolve(request.path);
      await this.fs.mkdir(path.dirname(targetPath), { recursive: true });
      return targetPath;
    }

    if (!request.directory) {
      throw new Error('Disk image directory is required when no explicit path is provided.');
    }

    const fileName = buildDefaultFileName(request.name, format);
    const directory = path.resolve(request.directory);
    await this.fs.mkdir(directory, { recursive: true });
    return path.join(directory, fileName);
  }

  async #runQemuImg(args) {
    const qemuImgPath = await this.#getQemuImgPath();
    const { stdout, stderr } = await this.execFileImpl(qemuImgPath, args);
    return `${stdout || ''}${stderr || ''}`.trim();
  }

  async #getQemuImgPath() {
    const environment = await this.getEnvironment();
    const qemuImg = environment?.binaries?.qemuImg;
    if (!qemuImg?.found || !qemuImg.path) {
      throw new Error('qemu-img is not available. Please install QEMU first.');
    }
    return qemuImg.path;
  }
}

module.exports = {
  DiskImageService,
  SUPPORTED_IMAGE_FORMATS,
  normalizeImageFormat,
  formatSizeArgument,
  supportsCompression
};
