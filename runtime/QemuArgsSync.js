const { deriveStableMacAddress, tokenizeUserArgs } = require('./QemuCommandBuilder');

const CONTROLLED_BINDINGS = {
  memory: 'system.memory_mib',
  cpu: 'system.cpu_cores',
  accel: 'system.accelerator',
  boot: 'system.boot_order',
  networkMode: 'network.mode',
  networkCard: 'network.card'
};

const VALID_ACCELERATORS = new Set(['none', 'tcg', 'mttcg', 'kvm', 'hax', 'whpx', 'hvf']);

function mapAcceleratorArg(accelerator) {
  if (accelerator === 'mttcg') {
    return 'tcg,thread=multi';
  }
  if (!accelerator || accelerator === 'none') {
    return 'tcg';
  }
  return accelerator;
}

function mapBootOrderArg(bootOrder) {
  if (bootOrder === 'cdrom') return 'd';
  if (bootOrder === 'disk') return 'c';
  if (bootOrder === 'floppy') return 'a';
  return null;
}

function unmapBootOrderArg(value) {
  if (value === 'd' || value === 'cdrom' || value === 'order=cdrom') return 'cdrom';
  if (value === 'c' || value === 'disk' || value === 'order=disk') return 'disk';
  if (value === 'a' || value === 'floppy' || value === 'order=floppy') return 'floppy';
  return null;
}

function makeControlledItem(bindingKey, raw) {
  return {
    id: `controlled:${bindingKey}`,
    raw,
    source: 'controlled',
    bindingKey,
    editable: true
  };
}

function makeCustomItem(raw, index) {
  return {
    id: `custom:${index}`,
    raw,
    source: 'custom',
    editable: true
  };
}

function splitCustomArgs(input) {
  const source = String(input || '').trim();
  if (!source) return [];
  const rawLines = source.includes('\n') ? source.split('\n') : mergeLegacySpaceArgs(tokenizeUserArgs(source));
  return rawLines.map((raw) => String(raw).trim()).filter(Boolean);
}

function mergeLegacySpaceArgs(tokens) {
  const knownValueFlags = new Set([
    '-m', '-smp', '-accel', '-boot', '-machine', '-cpu', '-name', '-pidfile', '-D', '-d',
    '-netdev', '-device', '-drive', '-blockdev', '-cdrom', '-fda', '-fdb', '-hda', '-hdb',
    '-hdc', '-hdd', '-pflash', '-bios', '-kernel', '-append', '-initrd', '-dtb',
    '-audiodev', '-audio', '-display', '-vga', '-chardev', '-fsdev',
    '-net', '-nic', '-serial', '-parallel', '-monitor', '-qmp', '-spice', '-vnc',
    '-global', '-set'
  ]);

  const result = [];
  let index = 0;
  while (index < tokens.length) {
    const token = tokens[index];
    if (knownValueFlags.has(token) && index + 1 < tokens.length) {
      result.push(`${token} ${tokens[index + 1]}`);
      index += 2;
      continue;
    }
    result.push(token);
    index += 1;
  }
  return result;
}

function buildControlledArgs(machine) {
  const args = [
    makeControlledItem(CONTROLLED_BINDINGS.memory, `-m ${machine.system.memory_mib}`),
    makeControlledItem(CONTROLLED_BINDINGS.cpu, `-smp ${machine.system.cpu_cores}`),
    makeControlledItem(CONTROLLED_BINDINGS.accel, `-accel ${mapAcceleratorArg(machine.system.accelerator)}`)
  ];

  const bootArg = mapBootOrderArg(machine.system.boot_order);
  if (bootArg) {
    args.push(makeControlledItem(CONTROLLED_BINDINGS.boot, `-boot ${bootArg}`));
  }

  if (machine.network?.enabled) {
    const mode = machine.network.mode === 'bridge' ? 'bridge' : 'user';
    args.push(makeControlledItem(CONTROLLED_BINDINGS.networkMode, `-netdev ${mode},id=net0`));
    if (machine.network.card && machine.network.card !== 'none') {
      args.push(
        makeControlledItem(
          CONTROLLED_BINDINGS.networkCard,
          `-device ${machine.network.card},netdev=net0,mac=${deriveStableMacAddress(machine.id)}`
        )
      );
    }
  }

  return args;
}

function classifyRaw(raw) {
  const tokens = tokenizeUserArgs(raw);
  const flag = tokens[0];
  if (flag === '-m') return { source: 'controlled', bindingKey: CONTROLLED_BINDINGS.memory };
  if (flag === '-smp') return { source: 'controlled', bindingKey: CONTROLLED_BINDINGS.cpu };
  if (flag === '-accel') return { source: 'controlled', bindingKey: CONTROLLED_BINDINGS.accel };
  if (flag === '-boot') return { source: 'controlled', bindingKey: CONTROLLED_BINDINGS.boot };
  if (flag === '-netdev') return { source: 'controlled', bindingKey: CONTROLLED_BINDINGS.networkMode };
  if (flag === '-device' && typeof tokens[1] === 'string' && tokens[1].includes('netdev=net0')) {
    return { source: 'controlled', bindingKey: CONTROLLED_BINDINGS.networkCard };
  }
  return { source: 'custom' };
}

function buildArgList(machine) {
  const controlled = buildControlledArgs(machine);
  const custom = splitCustomArgs(machine.advanced?.qemu_args || '');
  const cleanCustom = custom.filter((raw) => classifyRaw(raw).source === 'custom');
  return [...controlled, ...cleanCustom.map((raw, index) => makeCustomItem(raw, index))];
}

function applyControlledEdit(machine, bindingKey, raw) {
  const tokens = tokenizeUserArgs(raw);
  switch (bindingKey) {
    case CONTROLLED_BINDINGS.memory: {
      if (tokens[0] !== '-m' || !tokens[1]) return null;
      const value = Number(tokens[1]);
      if (!Number.isFinite(value) || value < 64) return null;
      return {
        ...machine,
        system: {
          ...machine.system,
          memory_mib: value
        }
      };
    }
    case CONTROLLED_BINDINGS.cpu: {
      if (tokens[0] !== '-smp' || !tokens[1]) return null;
      const value = Number(tokens[1]);
      if (!Number.isFinite(value) || value < 1) return null;
      return {
        ...machine,
        system: {
          ...machine.system,
          cpu_cores: value
        }
      };
    }
    case CONTROLLED_BINDINGS.accel: {
      if (tokens[0] !== '-accel' || !tokens[1]) return null;
      const next = tokens[1] === 'tcg,thread=multi' ? 'mttcg' : tokens[1];
      if (!VALID_ACCELERATORS.has(next)) return null;
      return {
        ...machine,
        system: {
          ...machine.system,
          accelerator: next
        }
      };
    }
    case CONTROLLED_BINDINGS.boot: {
      if (tokens[0] !== '-boot' || !tokens[1]) return null;
      const bootOrder = unmapBootOrderArg(tokens[1]);
      if (!bootOrder) return null;
      return {
        ...machine,
        system: {
          ...machine.system,
          boot_order: bootOrder
        }
      };
    }
    case CONTROLLED_BINDINGS.networkMode: {
      if (tokens[0] !== '-netdev' || !tokens[1]) return null;
      const mode = tokens[1].split(',')[0];
      if (mode !== 'user' && mode !== 'bridge') return null;
      return {
        ...machine,
        network: {
          ...machine.network,
          enabled: true,
          mode
        }
      };
    }
    case CONTROLLED_BINDINGS.networkCard: {
      if (tokens[0] !== '-device' || !tokens[1]) return null;
      const device = tokens[1].split(',')[0];
      if (!device || device === 'none') return null;
      return {
        ...machine,
        network: {
          ...machine.network,
          enabled: true,
          card: device
        }
      };
    }
    default:
      return null;
  }
}

function normalizeCustomArgs(machine, customArgs) {
  let nextMachine = structuredClone(machine);
  const remainingCustom = [];

  for (const rawValue of customArgs) {
    const raw = String(rawValue || '').trim();
    if (!raw) continue;
    const classification = classifyRaw(raw);
    if (classification.source === 'controlled' && classification.bindingKey) {
      const updated = applyControlledEdit(nextMachine, classification.bindingKey, raw);
      if (updated) {
        nextMachine = updated;
        continue;
      }
    }
    remainingCustom.push(raw);
  }

  nextMachine.advanced = {
    ...nextMachine.advanced,
    qemu_args: remainingCustom.join('\n')
  };

  return {
    machine: nextMachine,
    args: buildArgList(nextMachine)
  };
}

module.exports = {
  CONTROLLED_BINDINGS,
  applyControlledEdit,
  buildArgList,
  buildControlledArgs,
  classifyRaw,
  normalizeCustomArgs,
  splitCustomArgs
};
