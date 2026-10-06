import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import {
  getOwnedDocById,
  listInWorkspace,
  requireNonEmpty,
  requireOwnedDoc,
  requireOwnedWorkspace,
} from './lib/access';

export const list = query({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, { workspaceId }) =>
    (await listInWorkspace(ctx, 'directories', workspaceId)).sort((a, b) =>
      a.title.localeCompare(b.title),
    ),
});

/** Accepts any string (e.g. a URL segment); unknown or foreign ids return null. */
export const get = query({
  args: { id: v.string() },
  handler: (ctx, { id }) => getOwnedDocById(ctx, 'directories', id),
});

export const create = mutation({
  args: { workspaceId: v.id('workspaces'), title: v.string() },
  handler: async (ctx, { workspaceId, title }) => {
    await requireOwnedWorkspace(ctx, workspaceId);
    return ctx.db.insert('directories', {
      workspaceId,
      title: requireNonEmpty(title, 'Name'),
      updatedAt: Date.now(),
    });
  },
});

export const rename = mutation({
  args: { id: v.id('directories'), title: v.string() },
  handler: async (ctx, { id, title }) => {
    await requireOwnedDoc(ctx, id, 'Directory');
    await ctx.db.patch(id, { title: requireNonEmpty(title, 'Name'), updatedAt: Date.now() });
  },
});

/** Deletes a directory; its documents move back to the root, they are not deleted. */
export const remove = mutation({
  args: { id: v.id('directories') },
  handler: async (ctx, { id }) => {
    await requireOwnedDoc(ctx, id, 'Directory');
    const documents = await ctx.db
      .query('contextDocuments')
      .withIndex('by_directory', (q) => q.eq('directoryId', id))
      .collect();
    const now = Date.now();
    for (const doc of documents) {
      await ctx.db.patch(doc._id, { directoryId: undefined, updatedAt: now });
    }
    await ctx.db.delete(id);
  },
});
