import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { getOwnedWorkspace, requireOwnedDoc, requireOwnedWorkspace, notFound } from './lib/access';
import { getItem, workspaceEdges, workspaceItems } from './lib/knowledge';
import { knowledgeAppValidator, knowledgeRefValidator, linkKindValidator } from './schema';
import { refKey } from '../shared/knowledge/types';

/**
 * Links and backlinks of one item, explicit and derived, with the other end's title.
 * `linkId` is set on explicit links (the ones that can be removed).
 */
export const listForItem = query({
  args: { workspaceId: v.id('workspaces'), app: knowledgeAppValidator, id: v.string() },
  handler: async (ctx, { workspaceId, app, id }) => {
    const empty = { outgoing: [], incoming: [] };
    if (!(await getOwnedWorkspace(ctx, workspaceId))) return empty;
    const items = await workspaceItems(ctx, workspaceId);
    const self = refKey({ app, id });
    if (!items.has(self)) return empty;

    const linkIds = new Map(
      [
        ...(await ctx.db.query('links').withIndex('by_from', (q) => q.eq('fromId', id)).collect()),
        ...(await ctx.db.query('links').withIndex('by_to', (q) => q.eq('toId', id)).collect()),
      ].map((l) => [`${l.fromId}>${l.toId}>${l.kind}`, l._id]),
    );
    const edges = await workspaceEdges(ctx, workspaceId, items);
    const entry = (other: { app: typeof app; id: string }, edge: (typeof edges)[number]) => ({
      app: other.app,
      id: other.id,
      title: items.get(refKey(other))!.doc.title,
      kind: edge.kind,
      source: edge.source,
      linkId: edge.source === 'explicit' ? linkIds.get(`${edge.from.id}>${edge.to.id}>${edge.kind}`) ?? null : null,
    });
    return {
      outgoing: edges.filter((e) => refKey(e.from) === self).map((e) => entry(e.to, e)),
      incoming: edges.filter((e) => refKey(e.to) === self).map((e) => entry(e.from, e)),
    };
  },
});

export const create = mutation({
  args: {
    workspaceId: v.id('workspaces'),
    from: knowledgeRefValidator,
    to: knowledgeRefValidator,
    kind: linkKindValidator,
  },
  handler: async (ctx, { workspaceId, from, to, kind }) => {
    await requireOwnedWorkspace(ctx, workspaceId);
    const source = await getItem(ctx, workspaceId, from);
    const target = await getItem(ctx, workspaceId, to);
    if (!source || !target) throw notFound('Item');
    if (source.doc._id === target.doc._id) throw new ConvexError('An item cannot link to itself');
    const existing = await ctx.db
      .query('links')
      .withIndex('by_from', (q) => q.eq('fromId', source.doc._id))
      .collect();
    if (existing.some((l) => l.toId === target.doc._id && l.kind === kind)) {
      throw new ConvexError('That link already exists');
    }
    return ctx.db.insert('links', {
      workspaceId,
      fromApp: source.app,
      fromId: source.doc._id,
      toApp: target.app,
      toId: target.doc._id,
      kind,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id('links') },
  handler: async (ctx, { id }) => {
    await requireOwnedDoc(ctx, id, 'Link');
    await ctx.db.delete(id);
  },
});
