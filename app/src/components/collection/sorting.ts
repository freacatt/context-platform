export type SortKey = 'recent' | 'title';

/** Items whose title contains `search`, newest first or A-Z. */
export function filterAndSort<T>(
  items: T[],
  search: string,
  sortBy: SortKey,
  getTitle: (item: T) => string,
  getTimestamp: (item: T) => number,
): T[] {
  const term = search.trim().toLowerCase();
  return items
    .filter((item) => getTitle(item).toLowerCase().includes(term))
    .sort((a, b) => (sortBy === 'title' ? getTitle(a).localeCompare(getTitle(b)) : getTimestamp(b) - getTimestamp(a)));
}
