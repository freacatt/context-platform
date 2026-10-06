/** Text files uploaded as context of one pyramid. They are private to it. */
import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { EDITABLE_STATUSES } from '../shared/pyramid/types';
import { getOwnedDocById, requireNonEmpty, requireOwnedDoc } from './lib/access';

/** Per file (characters). A Convex document holds at most 1 MB. */
export const MAX_FILE_CHARS = 500_000;
export const MAX_FILES_PER_PYRAMID = 100;

export const list = query({
  args: { pyramidId: v.string() },
  handler: async (ctx, { pyramidId }) => {
    const pyramid = await getOwnedDocById(ctx, 'pyramids', pyramidId);
    if (!pyramid) return [];
    const files = await ctx.db
      .query('pyramidFiles')
      .withIndex('by_pyramid', (q) => q.eq('pyramidId', pyramid._id))
      .collect();
    return files.map((f) => ({ _id: f._id, title: f.title, chars: f.content.length, updatedAt: f.updatedAt }));
  },
});

/** Stores one file. The caller adds `{ kind: 'file', id }` to the setup's context refs. */
export const add = mutation({
  args: { pyramidId: v.id('pyramids'), title: v.string(), content: v.string() },
  handler: async (ctx, { pyramidId, title, content }) => {
    const pyramid = await requireOwnedDoc(ctx, pyramidId, 'Pyramid');
    if (!EDITABLE_STATUSES.includes(pyramid.status)) throw new ConvexError('Files can only be added before the run starts');
    if (content.length > MAX_FILE_CHARS) throw new ConvexError(`${title} is larger than ${MAX_FILE_CHARS.toLocaleString('en-US')} characters`);
    const existing = await ctx.db
      .query('pyramidFiles')
      .withIndex('by_pyramid', (q) => q.eq('pyramidId', pyramidId))
      .collect();
    if (existing.length >= MAX_FILES_PER_PYRAMID) throw new ConvexError(`A pyramid can have at most ${MAX_FILES_PER_PYRAMID} files`);
    return ctx.db.insert('pyramidFiles', {
      workspaceId: pyramid.workspaceId,
      pyramidId,
      title: requireNonEmpty(title, 'File name'),
      content,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id('pyramidFiles') },
  handler: async (ctx, { id }) => {
    const file = await requireOwnedDoc(ctx, id, 'File');
    const pyramid = await ctx.db.get(file.pyramidId);
    if (pyramid && !EDITABLE_STATUSES.includes(pyramid.status)) throw new ConvexError('Files can only be removed before the run starts');
    await ctx.db.delete(id);
  },
});
