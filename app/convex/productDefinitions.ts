import { v } from 'convex/values';
import type { Doc } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { productSpecOf } from '../shared/knowledge/serializers';
import { createDefaultProductSpec, normalizeProductSpec } from '../shared/specs/productSpec';
import {
  byRecentlyUpdated,
  getOwnedDocById,
  listInWorkspace,
  requireNonEmpty,
  requireOwnedDoc,
  requireOwnedWorkspace,
} from './lib/access';
import { deleteLinksOf } from './lib/knowledge';

/** The document with its product spec (built from the previous mind-map version until first saved). */
const withSpec = ({ data: _legacy, ...doc }: Doc<'productDefinitions'>) => ({ ...doc, spec: productSpecOf({ spec: doc.spec, data: _legacy }) });

export const list = query({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, { workspaceId }) =>
    (await listInWorkspace(ctx, 'productDefinitions', workspaceId)).sort(byRecentlyUpdated).map(withSpec),
});

/** Accepts any string (e.g. a URL segment); unknown or foreign ids return null. */
export const get = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const doc = await getOwnedDocById(ctx, 'productDefinitions', id);
    return doc ? withSpec(doc) : null;
  },
});

export const create = mutation({
  args: { workspaceId: v.id('workspaces'), title: v.string() },
  handler: async (ctx, { workspaceId, title }) => {
    await requireOwnedWorkspace(ctx, workspaceId);
    return ctx.db.insert('productDefinitions', {
      workspaceId,
      title: requireNonEmpty(title, 'Title'),
      spec: createDefaultProductSpec(),
      updatedAt: Date.now(),
    });
  },
});

export const rename = mutation({
  args: { id: v.id('productDefinitions'), title: v.string() },
  handler: async (ctx, { id, title }) => {
    await requireOwnedDoc(ctx, id, 'Product definition');
    await ctx.db.patch(id, { title: requireNonEmpty(title, 'Title'), updatedAt: Date.now() });
  },
});

/** Replaces the spec (normalized). The previous mind-map version is dropped once a spec is saved. */
export const update = mutation({
  args: { id: v.id('productDefinitions'), spec: v.any() },
  handler: async (ctx, { id, spec }) => {
    await requireOwnedDoc(ctx, id, 'Product definition');
    await ctx.db.patch(id, { spec: normalizeProductSpec(spec), data: undefined, updatedAt: Date.now() });
  },
});

export const duplicate = mutation({
  args: { id: v.id('productDefinitions') },
  handler: async (ctx, { id }) => {
    const doc = await requireOwnedDoc(ctx, id, 'Product definition');
    return ctx.db.insert('productDefinitions', {
      workspaceId: doc.workspaceId,
      title: `${doc.title} (Copy)`,
      spec: productSpecOf(doc),
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id('productDefinitions') },
  handler: async (ctx, { id }) => {
    await requireOwnedDoc(ctx, id, 'Product definition');
    await deleteLinksOf(ctx, id);
    await ctx.db.delete(id);
  },
});
