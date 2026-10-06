import { v } from 'convex/values';
import { mutation } from './_generated/server';
import { finalLabel } from '../shared/pyramid/board';
import { createDefaultDecision, normalizeDecision } from '../shared/specs/decision';
import { requireOwnedDoc } from './lib/access';
import { insertSpecDoc, specDocFunctions } from './lib/specDocs';
import { ConvexError } from 'convex/values';

const today = () => new Date().toISOString().slice(0, 10);

export const { list, get, create, rename, update, duplicate, remove } = specDocFunctions('decisions', {
  what: 'Decision',
  normalize: normalizeDecision,
  initial: () => createDefaultDecision(today()),
});

/**
 * Records a pyramid's final answer as a proposed decision: the question becomes the context,
 * the conclusion the decision, dissent the consequences to watch. Linked back to the pyramid.
 */
export const createFromPyramid = mutation({
  args: { pyramidId: v.id('pyramids') },
  handler: async (ctx, { pyramidId }) => {
    const pyramid = await requireOwnedDoc(ctx, pyramidId, 'Pyramid');
    const label = finalLabel(pyramid.config.boardSize);
    const final = await ctx.db
      .query('pyramidCells')
      .withIndex('by_pyramid', (q) => q.eq('pyramidId', pyramidId))
      .filter((q) => q.eq(q.field('label'), label))
      .first();
    if (!final) throw new ConvexError('The pyramid has no final answer yet');
    const dissent = final.cell.dissent.filter((d) => d.trim());
    const spec = normalizeDecision({
      status: 'proposed',
      date: today(),
      context: [pyramid.config.question, pyramid.config.context.trim()].filter(Boolean).join('\n\n'),
      decision: final.cell.conclusion,
      consequences: dissent.length ? `Dissent raised by the panel:\n${dissent.map((d) => `- ${d}`).join('\n')}` : '',
    });
    const id = await insertSpecDoc(ctx, 'decisions', pyramid.workspaceId, pyramid.title, spec);
    await ctx.db.insert('links', {
      workspaceId: pyramid.workspaceId,
      fromApp: 'decisions',
      fromId: id,
      toApp: 'pyramids',
      toId: pyramidId,
      kind: 'derived-from',
      createdAt: Date.now(),
    });
    return id;
  },
});
