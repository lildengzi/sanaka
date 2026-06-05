import { describe, expect, it, vi } from 'vitest';
import { RuntimeManager, pickPreferredStartupError } from './RuntimeManager';

function createManager(overrides = {}) {
  const detector = {
    detect: vi.fn(async () => ({
      checkedAt: '2026-06-04T00:00:00.000Z',
      platform: 'darwin',
      arch: 'arm64',
      available: true,
      availableSystemTargets: ['x86_64'],
      accelerators: ['hvf', 'tcg'],
      installHint: '',
      binaries: {
        x86_64: { name: 'qemu-system-x86_64', found: true, path: '/opt/homebrew/bin/qemu-system-x86_64', version: '10.0.0' },
        aarch64: { name: 'qemu-system-aarch64', found: true, path: '/opt/homebrew/bin/qemu-system-aarch64', version: '10.0.0' },
        i386: { name: 'qemu-system-i386', found: true, path: '/opt/homebrew/bin/qemu-system-i386', version: '10.0.0' },
        arm: { name: 'qemu-system-arm', found: true, path: '/opt/homebrew/bin/qemu-system-arm', version: '10.0.0' },
        riscv64: { name: 'qemu-system-riscv64', found: true, path: '/opt/homebrew/bin/qemu-system-riscv64', version: '10.0.0' },
        ppc: { name: 'qemu-system-ppc', found: true, path: '/opt/homebrew/bin/qemu-system-ppc', version: '10.0.0' },
        ppc64: { name: 'qemu-system-ppc64', found: true, path: '/opt/homebrew/bin/qemu-system-ppc64', version: '10.0.0' },
        qemuImg: { name: 'qemu-img', found: true, path: '/opt/homebrew/bin/qemu-img', version: '10.0.0' }
      }
    }))
  };

  const registryState = new Map();
  const registry = {
    get: vi.fn((machineId) => registryState.get(machineId) || null),
    set: vi.fn((value) => {
      registryState.set(value.machineId, value);
      return value;
    }),
    delete: vi.fn((machineId) => registryState.delete(machineId)),
    values: vi.fn(() => Array.from(registryState.values()))
  };

  const manager = new RuntimeManager({
    app: {
      getPath: vi.fn(() => '/tmp/sanaka')
    },
    emitEvent: vi.fn(),
    detector,
    registry,
    builder: overrides.builder || { build: vi.fn() },
    platform: overrides.platform || 'darwin',
    arch: overrides.arch || 'arm64'
  });

  return { manager, detector, registry, registryState };
}

describe('RuntimeManager', () => {
  it('prefers raw stderr when building the startup failure message', () => {
    expect(
      pickPreferredStartupError({
        stderr: 'qemu-system-x86_64: -accel kvm: invalid accelerator kvm\n',
        error: new Error('QMP connection timeout.')
      })
    ).toBe('qemu-system-x86_64: -accel kvm: invalid accelerator kvm');
  });

  it('serializes listRunningMachines results', async () => {
    const { manager, registryState } = createManager();
    registryState.set('vm-1', {
      machineId: 'vm-1',
      bundlePath: '/tmp/VM.saka',
      configPath: '/tmp/VM.saka/machine.svm',
      pid: 1234,
      status: 'running',
      startedAt: '2026-06-04T00:00:00.000Z',
      arch: 'x86_64',
      displayFrontend: 'sanaka',
      displayBackend: 'vnc',
      displayPort: 5901,
      displayWebSocketPort: 5700,
      qmpSocketPath: null,
      qmpTcpPort: 47001,
      logPath: '/tmp/runtime/qemu.log',
      exitCode: null,
      lastError: null,
      process: { pid: 1234, kill: vi.fn() },
      qmpClient: { close: vi.fn() },
      machine: { id: 'vm-1' }
    });

    const result = await manager.listRunningMachines();

    expect(result).toEqual([
      {
        machineId: 'vm-1',
        bundlePath: '/tmp/VM.saka',
        configPath: '/tmp/VM.saka/machine.svm',
        pid: 1234,
        status: 'running',
        startedAt: '2026-06-04T00:00:00.000Z',
        arch: 'x86_64',
        displayFrontend: 'sanaka',
        displayBackend: 'vnc',
        displayPort: 5901,
        displayWebSocketPort: 5700,
        qmpSocketPath: null,
        qmpTcpPort: 47001,
        logPath: '/tmp/runtime/qemu.log',
        exitCode: null,
        lastError: null
      }
    ]);
    expect(result[0]).not.toHaveProperty('process');
    expect(result[0]).not.toHaveProperty('qmpClient');
  });

  it('serializes an already-running machine result', async () => {
    const { manager, registryState } = createManager();
    registryState.set('vm-2', {
      machineId: 'vm-2',
      bundlePath: '/tmp/VM2.saka',
      configPath: '/tmp/VM2.saka/machine.svm',
      pid: 2222,
      status: 'running',
      startedAt: '2026-06-04T00:00:00.000Z',
      arch: 'x86_64',
      displayFrontend: 'sanaka',
      displayBackend: 'vnc',
      displayPort: 5902,
      displayWebSocketPort: 5701,
      qmpSocketPath: null,
      qmpTcpPort: 47002,
      logPath: '/tmp/runtime/vm2.log',
      exitCode: null,
      lastError: null,
      process: { pid: 2222, kill: vi.fn() },
      qmpClient: { close: vi.fn() },
      machine: { id: 'vm-2' }
    });

    const fsModule = await import('fs/promises');
    const readFileMock = vi.spyOn(fsModule.default || fsModule, 'readFile').mockResolvedValue(`
kind = "machine"
id = "vm-2"
title = "VM 2"

[system]
arch = "x86_64"
`);

    const result = await manager.startMachine('/tmp/VM2.saka');

    expect(result.ok).toBe(true);
    expect(result.alreadyRunning).toBe(true);
    expect(result.state?.machineId).toBe('vm-2');
    expect(result.state).not.toHaveProperty('process');
    readFileMock.mockRestore();
  });

  it('resets a running machine through QMP and emits resetting state', async () => {
    const { manager, registryState } = createManager();
    const systemReset = vi.fn(async () => undefined);
    const emitEvent = vi.fn();
    manager.emitEvent = emitEvent;

    registryState.set('vm-3', {
      machineId: 'vm-3',
      bundlePath: '/tmp/VM3.saka',
      configPath: '/tmp/VM3.saka/machine.svm',
      pid: 3333,
      status: 'running',
      startedAt: '2026-06-04T00:00:00.000Z',
      arch: 'x86_64',
      displayFrontend: 'sanaka',
      displayBackend: 'vnc',
      displayPort: 5903,
      displayWebSocketPort: 5703,
      qmpSocketPath: null,
      qmpTcpPort: 47003,
      logPath: '/tmp/runtime/vm3.log',
      exitCode: null,
      lastError: null,
      process: { pid: 3333, kill: vi.fn(), exitCode: null, killed: false },
      qmpClient: { systemReset, close: vi.fn() },
      machine: { id: 'vm-3', media: {} }
    });

    const result = await manager.resetMachine('vm-3');

    expect(result.ok).toBe(true);
    expect(result.state?.status).toBe('resetting');
    expect(systemReset).toHaveBeenCalledTimes(1);
    expect(emitEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'machine-resetting',
        machineId: 'vm-3'
      })
    );
  });

  it('changes mounted cdrom media through QMP', async () => {
    const { manager, registryState } = createManager();
    const blockdevChangeMedium = vi.fn(async () => undefined);

    registryState.set('vm-4', {
      machineId: 'vm-4',
      bundlePath: '/tmp/VM4.saka',
      configPath: '/tmp/VM4.saka/machine.svm',
      pid: 4444,
      status: 'running',
      startedAt: '2026-06-04T00:00:00.000Z',
      arch: 'x86_64',
      displayFrontend: 'sanaka',
      displayBackend: 'vnc',
      displayPort: 5904,
      displayWebSocketPort: 5704,
      qmpSocketPath: null,
      qmpTcpPort: 47004,
      logPath: '/tmp/runtime/vm4.log',
      exitCode: null,
      lastError: null,
      process: { pid: 4444, kill: vi.fn(), exitCode: null, killed: false },
      qmpClient: { blockdevChangeMedium, close: vi.fn() },
      machine: {
        id: 'vm-4',
        media: {
          iso: '/tmp/original.iso',
          floppy: ''
        }
      }
    });

    const result = await manager.changeMedia('vm-4', '/tmp/next.iso', 'cdrom');

    expect(result.ok).toBe(true);
    expect(blockdevChangeMedium).toHaveBeenCalledWith({
      id: 'cd0',
      filename: '/tmp/next.iso',
      format: 'raw',
      readOnly: true
    });
  });

  it('waits for a stopping machine to exit before reporting already running', async () => {
    const { manager, registryState } = createManager({
      builder: {
        build: vi.fn(() => {
          throw new Error('builder should not run before stop wait finishes in this test');
        })
      }
    });
    registryState.set('vm-5', {
      machineId: 'vm-5',
      bundlePath: '/tmp/VM5.saka',
      configPath: '/tmp/VM5.saka/machine.svm',
      pid: 5555,
      status: 'stopping',
      startedAt: '2026-06-04T00:00:00.000Z',
      arch: 'x86_64',
      displayFrontend: 'sanaka',
      displayBackend: 'vnc',
      displayPort: 5905,
      displayWebSocketPort: 5705,
      qmpSocketPath: null,
      qmpTcpPort: 47005,
      logPath: '/tmp/runtime/vm5.log',
      exitCode: null,
      lastError: null,
      process: { pid: 5555, kill: vi.fn(), exitCode: null, killed: false },
      qmpClient: { close: vi.fn() },
      machine: { id: 'vm-5' }
    });

    setTimeout(() => {
      registryState.delete('vm-5');
    }, 50);

    const fsModule = await import('fs/promises');
    const readFileMock = vi.spyOn(fsModule.default || fsModule, 'readFile').mockResolvedValue(`
kind = "machine"
id = "vm-5"
title = "VM 5"

[system]
arch = "x86_64"

[display]
frontend = "sanaka"
gpu = "virtio-vga"

[display.sanaka]
backend = "vnc"
scale_mode = "fit"
clipboard = true

[network]
enabled = false
mode = "user"
card = "virtio-net-pci"

[media]
iso = ""
floppy = ""

[advanced]
audio_backend = "auto"
qemu_args = ""

[peripherals]
usb_tablet = true
`);

    await expect(manager.startMachine('/tmp/VM5.saka')).resolves.toEqual({
      ok: false,
      error: 'builder should not run before stop wait finishes in this test',
      state: null
    });
    readFileMock.mockRestore();
  });

  it('force stops a machine with SIGKILL and clears the runtime state quickly', async () => {
    const { manager, registryState } = createManager();
    const emitEvent = vi.fn();
    manager.emitEvent = emitEvent;
    const kill = vi.fn(() => true);
    const processRef = {
      pid: 6666,
      kill,
      exitCode: null,
      killed: false
    };

    registryState.set('vm-6', {
      machineId: 'vm-6',
      bundlePath: '/tmp/VM6.saka',
      configPath: '/tmp/VM6.saka/machine.svm',
      pid: 6666,
      status: 'stopping',
      startedAt: '2026-06-04T00:00:00.000Z',
      arch: 'x86_64',
      displayFrontend: 'sanaka',
      displayBackend: 'vnc',
      displayPort: 5906,
      displayWebSocketPort: 5706,
      qmpSocketPath: null,
      qmpTcpPort: 47006,
      logPath: '/tmp/runtime/vm6.log',
      exitCode: null,
      lastError: null,
      process: processRef,
      qmpClient: {
        close: vi.fn()
      },
      machine: { id: 'vm-6' }
    });

    const result = await manager.forceStopMachine('vm-6');

    expect(result.ok).toBe(true);
    expect(kill).toHaveBeenCalledWith('SIGKILL');
    expect(registryState.has('vm-6')).toBe(false);
    expect(emitEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'machine-stopping',
        machineId: 'vm-6'
      })
    );
    expect(emitEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'machine-stopped',
        machineId: 'vm-6'
      })
    );
  });

  it('does not treat a QMP shutdown event as stopped unless Sanaka is already stopping', () => {
    const { manager, registryState } = createManager();
    const emitEvent = vi.fn();
    manager.emitEvent = emitEvent;

    registryState.set('vm-7', {
      machineId: 'vm-7',
      bundlePath: '/tmp/VM7.saka',
      configPath: '/tmp/VM7.saka/machine.svm',
      pid: 7777,
      status: 'running',
      startedAt: '2026-06-04T00:00:00.000Z',
      arch: 'x86_64',
      displayFrontend: 'sanaka',
      displayBackend: 'vnc',
      displayPort: 5907,
      displayWebSocketPort: 5707,
      qmpSocketPath: null,
      qmpTcpPort: 47007,
      logPath: '/tmp/runtime/vm7.log',
      exitCode: null,
      lastError: null,
      process: { pid: 7777, kill: vi.fn(), exitCode: null, killed: false },
      qmpClient: { close: vi.fn() },
      machine: { id: 'vm-7' }
    });

    manager.handleQmpEventForTest('vm-7', { event: 'SHUTDOWN' });

    expect(registryState.get('vm-7')?.status).toBe('running');
    expect(emitEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'machine-stopping'
      })
    );
  });

  it('returns a normal start failure when command building rejects the requested accelerator', async () => {
    const { manager } = createManager({
      builder: {
        build: vi.fn(() => {
          throw new Error('Requested accelerator "kvm" is not available on darwin. Available accelerators: hvf, tcg.');
        })
      }
    });

    const fsModule = await import('fs/promises');
    const readFileMock = vi.spyOn(fsModule.default || fsModule, 'readFile').mockResolvedValue(`
kind = "machine"
id = "vm-8"
title = "VM 8"

[system]
arch = "aarch64"
accelerator = "kvm"
boot_order = "cdrom"
memory_mib = 1024
cpu_cores = 2
sound_card = "intel-hda"

[display]
frontend = "sanaka"
gpu = "virtio-vga"

[display.sanaka]
backend = "vnc"
scale_mode = "fit"
clipboard = true

[network]
enabled = false
mode = "user"
card = "virtio-net-pci"

[media]
iso = ""
floppy = ""

[advanced]
audio_backend = "auto"
qemu_args = ""

[peripherals]
usb_tablet = true
`);

    const result = await manager.startMachine('/tmp/VM8.saka');

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Requested accelerator "kvm" is not available on darwin/);
    readFileMock.mockRestore();
  });
});
