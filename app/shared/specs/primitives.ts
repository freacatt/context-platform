/**
 * Tolerant readers for editor-owned JSON ("specs"). Every spec is normalized on the server
 * before it is stored and on read, so stored data always has the current shape: unknown
 * fields are dropped, missing ones get defaults, lists get stable entry ids.
 */
export type Json = Record<string, unknown>;

export const MAX_TEXT = 50_000;
export const MAX_LINE = 2_000;
export const MAX_ENTRIES = 500;

export const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);

export const obj = (value: unknown): Json => (isObject(value) ? value : {});

/** A string (long text allowed), '' otherwise. */
export const text = (value: unknown, max = MAX_TEXT): string => (typeof value === 'string' ? value.slice(0, max) : '');

/** A list of short strings; blanks are kept so editors can hold an empty row being typed. */
export const lines = (value: unknown, maxItems = MAX_ENTRIES): string[] =>
  Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string').map((s) => s.slice(0, MAX_LINE)).slice(0, maxItems) : [];

export const choice = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  options.includes(value as T) ? (value as T) : fallback;

/** A list of entries, each with a unique `id` (kept, or assigned as `<prefix>-<n>`). */
export function entries<T extends { id: string }>(value: unknown, prefix: string, normalize: (raw: Json, id: string) => T): T[] {
  if (!Array.isArray(value)) return [];
  const used = new Set<string>();
  return value
    .filter(isObject)
    .slice(0, MAX_ENTRIES)
    .map((raw, i) => {
      let id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.slice(0, 64) : `${prefix}-${i + 1}`;
      while (used.has(id)) id = `${id}-${i + 1}`;
      used.add(id);
      return normalize(raw, id);
    });
}

/** A short random id for a new list entry. */
export const newEntryId = (): string => crypto.randomUUID().slice(0, 8);

/** Markdown bullet list, or nothing. */
export const bullets = (items: string[], prefix = '- '): string[] => items.filter((s) => s.trim()).map((s) => `${prefix}${s.trim()}`);

/** "## Heading" + body when the body has content. */
export function section(heading: string, body: string[] | string): string[] {
  const content = (Array.isArray(body) ? body : [body]).filter((line) => line.trim() !== '');
  return content.length ? [heading, '', ...(Array.isArray(body) ? body : [body.trim()]), ''] : [];
}
