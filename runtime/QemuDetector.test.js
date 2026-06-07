import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { QemuDetector } from './QemuDetector';

function touchExecutable(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, '#!/bin/sh\nexit 0\n');
  fs.chmodSync(filePath, 0o755);
}

describe('QemuDetector', () => {
  it('prefers bundled qemu binaries from the app resources path and detects all supported system targets', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sanaka-qemu-detector-'));
    const resourcesPath = path.join(tempRoot, 'Sanaka.app', 'Contents', 'Resources');
    const bundledBinDir = path.join(resourcesPath, 'qemu', 'bin');

    [
      'qemu-system-x86_64',
      'qemu-system-i386',
      'qemu-system-aarch64',
      'qemu-system-arm',
      'qemu-system-riscv64',
      'qemu-system-ppc',
      'qemu-system-ppc64',
      'qemu-img'
    ].forEach((name) => touchExecutable(path.join(bundledBinDir, name)));

    const detector = new QemuDetector({
      platform: 'darwin',
      arch: 'arm64',
      env: { PATH: '' },
      resourcesPath,
      execFileImpl: async () => ({ stdout: 'QEMU emulator version 11.0.1\n', stderr: '' })
    });

    const result = await detector.detect();

    expect(result.available).toBe(true);
    expect(result.availableSystemTargets).toEqual(['x86_64', 'aarch64', 'i386', 'arm', 'riscv64', 'ppc', 'ppc64']);
    expect(result.binaries.arm.path).toBe(path.join(bundledBinDir, 'qemu-system-arm'));
    expect(result.binaries.ppc64.path).toBe(path.join(bundledBinDir, 'qemu-system-ppc64'));
    expect(result.binaries.qemuImg.path).toBe(path.join(bundledBinDir, 'qemu-img'));
  });

  it('finds qemu from common Windows install folders even when PATH is empty', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sanaka-qemu-detector-win-'));
    const qemuDir = path.join(tempRoot, 'Program Files', 'qemu');

    ['qemu-system-x86_64.exe', 'qemu-img.exe'].forEach((name) => touchExecutable(path.join(qemuDir, name)));

    const detector = new QemuDetector({
      platform: 'win32',
      arch: 'x64',
      env: {
        PATH: '',
        PATHEXT: '.EXE;.CMD;.BAT;.COM',
        ProgramFiles: path.join(tempRoot, 'Program Files')
      },
      execFileImpl: async () => ({ stdout: 'QEMU emulator version 11.0.1\r\n', stderr: '' })
    });

    const result = await detector.detect();

    expect(result.available).toBe(true);
    expect(result.availableSystemTargets).toEqual(['x86_64']);
    expect(result.binaries.x86_64.path?.toLowerCase()).toBe(path.join(qemuDir, 'qemu-system-x86_64.exe').toLowerCase());
    expect(result.binaries.qemuImg.path?.toLowerCase()).toBe(path.join(qemuDir, 'qemu-img.exe').toLowerCase());
  });
});
