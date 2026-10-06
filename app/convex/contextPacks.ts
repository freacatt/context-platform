import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import {
  byRecentlyUpdated,
  listInWorkspace,
  requireNonEmpty,
  requireOwnedDoc,
  requireOwnedWorkspace,
} from './lib/access';
import { knowledgeRefValidator } from './schema';
import { ALL_LINKS } from '../shared/knowledge/graph';

/** -1 (all) or a whole number of hops. */
const normalizeDepth = (depth: number) => (depth === ALL_LINKS ? ALL_LINKS : Math.max(0, Math.floor(depth)));

export const list = query({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, { workspaceId }) =>
    (await listInWorkspace(ctx, 'contextPacks', workspaceId)).sort(byRecentlyUpdated),
});

export const create = mutation({
  args: { workspaceId: v.id('workspaces'), title: v.string(), refs: v.array(knowledgeRefValidator), linkDepth: v.number() },
  handler: async (ctx, { workspaceId, title, refs, linkDepth }) => {
    await requireOwnedWorkspace(ctx, workspaceId);
    return ctx.db.insert('contextPacks', {
      workspaceId,
      title: requireNonEmpty(title, 'Title'),
      refs,
      linkDepth: normalizeDepth(linkDepth),
      updatedAt: Date.now(),
    });
  },
});

/** Replaces the selection and/or renames. */
export const update = mutation({
  args: {
    id: v.id('contextPacks'),
    title: v.optional(v.string()),
    refs: v.optional(v.array(knowledgeRefValidator)),
    linkDepth: v.optional(v.number()),
  },
  handler: async (ctx, { id, title, refs, linkDepth }) => {
    await requireOwnedDoc(ctx, id, 'Context pack');
    await ctx.db.patch(id, {
      ...(title !== undefined && { title: requireNonEmpty(title, 'Title') }),
      ...(refs !== undefined && { refs }),
      ...(linkDepth !== undefined && { linkDepth: normalizeDepth(linkDepth) }),
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id('contextPacks') },
  handler: async (ctx, { id }) => {
    await requireOwnedDoc(ctx, id, 'Context pack');
    await ctx.db.delete(id);
  },
});
