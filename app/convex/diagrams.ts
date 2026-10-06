import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import {
  byRecentlyUpdated,
  getOwnedDocById,
  listInWorkspace,
  requireNonEmpty,
  requireOwnedDoc,
  requireOwnedWorkspace,
} from './lib/access';
import { deleteLinksOf } from './lib/knowledge';

export const list = query({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, { workspaceId }) =>
    (await listInWorkspace(ctx, 'diagrams', workspaceId)).sort(byRecentlyUpdated),
});

/** Accepts any string (e.g. a URL segment); unknown or foreign ids return null. */
export const get = query({
  args: { id: v.string() },
  handler: (ctx, { id }) => getOwnedDocById(ctx, 'diagrams', id),
});

export const create = mutation({
  args: { workspaceId: v.id('workspaces'), title: v.string() },
  handler: async (ctx, { workspaceId, title }) => {
    await requireOwnedWorkspace(ctx, workspaceId);
    return ctx.db.insert('diagrams', {
      workspaceId,
      title: requireNonEmpty(title, 'Title'),
      nodes: [],
      edges: [],
      updatedAt: Date.now(),
    });
  },
});

export const rename = mutation({
  args: { id: v.id('diagrams'), title: v.string() },
  handler: async (ctx, { id, title }) => {
    await requireOwnedDoc(ctx, id, 'Diagram');
    await ctx.db.patch(id, { title: requireNonEmpty(title, 'Title'), updatedAt: Date.now() });
  },
});

export const saveGraph = mutation({
  args: { id: v.id('diagrams'), nodes: v.array(v.any()), edges: v.array(v.any()) },
  handler: async (ctx, { id, nodes, edges }) => {
    await requireOwnedDoc(ctx, id, 'Diagram');
    await ctx.db.patch(id, { nodes, edges, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id('diagrams') },
  handler: async (ctx, { id }) => {
    await requireOwnedDoc(ctx, id, 'Diagram');
    await deleteLinksOf(ctx, id);
    await ctx.db.delete(id);
  },
});
