export function getMessage(messages: Record<string, unknown>, key: string): string {
  const value = key.split('.').reduce<unknown>((current, segment) => {
    if (current && typeof current === 'object' && segment in current) {
      return (current as Record<string, unknown>)[segment];
    }
    return undefined;
  }, messages);

  return typeof value === 'string' ? value : key;
}
