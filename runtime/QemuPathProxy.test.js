import path from 'path';
import { describe, expect, it, vi } from 'vitest';
import { QemuPathProxy, hasNonAsciiCharacters, normalizeQemuProxyPath } from './QemuPathProxy';

function createFsPromisesStub() {
  return {
    mkdir: vi.fn(async () => undefined),
    access: vi.fn(async () => {
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    }),
    lstat: vi.fn(async () => ({
      isDirectory: () => false,
      isSymbolicLink: () => true
    })),
    rm: vi.fn(async () => undefined),
    unlink: vi.fn(async () => undefined),
    link: vi.fn(async () => undefined),
    symlink: vi.fn(async () => undefined),
    realpath: vi.fn(async (targetPath) => String(targetPath)),
    stat: vi.fn(async (targetPath) => ({
      size: String(targetPath).includes('disk-2-') ? 1024 : 1024,
      ino: String(targetPath).includes('disk-2-') ? 77 : 77,
      nlink: 2
    }))
  };
}

describe('QemuPathProxy', () => {
  it('detects non-ascii paths and normalizes qemu proxy slashes', () => {
    expect(hasNonAsciiCharacters('G:\\Downloads\\小叉屁\\xp.qcow2')).toBe(true);
    expect(normalizeQemuProxyPath('G:\\Downloads\\小叉屁\\xp.qcow2')).toBe('G:/Downloads/小叉屁/xp.qcow2');
  });

  it('passes through ascii windows paths directly', async () => {
    const fsPromisesStub = createFsPromisesStub();
    const proxy = new QemuPathProxy({
      platform: 'win32',
      pathModule: path.win32,
      fsPromises: fsPromisesStub,
      execFileSyncImpl: vi.fn()
    });

    const result = await proxy.resolveLaunchPath({
      sourcePath: 'G:\\Downloads\\78\\Disks\\xp.qcow2',
      runtimeDir: 'C:\\Sanaka\\runtime\\vm-1',
      slot: 'disk-0'
    });

    expect(result.strategy).toBe('direct');
    expect(result.qemuPath).toBe('G:/Downloads/78/Disks/xp.qcow2');
    expect(fsPromisesStub.symlink).not.toHaveBeenCalled();
    expect(fsPromisesStub.link).not.toHaveBeenCalled();
  });

  it('prefers a short path when one is available', async () => {
    const fsPromisesStub = createFsPromisesStub();
    const execFileSyncImpl = vi.fn(() => 'G:\\DOWNLO~1\\XIAOCH~1\\XP.QCOW2\r\n');
    const proxy = new QemuPathProxy({
      platform: 'win32',
      pathModule: path.win32,
      fsPromises: fsPromisesStub,
      execFileSyncImpl
    });

    const result = await proxy.resolveLaunchPath({
      sourcePath: 'G:\\Downloads\\小叉屁\\xp.qcow2',
      runtimeDir: 'C:\\Sanaka\\runtime\\vm-1',
      slot: 'disk-1'
    });

    expect(result.strategy).toBe('short-path');
    expect(result.qemuPath).toBe('G:/DOWNLO~1/XIAOCH~1/XP.QCOW2');
    expect(fsPromisesStub.symlink).not.toHaveBeenCalled();
  });

  it('falls back to a runtime junction when the basename is ascii', async () => {
    const fsPromisesStub = createFsPromisesStub();
    fsPromisesStub.realpath.mockResolvedValueOnce('G:\\Downloads\\小叉屁\\xp.qcow2');
    const proxy = new QemuPathProxy({
      platform: 'win32',
      pathModule: path.win32,
      fsPromises: fsPromisesStub,
      execFileSyncImpl: vi.fn(() => '')
    });

    const result = await proxy.resolveLaunchPath({
      sourcePath: 'G:\\Downloads\\小叉屁\\xp.qcow2',
      runtimeDir: 'C:\\Sanaka\\runtime\\vm-1',
      slot: 'disk-1'
    });

    expect(result.strategy).toBe('runtime-junction');
    expect(fsPromisesStub.symlink).toHaveBeenCalledWith('G:\\Downloads\\小叉屁', 'C:\\Sanaka\\runtime\\vm-1\\path-proxy\\disk-1-dir', 'junction');
    expect(result.qemuPath).toBe('C:/Sanaka/runtime/vm-1/path-proxy/disk-1-dir/xp.qcow2');
  });

  it('uses a runtime hardlink when basename is non-ascii and the source is on the same volume', async () => {
    const fsPromisesStub = createFsPromisesStub();
    fsPromisesStub.symlink.mockRejectedValueOnce(new Error('junction unavailable'));
    const proxy = new QemuPathProxy({
      platform: 'win32',
      pathModule: path.win32,
      fsPromises: fsPromisesStub,
      execFileSyncImpl: vi.fn(() => '')
    });

    const result = await proxy.resolveLaunchPath({
      sourcePath: 'C:\\Downloads\\镜像.qcow2',
      runtimeDir: 'C:\\Sanaka\\runtime\\vm-1',
      slot: 'disk-2'
    });

    expect(result.strategy).toBe('runtime-hardlink');
    expect(fsPromisesStub.link).toHaveBeenCalledTimes(1);
    expect(result.qemuPath).toMatch(/^C:\/Sanaka\/runtime\/vm-1\/path-proxy\/disk-2-[0-9a-f]{10}\.qcow2$/);
  });

  it('rejects a junction that resolves to the wrong file and falls through to the next strategy', async () => {
    const fsPromisesStub = createFsPromisesStub();
    fsPromisesStub.realpath
      .mockResolvedValueOnce('G:\\Downloads\\别的目录\\xp.qcow2')
      .mockResolvedValueOnce('G:\\Downloads\\小叉屁\\xp.qcow2');
    const proxy = new QemuPathProxy({
      platform: 'win32',
      pathModule: path.win32,
      fsPromises: fsPromisesStub,
      execFileSyncImpl: vi.fn(() => '')
    });

    const result = await proxy.resolveLaunchPath({
      sourcePath: 'G:\\Downloads\\小叉屁\\xp.qcow2',
      runtimeDir: 'C:\\Sanaka\\runtime\\vm-1',
      slot: 'disk-3'
    });

    expect(result.strategy).toBe('runtime-symlink');
    expect(fsPromisesStub.symlink).toHaveBeenNthCalledWith(1, 'G:\\Downloads\\小叉屁', 'C:\\Sanaka\\runtime\\vm-1\\path-proxy\\disk-3-dir', 'junction');
    expect(fsPromisesStub.symlink).toHaveBeenNthCalledWith(2, 'G:\\Downloads\\小叉屁\\xp.qcow2', expect.stringMatching(/disk-3-[0-9a-f]{10}\.qcow2$/), 'file');
  });
});
