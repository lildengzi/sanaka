export function machineRoute(machineId: string, filePath?: string) {
  const query = filePath ? `?path=${encodeURIComponent(filePath)}` : '';
  return `/machines/${encodeURIComponent(machineId)}${query}`;
}

export function consoleRoute(machineId: string, filePath?: string) {
  const query = filePath ? `?path=${encodeURIComponent(filePath)}` : '';
  return `/machines/${encodeURIComponent(machineId)}/console${query}`;
}
