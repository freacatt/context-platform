/** The knowledge layer: every workspace item as Markdown, plus the relations between items. */

/**
 * Apps whose items are knowledge items, in dashboard order. Keys equal the workspace app keys and
 * Convex table names. `technicalTasks` is legacy: still readable (and linkable) until converted
 * into Technical Plans, but no longer a workspace app.
 */
export const KNOWLEDGE_APP_KEYS = [
  'pyramids',
  'diagrams',
  'decisions',
  'productDefinitions',
  'researchStudies',
  'roadmaps',
  'designSystems',
  'uiUxArchitectures',
  'contextDocuments',
  'glossaries',
  'technicalArchitectures',
  'technicalPlans',
  'technicalTasks',
] as const;

export type KnowledgeApp = (typeof KNOWLEDGE_APP_KEYS)[number];

export const isKnowledgeApp = (value: string): value is KnowledgeApp =>
  (KNOWLEDGE_APP_KEYS as readonly string[]).includes(value);

/** Points at one item. `anchor` (a part of the item) is reserved for later use. */
export interface KnowledgeRef {
  app: KnowledgeApp;
  id: string;
  anchor?: string;
}

export const LINK_KINDS = ['references', 'depends-on', 'implements', 'derived-from', 'related'] as const;
export type LinkKind = (typeof LINK_KINDS)[number];

export const LINK_KIND_LABELS: Record<LinkKind, string> = {
  references: 'References',
  'depends-on': 'Depends on',
  implements: 'Implements',
  'derived-from': 'Derived from',
  related: 'Related to',
};

/** A directed relation. Explicit edges are stored links; derived ones come from an item's own fields. */
export interface KnowledgeEdge {
  from: KnowledgeRef;
  to: KnowledgeRef;
  kind: LinkKind;
  source: 'explicit' | 'derived';
}

export interface KnowledgeItem {
  ref: KnowledgeRef;
  title: string;
  updatedAt: number;
  /** Extra frontmatter (type, status, folder, …). */
  meta: Record<string, string | number>;
  /** Markdown body; starts with "# <title>". */
  markdown: string;
}

/** "app:id" — identity of an item regardless of anchor. */
export const refKey = (ref: Pick<KnowledgeRef, 'app' | 'id'>): string => `${ref.app}:${ref.id}`;
