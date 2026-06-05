import { describe, expect, it } from 'vitest';
import { createMachineFromTemplate } from './templates';

describe('template machine creation', () => {
  it('creates an opaque unique machine id instead of exposing a title slug', () => {
    const first = createMachineFromTemplate('win11');
    const second = createMachineFromTemplate('win11');

    expect(first.id).toMatch(/^machine-/);
    expect(second.id).toMatch(/^machine-/);
    expect(first.id).not.toBe(second.id);
    expect(first.id).not.toContain('win11-');
  });

  it('enables usb tablet by default for new machines', () => {
    const machine = createMachineFromTemplate('win98');
    expect(machine.peripherals.usb_tablet).toBe(true);
  });

  it('provides default memory and cpu values for new machines', () => {
    const machine = createMachineFromTemplate('win11');
    expect(machine.system.memory_mib).toBe(4096);
    expect(machine.system.cpu_cores).toBe(2);
  });
});
