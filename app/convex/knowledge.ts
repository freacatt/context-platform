import { v } from 'convex/values';
import { query } from './_generated/server';
import { getOwnedWorkspace } from './lib/access';
import { toSource, workspaceEdges, workspaceItems } from './lib/knowledge';
import { knowledgeRefValidator } from './schema';
import { edgesWithin, linkClosure } from '../shared/knowledge/graph';
import { toKnowledgeItem } from '../shared/knowledge/serializers';
import { refKey, type KnowledgeItem } from '../shared/knowledge/types';

/** Every item of the workspace, light (for pickers). */
export const catalog = query({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, { workspaceId }) => {
    if (!(await getOwnedWorkspace(ctx, workspaceId))) return [];
    return [...(await workspaceItems(ctx, workspaceId)).values()].map(({ app, doc }) => ({
      app,
      id: doc._id as string,
      title: doc.title,
      updatedAt: doc.updatedAt,
    }));
  },
});

/**
 * The selected items plus everything linked to them within `linkDepth` hops (-1 = all),
 * serialized as knowledge items, with the relations between them. Unknown or foreign refs are skipped.
 */
export const collect = query({
  args: { workspaceId: v.id('workspaces'), refs: v.array(knowledgeRefValidator), linkDepth: v.number() },
  handler: async (ctx, { workspaceId, refs, linkDepth }) => {
    const workspace = await getOwnedWorkspace(ctx, workspaceId);
    if (!workspace) return null;
    const items = await workspaceItems(ctx, workspaceId);
    const edges = await workspaceEdges(ctx, workspaceId, items);
    const seeds = refs.filter((r) => items.has(refKey(r)));
    const reached = linkClosure(seeds, edges, linkDepth);

    const out: KnowledgeItem[] = [];
    for (const ref of reached) out.push(toKnowledgeItem(await toSource(ctx, items.get(refKey(ref))!)));
    return {
      workspaceName: workspace.name,
      items: out,
      edges: edgesWithin(edges, new Set(reached.map(refKey))),
    };
  },
});

/** Every item and every relation of the workspace (for the knowledge graph). */
export const graph = query({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, { workspaceId }) => {
    if (!(await getOwnedWorkspace(ctx, workspaceId))) return null;
    const items = await workspaceItems(ctx, workspaceId);
    const edges = await workspaceEdges(ctx, workspaceId, items);
    return {
      nodes: [...items.values()].map(({ app, doc }) => ({ app, id: doc._id as string, title: doc.title })),
      edges: edgesWithin(edges, new Set(items.keys())).map((e) => ({ from: refKey(e.from), to: refKey(e.to), kind: e.kind, source: e.source })),
    };
  },
});
