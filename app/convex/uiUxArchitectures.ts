import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { createDefaultUiUxArchitecture } from '../shared/uiUxArchitecture';
import { designSystemFromLegacyUiUx, hasLegacyDesign } from '../shared/specs/designSystem';
import {
  byRecentlyUpdated,
  getOwnedDocById,
  listInWorkspace,
  notFound,
  requireNonEmpty,
  requireOwnedDoc,
  requireOwnedWorkspace,
} from './lib/access';
import { deleteLinksOf } from './lib/knowledge';
import { insertSpecDoc } from './lib/specDocs';

export const list = query({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, { workspaceId }) =>
    (await listInWorkspace(ctx, 'uiUxArchitectures', workspaceId)).sort(byRecentlyUpdated),
});

/** Accepts any string (e.g. a URL segment); unknown or foreign ids return null. */
export const get = query({
  args: { id: v.string() },
  handler: (ctx, { id }) => getOwnedDocById(ctx, 'uiUxArchitectures', id),
});

export const create = mutation({
  args: { workspaceId: v.id('workspaces'), title: v.string() },
  handler: async (ctx, { workspaceId, title }) => {
    await requireOwnedWorkspace(ctx, workspaceId);
    return ctx.db.insert('uiUxArchitectures', {
      workspaceId,
      title: requireNonEmpty(title, 'Title'),
      ...createDefaultUiUxArchitecture(),
      updatedAt: Date.now(),
    });
  },
});

export const rename = mutation({
  args: { id: v.id('uiUxArchitectures'), title: v.string() },
  handler: async (ctx, { id, title }) => {
    await requireOwnedDoc(ctx, id, 'UI/UX architecture');
    await ctx.db.patch(id, { title: requireNonEmpty(title, 'Title'), updatedAt: Date.now() });
  },
});

export const updateSections = mutation({
  args: {
    id: v.id('uiUxArchitectures'),
    sections: v.object({
      ui_ux_architecture_metadata: v.optional(v.any()),
      pages: v.optional(v.array(v.any())),
      ux_patterns: v.optional(v.any()),
    }),
  },
  handler: async (ctx, { id, sections }) => {
    await requireOwnedDoc(ctx, id, 'UI/UX architecture');
    const defined = Object.fromEntries(
      Object.entries(sections).filter(([, value]) => value !== undefined),
    );
    await ctx.db.patch(id, { ...defined, updatedAt: Date.now() });
  },
});

/** Sets (or clears, with null) the design system the screens are built with. */
export const setDesignSystem = mutation({
  args: { id: v.id('uiUxArchitectures'), designSystemId: v.union(v.id('designSystems'), v.null()) },
  handler: async (ctx, { id, designSystemId }) => {
    const architecture = await requireOwnedDoc(ctx, id, 'UI/UX architecture');
    if (designSystemId) {
      const system = await ctx.db.get(designSystemId);
      if (!system || system.workspaceId !== architecture.workspaceId) throw notFound('Design system');
    }
    await ctx.db.patch(id, { designSystemId: designSystemId ?? undefined, updatedAt: Date.now() });
  },
});

/**
 * Moves the theme and base components of a previous-version architecture into a new design
 * system, links the architecture to it, and clears them from the architecture.
 */
export const extractDesignSystem = mutation({
  args: { id: v.id('uiUxArchitectures') },
  handler: async (ctx, { id }) => {
    const architecture = await requireOwnedDoc(ctx, id, 'UI/UX architecture');
    if (!hasLegacyDesign(architecture.theme_specification, architecture.base_components)) {
      throw new ConvexError('This architecture has no theme or components to move');
    }
    const spec = designSystemFromLegacyUiUx(architecture.theme_specification, architecture.base_components);
    const designSystemId = await insertSpecDoc(ctx, 'designSystems', architecture.workspaceId, `${architecture.title} design system`, spec);
    await ctx.db.patch(id, { designSystemId, theme_specification: undefined, base_components: undefined, updatedAt: Date.now() });
    return designSystemId;
  },
});

export const remove = mutation({
  args: { id: v.id('uiUxArchitectures') },
  handler: async (ctx, { id }) => {
    await requireOwnedDoc(ctx, id, 'UI/UX architecture');
    await deleteLinksOf(ctx, id);
    await ctx.db.delete(id);
  },
});
