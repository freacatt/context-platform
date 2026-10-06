/** Reads a nested value; undefined if any step is missing. */
export function getValueAtPath(obj: unknown, path: readonly string[]): unknown {
  let current: unknown = obj;
  for (const key of path) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/** Returns a copy of `obj` with the value at `path` replaced. Never mutates the input. */
export function setValueAtPath<T>(obj: T, path: readonly string[], value: unknown): T {
  if (path.length === 0) return value as T;
  const [key, ...rest] = path;
  const source = (obj ?? {}) as Record<string, unknown>;
  return { ...source, [key]: setValueAtPath(source[key], rest, value) } as T;
}
