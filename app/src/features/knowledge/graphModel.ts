/** The knowledge graph as drawn: filtering, degrees, neighbours, merged edges. Pure. */
import type { KnowledgeApp, LinkKind } from '@shared/knowledge/types';

export interface GraphInput {
  nodes: { app: KnowledgeApp; id: string; title: string }[];
  /** Ends are refKeys ("app:id"). */
  edges: { from: string; to: string; kind: LinkKind; source: 'explicit' | 'derived' }[];
}

export interface GraphNode {
  key: string;
  app: KnowledgeApp;
  id: string;
  title: string;
  degree: number;
}

/** One line per pair of items, whatever the number of relations between them. */
export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  kinds: LinkKind[];
  /** Only derived relations (drawn dashed). */
  derived: boolean;
}

export interface BuiltGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  neighbours: Map<string, Set<string>>;
}

export function buildGraph(input: GraphInput, options: { hiddenApps?: Set<KnowledgeApp>; showOrphans?: boolean } = {}): BuiltGraph {
  const hidden = options.hiddenApps ?? new Set();
  const visible = new Map(input.nodes.filter((n) => !hidden.has(n.app)).map((n) => [`${n.app}:${n.id}`, n]));
  const pairs = new Map<string, GraphEdge>();
  for (const e of input.edges) {
    if (!visible.has(e.from) || !visible.has(e.to) || e.from === e.to) continue;
    const [a, b] = e.from < e.to ? [e.from, e.to] : [e.to, e.from];
    const id = `${a}|${b}`;
    const edge = pairs.get(id) ?? { id, from: e.from, to: e.to, kinds: [], derived: true };
    if (!edge.kinds.includes(e.kind)) edge.kinds.push(e.kind);
    if (e.source === 'explicit') edge.derived = false;
    pairs.set(id, edge);
  }
  const edges = [...pairs.values()];
  const neighbours = new Map<string, Set<string>>([...visible.keys()].map((k) => [k, new Set()]));
  for (const e of edges) {
    neighbours.get(e.from)!.add(e.to);
    neighbours.get(e.to)!.add(e.from);
  }
  const nodes = [...visible.entries()]
    .map(([key, n]) => ({ key, app: n.app, id: n.id, title: n.title, degree: neighbours.get(key)!.size }))
    .filter((n) => options.showOrphans !== false || n.degree > 0);
  const kept = new Set(nodes.map((n) => n.key));
  return { nodes, edges: edges.filter((e) => kept.has(e.from) && kept.has(e.to)), neighbours };
}

/** Dot radius: grows with connections, like Obsidian. */
export const nodeRadius = (degree: number): number => 6 + Math.min(16, Math.sqrt(degree) * 4);

/** Case-insensitive title match; an empty query matches nothing (no highlight). */
export const matchesQuery = (title: string, query: string): boolean => !!query.trim() && title.toLowerCase().includes(query.trim().toLowerCase());
