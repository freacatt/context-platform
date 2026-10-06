import { refKey, type KnowledgeEdge, type KnowledgeRef } from './types';

/** Unlimited link depth. */
export const ALL_LINKS = -1;

/**
 * Items reachable from `seeds` within `depth` hops over `edges`, followed in both directions
 * (a backlink is as relevant as a link). Seeds come first, then items in discovery order.
 */
export function linkClosure(seeds: KnowledgeRef[], edges: KnowledgeEdge[], depth: number): KnowledgeRef[] {
  const neighbours = new Map<string, KnowledgeRef[]>();
  const connect = (a: KnowledgeRef, b: KnowledgeRef) => {
    const list = neighbours.get(refKey(a)) ?? [];
    list.push({ app: b.app, id: b.id });
    neighbours.set(refKey(a), list);
  };
  for (const e of edges) {
    connect(e.from, e.to);
    connect(e.to, e.from);
  }

  const seen = new Map<string, KnowledgeRef>();
  let frontier: KnowledgeRef[] = [];
  for (const s of seeds) {
    if (seen.has(refKey(s))) continue;
    const ref = { app: s.app, id: s.id };
    seen.set(refKey(ref), ref);
    frontier.push(ref);
  }
  for (let hop = 0; frontier.length > 0 && (depth === ALL_LINKS || hop < depth); hop++) {
    const next: KnowledgeRef[] = [];
    for (const ref of frontier) {
      for (const n of neighbours.get(refKey(ref)) ?? []) {
        if (seen.has(refKey(n))) continue;
        seen.set(refKey(n), n);
        next.push(n);
      }
    }
    frontier = next;
  }
  return [...seen.values()];
}

/** Drops edges with an end outside `keys` and duplicates (same from, to and kind). */
export function edgesWithin(edges: KnowledgeEdge[], keys: Set<string>): KnowledgeEdge[] {
  const unique = new Map<string, KnowledgeEdge>();
  for (const e of edges) {
    if (!keys.has(refKey(e.from)) || !keys.has(refKey(e.to))) continue;
    const key = `${refKey(e.from)}>${refKey(e.to)}>${e.kind}`;
    // An explicit link wins over the same derived one.
    if (!unique.has(key) || e.source === 'explicit') unique.set(key, e);
  }
  return [...unique.values()];
}
