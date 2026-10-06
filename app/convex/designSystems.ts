import { v } from 'convex/values';
import { mutation } from './_generated/server';
import { createDefaultDesignSystem, normalizeDesignSystem } from '../shared/specs/designSystem';
import { newEntryId } from '../shared/specs/primitives';
import { listInWorkspace, requireNonEmpty, requireOwnedDoc } from './lib/access';
import { specDocFunctions } from './lib/specDocs';

export const { list, get, create, rename, update, duplicate, remove } = specDocFunctions('designSystems', {
  what: 'Design system',
  normalize: normalizeDesignSystem,
  initial: createDefaultDesignSystem,
  // UI/UX architectures built with it no longer point at it.
  onRemove: async (ctx, id) => {
    const system = (await ctx.db.get(id))!;
    for (const architecture of await listInWorkspace(ctx, 'uiUxArchitectures', system.workspaceId)) {
      if (architecture.designSystemId === id) await ctx.db.patch(architecture._id, { designSystemId: undefined });
    }
  },
});

/**
 * Adds one component (e.g. from a UI/UX architecture built with this system). Appends on the
 * server so it never overwrites edits made in the design system editor meanwhile.
 */
export const addComponent = mutation({
  args: {
    id: v.id('designSystems'),
    component: v.object({
      name: v.string(),
      category: v.optional(v.string()),
      purpose: v.optional(v.string()),
      variants: v.optional(v.array(v.string())),
      states: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, { id, component }) => {
    const system = await requireOwnedDoc(ctx, id, 'Design system');
    const spec = normalizeDesignSystem(system.spec);
    const componentId = newEntryId();
    const next = normalizeDesignSystem({
      ...spec,
      components: [...spec.components, { ...component, id: componentId, name: requireNonEmpty(component.name, 'Component name') }],
    });
    await ctx.db.patch(id, { spec: next, updatedAt: Date.now() });
    return componentId;
  },
});
