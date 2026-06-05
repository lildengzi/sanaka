class RuntimeRegistry {
  constructor() {
    this.byMachineId = new Map();
  }

  set(state) {
    this.byMachineId.set(state.machineId, state);
    return state;
  }

  get(machineId) {
    return this.byMachineId.get(machineId) || null;
  }

  delete(machineId) {
    this.byMachineId.delete(machineId);
  }

  values() {
    return Array.from(this.byMachineId.values());
  }
}

module.exports = {
  RuntimeRegistry
};
