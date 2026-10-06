import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import {
  byRecentlyUpdated,
  getOwnedDoc,
  getOwnedDocById,
  getOwnedWorkspace,
  listInWorkspace,
  requireNonEmpty,
  requireOwnedDoc,
  requireOwnedWorkspace,
} from './lib/access';
import { deleteLinksOf } from './lib/knowledge';

/** A directory may only be assigned if it is in the same workspace as the document. */
async function assertDirectoryInWorkspace(
  ctx: MutationCtx,
  directoryId: Id<'directories'> | undefined,
  workspaceId: Id<'workspaces'>,
) {
  if (!directoryId) return;
  const directory = await ctx.db.get(directoryId);
  if (!directory || directory.workspaceId !== workspaceId) {
    throw new ConvexError('Directory not found');
  }
}

export const list = query({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, { workspaceId }) =>
    (await listInWorkspace(ctx, 'contextDocuments', workspaceId)).sort(byRecentlyUpdated),
});

export const listInDirectory = query({
  args: { directoryId: v.id('directories') },
  handler: async (ctx, { directoryId }) => {
    const directory = await getOwnedDoc(ctx, directoryId);
    if (!directory || !(await getOwnedWorkspace(ctx, directory.workspaceId))) return [];
    const docs = await ctx.db
      .query('contextDocuments')
      .withIndex('by_directory', (q) => q.eq('directoryId', directoryId))
      .collect();
    return docs.sort(byRecentlyUpdated);
  },
});

/** Accepts any string (e.g. a URL segment); unknown or foreign ids return null. */
export const get = query({
  args: { id: v.string() },
  handler: (ctx, { id }) => getOwnedDocById(ctx, 'contextDocuments', id),
});

export const create = mutation({
  args: {
    workspaceId: v.id('workspaces'),
    title: v.string(),
    type: v.optional(v.string()),
    directoryId: v.optional(v.id('directories')),
  },
  handler: async (ctx, { workspaceId, title, type, directoryId }) => {
    await requireOwnedWorkspace(ctx, workspaceId);
    await assertDirectoryInWorkspace(ctx, directoryId, workspaceId);
    return ctx.db.insert('contextDocuments', {
      workspaceId,
      title: requireNonEmpty(title, 'Title'),
      type: type ?? 'text',
      content: '',
      directoryId,
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id('contextDocuments'),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    type: v.optional(v.string()),
  },
  handler: async (ctx, { id, title, content, type }) => {
    await requireOwnedDoc(ctx, id, 'Document');
    await ctx.db.patch(id, {
      ...(title !== undefined && { title: requireNonEmpty(title, 'Title') }),
      ...(content !== undefined && { content }),
      ...(type !== undefined && { type }),
      updatedAt: Date.now(),
    });
  },
});

/** Moves a document into a directory, or back to the root when directoryId is null. */
export const moveToDirectory = mutation({
  args: { id: v.id('contextDocuments'), directoryId: v.union(v.id('directories'), v.null()) },
  handler: async (ctx, { id, directoryId }) => {
    const doc = await requireOwnedDoc(ctx, id, 'Document');
    await assertDirectoryInWorkspace(ctx, directoryId ?? undefined, doc.workspaceId);
    await ctx.db.patch(id, { directoryId: directoryId ?? undefined, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id('contextDocuments') },
  handler: async (ctx, { id }) => {
    await requireOwnedDoc(ctx, id, 'Document');
    await deleteLinksOf(ctx, id);
    await ctx.db.delete(id);
  },
});
