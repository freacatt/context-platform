import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { createDefaultTechnicalPlan, normalizeTechnicalPlan, technicalPlanFromLegacyTask } from '../shared/specs/technicalPlan';
import type { ContextRef } from '../shared/pyramid/types';
import { listInWorkspace, requireOwnedWorkspace } from './lib/access';
import { insertSpecDoc, specDocFunctions } from './lib/specDocs';

export const { list, get, create, rename, update, duplicate, remove } = specDocFunctions('technicalPlans', {
  what: 'Technical plan',
  normalize: normalizeTechnicalPlan,
  initial: createDefaultTechnicalPlan,
});

/** Tasks of the retired Technical Tasks app still waiting to be converted. */
export const legacyTaskCount = query({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, { workspaceId }) => (await listInWorkspace(ctx, 'technicalTasks', workspaceId)).length,
});

/**
 * Turns every legacy technical task of the workspace into a technical plan, repoints links,
 * context packs and pyramid context to the plans, then deletes the tasks and their pipelines.
 */
export const convertLegacyTasks = mutation({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, { workspaceId }) => {
    await requireOwnedWorkspace(ctx, workspaceId);
    const tasks = await listInWorkspace(ctx, 'technicalTasks', workspaceId);
    const planIds = new Map<string, Id<'technicalPlans'>>();
    for (const task of [...tasks].sort((a, b) => a.order - b.order)) {
      const planId = await insertSpecDoc(ctx, 'technicalPlans', workspaceId, task.title, technicalPlanFromLegacyTask(task.data));
      planIds.set(task._id, planId);
      const architecture = task.technicalArchitectureId && (await ctx.db.get(task.technicalArchitectureId));
      if (architecture && architecture.workspaceId === workspaceId) {
        await ctx.db.insert('links', {
          workspaceId,
          fromApp: 'technicalPlans',
          fromId: planId,
          toApp: 'technicalArchitectures',
          toId: architecture._id,
          kind: 'depends-on',
          createdAt: Date.now(),
        });
      }
    }

    const seen = new Set<string>();
    for (const link of await listInWorkspace(ctx, 'links', workspaceId)) {
      const fromPlan = link.fromApp === 'technicalTasks' ? planIds.get(link.fromId) : undefined;
      const toPlan = link.toApp === 'technicalTasks' ? planIds.get(link.toId) : undefined;
      const fromId = fromPlan ?? link.fromId;
      const toId = toPlan ?? link.toId;
      const key = `${fromId}>${toId}>${link.kind}`;
      if ((link.fromApp === 'technicalTasks' && !fromPlan) || (link.toApp === 'technicalTasks' && !toPlan) || seen.has(key) || fromId === toId) {
        await ctx.db.delete(link._id);
        continue;
      }
      seen.add(key);
      if (fromPlan || toPlan) {
        await ctx.db.patch(link._id, {
          fromApp: fromPlan ? 'technicalPlans' : link.fromApp,
          fromId,
          toApp: toPlan ? 'technicalPlans' : link.toApp,
          toId,
        });
      }
    }

    for (const pack of await listInWorkspace(ctx, 'contextPacks', workspaceId)) {
      if (!pack.refs.some((r) => r.app === 'technicalTasks')) continue;
      await ctx.db.patch(pack._id, {
        refs: pack.refs.flatMap((r) => {
          if (r.app !== 'technicalTasks') return [r];
          const planId = planIds.get(r.id);
          return planId ? [{ app: 'technicalPlans' as const, id: planId }] : [];
        }),
      });
    }

    for (const pyramid of await listInWorkspace(ctx, 'pyramids', workspaceId)) {
      const refs = pyramid.config.contextRefs ?? [];
      if (!refs.some((r) => r.kind === 'item' && r.app === 'technicalTasks')) continue;
      const contextRefs = refs.flatMap((r): ContextRef[] => {
        if (r.kind !== 'item' || r.app !== 'technicalTasks') return [r];
        const planId = planIds.get(r.id);
        return planId ? [{ kind: 'item', app: 'technicalPlans', id: planId }] : [];
      });
      await ctx.db.patch(pyramid._id, { config: { ...pyramid.config, contextRefs } });
    }

    for (const task of tasks) await ctx.db.delete(task._id);
    for (const pipeline of await listInWorkspace(ctx, 'pipelines', workspaceId)) await ctx.db.delete(pipeline._id);
    return { converted: tasks.length };
  },
});

