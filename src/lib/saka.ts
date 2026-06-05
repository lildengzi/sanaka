import { parse as parseToml, stringify as stringifyToml } from 'smol-toml';
import { appSettingsSchema, recentEntrySchema, sakaMachineSchema, sakaTemplateSchema } from '../domain/schemas';
import type { AppSettings, RecentEntry, SakaMachine, SakaTemplate } from '../domain/schemas';

export function parseSakaContent(content: string): SakaMachine | SakaTemplate {
  const parsed = parseToml(content) as Record<string, unknown>;
  if (parsed.kind === 'template') {
    return sakaTemplateSchema.parse(parsed);
  }
  return sakaMachineSchema.parse(parsed);
}

export function serializeSakaMachine(machine: SakaMachine) {
  return stringifyToml({
    ...machine,
    updated_at: new Date().toISOString()
  });
}

export function sanitizeMachineName(machine: Pick<SakaMachine, 'title' | 'id'>) {
  const normalizedTitle = machine.title
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\.+$/g, '');

  const baseName = normalizedTitle.length > 0 ? normalizedTitle : machine.id;
  return baseName.slice(0, 80);
}

export function buildDefaultSakaFileName(machine: Pick<SakaMachine, 'title' | 'id'>) {
  return `${sanitizeMachineName(machine)}.saka`;
}

export function validateSettings(payload: unknown): AppSettings {
  return appSettingsSchema.parse(payload);
}

export function validateRecents(payload: unknown): RecentEntry[] {
  return recentEntrySchema.array().parse(payload);
}
