/** Server side of the knowledge layer: loading items, their relations, and link cleanup. */
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import { derivedEdges, type DerivedEdgeSource, type KnowledgeSource } from '../../shared/knowledge/serializers';
import { KNOWLEDGE_APP_KEYS, refKey, type KnowledgeApp, type KnowledgeEdge, type KnowledgeRef } from '../../shared/knowledge/types';
import type { WorkspaceTable } from './access';

type Ctx = QueryCtx | MutationCtx;

/** A stored item of any knowledge app. Knowledge app keys are table names. */
export type StoredItem = { [A in KnowledgeApp]: { app: A; doc: Doc<A> } }[KnowledgeApp];

/** The item a ref points at if it exists in `workspaceId`; malformed or foreign ids → null. */
export async function getItem(ctx: Ctx, workspaceId: Id<'workspaces'>, ref: Pick<KnowledgeRef, 'app' | 'id'>): Promise<StoredItem | null> {
  const id = ctx.db.normalizeId(ref.app, ref.id);
  if (!id) return null;
  const doc = await ctx.db.get(id);
  return doc && doc.workspaceId === workspaceId ? ({ app: ref.app, doc } as StoredItem) : null;
}

/**
 * All documents of a workspace table, WITHOUT an access check: the caller must have checked
 * ownership (user-facing functions) or be internal (the pyramid runner).
 */
async function allInWorkspace<T extends WorkspaceTable>(ctx: Ctx, table: T, workspaceId: Id<'workspaces'>): Promise<Doc<T>[]> {
  const byWorkspace = ctx.db.query(table) as unknown as {
    withIndex(
      index: 'by_workspace',
      range: (q: { eq(field: 'workspaceId', value: Id<'workspaces'>): unknown }) => unknown,
    ): { collect(): Promise<Doc<T>[]> };
  };
  return byWorkspace.withIndex('by_workspace', (q) => q.eq('workspaceId', workspaceId)).collect();
}

/** Every item of a workspace, keyed by `refKey`. No access check (see `allInWorkspace`). */
export async function workspaceItems(ctx: Ctx, workspaceId: Id<'workspaces'>): Promise<Map<string, StoredItem>> {
  const items = new Map<string, StoredItem>();
  for (const app of KNOWLEDGE_APP_KEYS) {
    for (const doc of await allInWorkspace(ctx, app, workspaceId)) {
      items.set(refKey({ app, id: doc._id }), { app, doc } as StoredItem);
    }
  }
  return items;
}

const toRef = (app: KnowledgeApp, id: string): KnowledgeRef => ({ app, id });

export function linkToEdge(link: Doc<'links'>): KnowledgeEdge {
  return { from: toRef(link.fromApp, link.fromId), to: toRef(link.toApp, link.toId), kind: link.kind, source: 'explicit' };
}

/** Explicit and derived relations whose both ends are among `items`. No access check. */
export async function workspaceEdges(
  ctx: Ctx,
  workspaceId: Id<'workspaces'>,
  items: Map<string, StoredItem>,
): Promise<KnowledgeEdge[]> {
  const explicit = (await allInWorkspace(ctx, 'links', workspaceId)).map(linkToEdge);
  const derived = [...items.values()].flatMap((item) => derivedEdges(item as DerivedEdgeSource));
  return [...explicit, ...derived].filter((e) => items.has(refKey(e.from)) && items.has(refKey(e.to)));
}

/** Builds the serializer input of a stored item (loads pyramid cells, directory and pipeline titles). */
export async function toSource(ctx: Ctx, item: StoredItem): Promise<KnowledgeSource> {
  switch (item.app) {
    case 'pyramids': {
      const cells = await ctx.db
        .query('pyramidCells')
        .withIndex('by_pyramid', (q) => q.eq('pyramidId', item.doc._id))
        .collect();
      return { app: 'pyramids', doc: { ...item.doc, cells: Object.fromEntries(cells.map((c) => [c.label, c.cell])) } };
    }
    case 'contextDocuments': {
      const directory = item.doc.directoryId ? await ctx.db.get(item.doc.directoryId) : null;
      return { app: 'contextDocuments', doc: { ...item.doc, folder: directory?.title } };
    }
    case 'technicalTasks': {
      const pipeline = await ctx.db.get(item.doc.pipelineId);
      return { app: 'technicalTasks', doc: { ...item.doc, pipeline: pipeline?.title } };
    }
    default:
      return item as KnowledgeSource;
  }
}

/** Deletes every link from or to an item. Call before deleting the item. */
export async function deleteLinksOf(ctx: MutationCtx, id: string): Promise<void> {
  const outgoing = await ctx.db.query('links').withIndex('by_from', (q) => q.eq('fromId', id)).collect();
  const incoming = await ctx.db.query('links').withIndex('by_to', (q) => q.eq('toId', id)).collect();
  for (const link of [...outgoing, ...incoming]) await ctx.db.delete(link._id);
}
