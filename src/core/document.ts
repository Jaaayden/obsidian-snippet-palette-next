export const shades = ['auto', 'gray', 'azure', 'mint', 'amber', 'rose', 'violet'] as const;
export type Shade = (typeof shades)[number];
export type Placement = 'selection' | 'beginning' | 'ending';
export type Flow = 'tiles' | 'stack' | 'strip';

export interface Clip {
  key: string;
  title: string;
  body: string;
  glyph: string;
  shade: Shade;
  placement: Placement;
  unique: boolean;
}
export interface PaletteDocument {
  format: 1;
  entries: Clip[];
  preferences: { flow: Flow; icons: boolean; shortcuts: boolean };
}

export function blankDocument(): PaletteDocument {
  return { format: 1, entries: [], preferences: { flow: 'tiles', icons: false, shortcuts: false } };
}
export function newClip(key: string): Clip {
  return { key, title: '', body: '', glyph: 'text', shade: 'auto', placement: 'selection', unique: false };
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid document');
  return value as Record<string, unknown>;
}
export function decodeDocument(value: unknown): PaletteDocument {
  if (value == null) return blankDocument();
  const input = object(value);
  if (input.format !== 1 || !Array.isArray(input.entries)) throw new Error('Unsupported document format');
  const preferences = object(input.preferences);
  if (!['tiles', 'stack', 'strip'].includes(String(preferences.flow)) ||
    typeof preferences.icons !== 'boolean' || typeof preferences.shortcuts !== 'boolean') throw new Error('Invalid preferences');
  const keys = new Set<string>();
  const entries = input.entries.map((value: unknown) => {
    const entry = object(value);
    for (const field of ['key', 'title', 'body', 'glyph']) {
      if (typeof entry[field] !== 'string') throw new Error(`Invalid ${field}`);
    }
    if (!entry.key || keys.has(entry.key as string)) throw new Error('Duplicate or empty key');
    keys.add(entry.key as string);
    if (!shades.includes(entry.shade as Shade) || !['selection', 'beginning', 'ending'].includes(String(entry.placement)) ||
      typeof entry.unique !== 'boolean') throw new Error('Invalid entry options');
    return {
      key: entry.key as string, title: entry.title as string, body: entry.body as string,
      glyph: entry.glyph as string, shade: entry.shade as Shade, placement: entry.placement as Placement, unique: entry.unique
    };
  });
  return { format: 1, entries, preferences: { flow: preferences.flow as Flow, icons: preferences.icons, shortcuts: preferences.shortcuts } };
}

/** Stable colors do not change when the user reorders or filters the palette. */
export function shadeFor(clip: Clip): Exclude<Shade, 'auto'> {
  if (clip.shade !== 'auto') return clip.shade;
  const palette = ['azure', 'mint', 'amber', 'rose', 'violet'] as const;
  let hash = 0;
  for (const letter of clip.key) hash = (hash * 31 + letter.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length] ?? 'azure';
}

/** slot is a gap in the full list, not an index in a filtered result. */
export function relocate(entries: Clip[], key: string, slot: number): Clip[] {
  const origin = entries.findIndex(entry => entry.key === key);
  if (origin < 0 || !Number.isInteger(slot) || slot < 0 || slot > entries.length) return entries;
  const destination = slot > origin ? slot - 1 : slot;
  if (destination === origin) return entries;
  const moved = entries[origin];
  if (!moved) return entries;
  const result = entries.slice();
  result.splice(origin, 1);
  result.splice(destination, 0, moved);
  return result;
}
