import { v } from 'convex/values';
import type { Doc } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import {
  createDefaultTechnicalArchitecture,
  normalizeTechnicalArchitecture,
  technicalArchitectureSpecOf,
} from '../shared/specs/technicalArchitecture';
import { TECHNICAL_ARCHITECTURE_SECTIONS } from '../shared/types/technicalArchitecture';
import {
  byRecentlyUpdated,
  getOwnedDocById,
  listInWorkspace,
  requireNonEmpty,
  requireOwnedDoc,
  requireOwnedWorkspace,
} from './lib/access';
import { deleteLinksOf } from './lib/knowledge';

/** Clears the previous version's sections once a spec is saved. */
const NO_LEGACY_SECTIONS = Object.fromEntries(TECHNICAL_ARCHITECTURE_SECTIONS.map((section) => [section, undefined]));

/** The document with its spec (built from the previous version's sections until first saved). */
function withSpec(doc: Doc<'technicalArchitectures'>) {
  return { _id: doc._id, _creationTime: doc._creationTime, workspaceId: doc.workspaceId, title: doc.title, updatedAt: doc.updatedAt, spec: technicalArchitectureSpecOf(doc) };
}

export const list = query({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, { workspaceId }) =>
    (await listInWorkspace(ctx, 'technicalArchitectures', workspaceId)).sort(byRecentlyUpdated).map(withSpec),
});

/** Accepts any string (e.g. a URL segment); unknown or foreign ids return null. */
export const get = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const doc = await getOwnedDocById(ctx, 'technicalArchitectures', id);
    return doc ? withSpec(doc) : null;
  },
});

export const create = mutation({
  args: { workspaceId: v.id('workspaces'), title: v.string() },
  handler: async (ctx, { workspaceId, title }) => {
    await requireOwnedWorkspace(ctx, workspaceId);
    return ctx.db.insert('technicalArchitectures', {
      workspaceId,
      title: requireNonEmpty(title, 'Title'),
      spec: createDefaultTechnicalArchitecture(),
      updatedAt: Date.now(),
    });
  },
});

export const rename = mutation({
  args: { id: v.id('technicalArchitectures'), title: v.string() },
  handler: async (ctx, { id, title }) => {
    await requireOwnedDoc(ctx, id, 'Technical architecture');
    await ctx.db.patch(id, { title: requireNonEmpty(title, 'Title'), updatedAt: Date.now() });
  },
});

/** Replaces the spec (normalized). */
export const update = mutation({
  args: { id: v.id('technicalArchitectures'), spec: v.any() },
  handler: async (ctx, { id, spec }) => {
    await requireOwnedDoc(ctx, id, 'Technical architecture');
    await ctx.db.patch(id, { ...NO_LEGACY_SECTIONS, spec: normalizeTechnicalArchitecture(spec), updatedAt: Date.now() });
  },
});

export const duplicate = mutation({
  args: { id: v.id('technicalArchitectures') },
  handler: async (ctx, { id }) => {
    const doc = await requireOwnedDoc(ctx, id, 'Technical architecture');
    return ctx.db.insert('technicalArchitectures', {
      workspaceId: doc.workspaceId,
      title: `${doc.title} (Copy)`,
      spec: technicalArchitectureSpecOf(doc),
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id('technicalArchitectures') },
  handler: async (ctx, { id }) => {
    await requireOwnedDoc(ctx, id, 'Technical architecture');
    await deleteLinksOf(ctx, id);
    await ctx.db.delete(id);
  },
});
