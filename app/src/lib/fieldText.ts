/**
 * Plain-text editing for structured fields:
 * - string: as is
 * - list:   one item per line
 * - map:    "key: value" per line
 */
export type FieldType = 'string' | 'list' | 'map';

export function fieldToText(value: unknown, type: FieldType): string {
  if (value === undefined || value === null) return '';
  if (type === 'list' && Array.isArray(value)) return value.join('\n');
  if (type === 'map' && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
  }
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export function textToField(text: string, type: FieldType): string | string[] | Record<string, string> {
  if (type === 'list') {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }
  if (type === 'map') {
    const map: Record<string, string> = {};
    for (const line of text.split('\n')) {
      const separator = line.indexOf(':');
      if (separator <= 0) continue;
      const key = line.slice(0, separator).trim();
      if (key) map[key] = line.slice(separator + 1).trim();
    }
    return map;
  }
  return text;
}

/** Whether a field has any content (non-empty string, list or map). */
export function isFieldFilled(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return String(value).trim().length > 0;
}
