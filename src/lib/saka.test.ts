import { describe, expect, it } from 'vitest';
import { createMachineFromTemplate } from '../domain/templates';
import { buildDefaultSakaFileName, parseSakaContent, serializeSakaMachine } from './saka';

describe('saka serialization', () => {
  it('round-trips a machine through TOML', () => {
    const machine = createMachineFromTemplate('linux');
    machine.title = 'Linux Studio';
    machine.media.iso = '/tmp/linux.iso';
    machine.system.memory_mib = 3072;
    machine.system.cpu_cores = 4;
    machine.display.sanaka = {
      backend: 'vnc',
      scale_mode: 'stretch',
      clipboard: true
    };
    machine.peripherals.usb_tablet = true;
    machine.disks.push({
      id: 'disk0',
      path: '/tmp/disk0.qcow2',
      format: 'qcow2',
      interface: 'virtio',
      boot: true,
      readonly: false,
      storage_mode: 'external',
      source_path: ''
    });

    const serialized = serializeSakaMachine(machine);
    const parsed = parseSakaContent(serialized);

    expect(parsed.kind).toBe('machine');
    if (parsed.kind === 'machine') {
      expect(parsed.title).toBe('Linux Studio');
      expect(parsed.media.iso).toBe('/tmp/linux.iso');
      expect(parsed.disks).toHaveLength(1);
      expect(parsed.display.frontend).toBe('sanaka');
      expect(parsed.system.memory_mib).toBe(3072);
      expect(parsed.system.cpu_cores).toBe(4);
      expect(parsed.display.sanaka?.scale_mode).toBe('stretch');
      expect(parsed.peripherals.usb_tablet).toBe(true);
    }
  });

  it('preserves Chinese content without mojibake', () => {
    const machine = createMachineFromTemplate('linux');
    machine.title = '测试虚拟机';
    machine.description = '用于中文保存测试';
    machine.meta.notes = '这里有中文内容';

    const serialized = serializeSakaMachine(machine);
    const parsed = parseSakaContent(serialized);

    expect(serialized).toContain('测试虚拟机');
    expect(parsed.kind).toBe('machine');
    if (parsed.kind === 'machine') {
      expect(parsed.title).toBe('测试虚拟机');
      expect(parsed.description).toBe('用于中文保存测试');
      expect(parsed.meta.notes).toBe('这里有中文内容');
    }
  });

  it('builds a readable default file name from the machine title', () => {
    expect(buildDefaultSakaFileName({ title: 'Windows 10/11', id: 'machine-123' })).toBe('Windows 10 11.saka');
    expect(buildDefaultSakaFileName({ title: '测试虚拟机', id: 'machine-123' })).toBe('测试虚拟机.saka');
    expect(buildDefaultSakaFileName({ title: '   ', id: 'machine-123' })).toBe('machine-123.saka');
  });
});

import { getDefaultNewMachineTitle, getUniqueMachineTitle } from '../store/AppStore';

describe('getUniqueMachineTitle', () => {
  it('returns original title if no collision', () => {
    expect(getUniqueMachineTitle('Windows 98', ['Linux Generic'])).toBe('Windows 98');
  });

  it('increments title on collision', () => {
    expect(getUniqueMachineTitle('Windows 98', ['Windows 98'])).toBe('Windows 98 2');
    expect(getUniqueMachineTitle('Windows 98', ['Windows 98', 'Windows 98 2'])).toBe('Windows 98 3');
  });

  it('handles existing numbers in titles case-insensitively', () => {
    expect(getUniqueMachineTitle('windows 98 2', ['Windows 98 2'])).toBe('windows 98 3');
  });
});

describe('getDefaultNewMachineTitle', () => {
  it('uses 新虚拟机 for the first new machine', () => {
    expect(getDefaultNewMachineTitle([])).toBe('新虚拟机');
  });

  it('increments from 1 for additional new machines', () => {
    expect(getDefaultNewMachineTitle(['新虚拟机'])).toBe('新虚拟机 1');
    expect(getDefaultNewMachineTitle(['新虚拟机', '新虚拟机 1'])).toBe('新虚拟机 2');
  });
});
