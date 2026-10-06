/**
 * Executes Pyramid Solver runs. Each `step` is one scheduled action that writes the brief or
 * runs one row (blind round → critique → host), then commits it and schedules the next step.
 *
 * Safety:
 * - Every call is recorded as it finishes (append-only) and adds to `spent`, so spend stays
 *   truthful even for a row that later fails or is cancelled.
 * - A row commits atomically (cells + row result + status) and only if the run is still
 *   `running` under the same `executionId`: cancel/resume elsewhere make a late commit a no-op.
 * - The budget guard stops before any call once spent ≥ cap, and pauses at a row boundary when
 *   the remaining rows are projected to pass the cap.
 * - A watchdog fails a run whose runner died (actions are capped at 10 minutes); resume retries.
 */
import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { internalAction, internalMutation, internalQuery, type MutationCtx } from './_generated/server';
import type { CostEstimate } from '../shared/pyramid/types';
import { lastRow } from '../shared/pyramid/board';
import { ConfigError, hasContext, RAW_CONTEXT_MAX_CHARS, validatePyramidConfig } from '../shared/pyramid/config';
import { estimate, pricingMap, remainingExpected, tokenAverages, UnknownModelError } from '../shared/pyramid/cost';
import { formatMoney, parseMoney, tryParseMoney } from '../shared/pyramid/money';
import { buildRawContext, buildRowContext } from '../shared/pyramid/rowContext';
import { BudgetExceededError, BudgetGuard, Caller, makeBrief, runRow } from '../shared/pyramid/roundtable';
import { chatMessageValidator, hostCellValidator, pyramidConfigValidator } from './schema';
import { loadModels, requireAiAccess } from './lib/ai';
import * as openrouter from './lib/openrouter';
import { contextTooLarge, resolveContext } from './lib/pyramidContext';

/** How long after a step is scheduled the watchdog checks that its runner is alive. */
const WATCHDOG_DELAY_MS = 12 * 60 * 1000;
/** No call recorded for this long while `running` means the runner died. */
const HEARTBEAT_TIMEOUT_MS = 10 * 60 * 1000;

const newExecutionId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Thrown inside a runner whose run was cancelled, deleted or taken over by another execution. */
class StoppedError extends Error {}

/** Gives the run a fresh execution id and schedules its next step (plus a watchdog). */
export async function startExecution(ctx: MutationCtx, id: Id<'pyramids'>) {
  const executionId = newExecutionId();
  await ctx.db.patch(id, { executionId });
  await scheduleStep(ctx, id, executionId);
}

async function scheduleStep(ctx: MutationCtx, id: Id<'pyramids'>, executionId: string) {
  await ctx.scheduler.runAfter(0, internal.pyramidRunner.step, { id, executionId });
  await ctx.scheduler.runAfter(WATCHDOG_DELAY_MS, internal.pyramidRunner.watchdog, { id, executionId });
}

const isCurrent = (p: Doc<'pyramids'> | null, executionId: string): p is Doc<'pyramids'> =>
  !!p && p.status === 'running' && p.executionId === executionId;

// --- estimate --------------------------------------------------------------------------------

/** Owner-checked data for an estimate: the pyramid and the size of its raw context. */
export const loadForEstimate = internalQuery({
  args: { id: v.id('pyramids'), userId: v.id('users') },
  handler: async (ctx, { id, userId }) => {
    const pyramid = await ctx.db.get(id);
    const workspace = pyramid && (await ctx.db.get(pyramid.workspaceId));
    if (!pyramid || workspace?.ownerId !== userId) return null;
    const contextChars = buildRawContext(pyramid.config.context, await resolveContext(ctx, pyramid)).length;
    if (contextChars > RAW_CONTEXT_MAX_CHARS) throw contextTooLarge(contextChars, RAW_CONTEXT_MAX_CHARS);
    return { pyramid, contextChars };
  },
});

export const estimateFor = internalAction({
  args: { id: v.id('pyramids'), userId: v.id('users') },
  handler: async (ctx, { id, userId }): Promise<CostEstimate> => {
    const loaded = await ctx.runQuery(internal.pyramidRunner.loadForEstimate, { id, userId });
    if (!loaded) throw new ConvexError('Pyramid not found');
    if (loaded.pyramid.status !== 'draft' && loaded.pyramid.status !== 'estimated') {
      throw new ConvexError('Only a pyramid that has not started can be estimated');
    }
    let config;
    try {
      config = validatePyramidConfig(loaded.pyramid.config);
    } catch (error) {
      throw error instanceof ConfigError ? new ConvexError(error.message) : error;
    }
    await requireAiAccess(ctx, userId); // fail now, not after confirming
    const pricing = pricingMap(await loadModels(ctx));
    let result: CostEstimate;
    try {
      result = estimate(config, pricing, loaded.contextChars);
    } catch (error) {
      throw error instanceof UnknownModelError ? new ConvexError(error.message) : error;
    }
    await ctx.runMutation(internal.pyramidRunner.saveEstimate, {
      id,
      config: config as Doc<'pyramids'>['config'],
      expectedUpdatedAt: loaded.pyramid.updatedAt,
      estimate: result,
    });
    return result;
  },
});

export const saveEstimate = internalMutation({
  args: {
    id: v.id('pyramids'),
    config: pyramidConfigValidator,
    expectedUpdatedAt: v.number(),
    estimate: v.object({
      low: v.string(),
      expected: v.string(),
      high: v.string(),
      calls: v.record(v.string(), v.number()),
      perModel: v.record(v.string(), v.string()),
    }),
  },
  handler: async (ctx, { id, config, expectedUpdatedAt, estimate }) => {
    const pyramid = await ctx.db.get(id);
    // The setup changed while we were pricing it: the estimate is for an old setup.
    if (!pyramid || pyramid.updatedAt !== expectedUpdatedAt || (pyramid.status !== 'draft' && pyramid.status !== 'estimated')) {
      throw new ConvexError('The setup changed while estimating; estimate again');
    }
    await ctx.db.patch(id, { config, estimate, status: 'estimated', updatedAt: Date.now() });
  },
});

// --- execution -----------------------------------------------------------------------------

/** Everything a step needs, or null when this execution should not run. */
export const loadStep = internalQuery({
  args: { id: v.id('pyramids'), executionId: v.string() },
  handler: async (ctx, { id, executionId }) => {
    const pyramid = await ctx.db.get(id);
    if (!isCurrent(pyramid, executionId)) return null;
    const workspace = await ctx.db.get(pyramid.workspaceId);
    if (!workspace) return null;
    const cells = await ctx.db
      .query('pyramidCells')
      .withIndex('by_pyramid', (q) => q.eq('pyramidId', id))
      .collect();
    const needsBrief = hasContext(pyramid.config) && pyramid.brief === undefined;
    return {
      pyramid,
      ownerId: workspace.ownerId,
      cells: Object.fromEntries(cells.map((c) => [c.label, c.cell])),
      rawContext: needsBrief ? buildRawContext(pyramid.config.context, await resolveContext(ctx, pyramid)) : null,
    };
  },
});

export const isRunning = internalQuery({
  args: { id: v.id('pyramids'), executionId: v.string() },
  handler: async (ctx, { id, executionId }) => isCurrent(await ctx.db.get(id), executionId),
});

/** Token counts of every call so far (for re-estimating the remaining rows). */
export const callStats = internalQuery({
  args: { id: v.id('pyramids') },
  handler: async (ctx, { id }) =>
    (
      await ctx.db
        .query('pyramidCalls')
        .withIndex('by_pyramid', (q) => q.eq('pyramidId', id))
        .collect()
    ).map(({ role, row, status, promptTokens, completionTokens }) => ({ role, row, status, promptTokens, completionTokens })),
});

const callValidator = v.object({
  row: v.number(),
  role: v.union(v.literal('brief'), v.literal('panel'), v.literal('critique'), v.literal('host')),
  model: v.string(),
  panelist: v.union(v.string(), v.null()),
  messages: v.array(chatMessageValidator),
  output: v.string(),
  promptTokens: v.number(),
  completionTokens: v.number(),
  cost: v.string(),
  status: v.union(v.literal('ok'), v.literal('error'), v.literal('invalid')),
  startedAt: v.number(),
  endedAt: v.number(),
});

/** Appends one attempt and adds its cost to `spent` (whatever the run's status is now). */
export const recordCall = internalMutation({
  args: { id: v.id('pyramids'), call: callValidator },
  handler: async (ctx, { id, call }) => {
    const pyramid = await ctx.db.get(id);
    if (!pyramid) return;
    await ctx.db.insert('pyramidCalls', { ...call, workspaceId: pyramid.workspaceId, pyramidId: id });
    const spent = parseMoney(pyramid.spent) + parseMoney(call.cost);
    await ctx.db.patch(id, { spent: formatMoney(spent), updatedAt: Date.now() });
  },
});

export const saveBrief = internalMutation({
  args: { id: v.id('pyramids'), executionId: v.string(), brief: v.string() },
  handler: async (ctx, { id, executionId, brief }) => {
    const pyramid = await ctx.db.get(id);
    if (!isCurrent(pyramid, executionId)) return false;
    await ctx.db.patch(id, { brief, updatedAt: Date.now() });
    await scheduleStep(ctx, id, executionId);
    return true;
  },
});

/** Commits a row atomically and schedules the next step when the run keeps going. */
export const commitRow = internalMutation({
  args: {
    id: v.id('pyramids'),
    executionId: v.string(),
    row: v.number(),
    cells: v.array(hostCellValidator),
    failedPanelists: v.array(v.string()),
    status: v.union(v.literal('running'), v.literal('awaiting_approval'), v.literal('paused_budget'), v.literal('completed')),
  },
  handler: async (ctx, { id, executionId, row, cells, failedPanelists, status }) => {
    const pyramid = await ctx.db.get(id);
    if (!isCurrent(pyramid, executionId) || pyramid.currentRow !== row - 1) return false;
    for (const cell of cells) {
      await ctx.db.insert('pyramidCells', { workspaceId: pyramid.workspaceId, pyramidId: id, label: cell.label, row, cell });
    }
    await ctx.db.patch(id, {
      currentRow: row,
      status,
      error: undefined,
      rowResults: [...pyramid.rowResults.filter((r) => r.row !== row), { row, failedPanelists, committedAt: Date.now() }],
      ...(status !== 'running' && { executionId: undefined }),
      updatedAt: Date.now(),
    });
    if (status === 'running') await scheduleStep(ctx, id, executionId);
    return true;
  },
});

/** Ends this execution with `failed` or `paused_budget` unless something else changed the run. */
export const stop = internalMutation({
  args: {
    id: v.id('pyramids'),
    executionId: v.string(),
    status: v.union(v.literal('failed'), v.literal('paused_budget')),
    error: v.string(),
  },
  handler: async (ctx, { id, executionId, status, error }) => {
    const pyramid = await ctx.db.get(id);
    if (!isCurrent(pyramid, executionId)) return;
    await ctx.db.patch(id, { status, error: error.slice(0, 2000), executionId: undefined, updatedAt: Date.now() });
  },
});

/** Fails a run whose runner stopped writing (killed or timed out). Resume retries the row. */
export const watchdog = internalMutation({
  args: { id: v.id('pyramids'), executionId: v.string() },
  handler: async (ctx, { id, executionId }) => {
    const pyramid = await ctx.db.get(id);
    if (!isCurrent(pyramid, executionId) || Date.now() - pyramid.updatedAt < HEARTBEAT_TIMEOUT_MS) return;
    await ctx.db.patch(id, {
      status: 'failed',
      error: `The run stopped responding during row ${pyramid.currentRow + 1}. Resume to retry that row.`,
      executionId: undefined,
      updatedAt: Date.now(),
    });
  },
});

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Writes the brief, or runs and commits the next row. */
export const step = internalAction({
  args: { id: v.id('pyramids'), executionId: v.string() },
  handler: async (ctx, { id, executionId }) => {
    const state = await ctx.runQuery(internal.pyramidRunner.loadStep, { id, executionId });
    if (!state) return;
    const { pyramid } = state;
    const cfg = pyramid.config;
    const n = cfg.boardSize;

    try {
      const { apiKey } = await requireAiAccess(ctx, state.ownerId);
      const pricing = pricingMap(await loadModels(ctx));
      const guard = new BudgetGuard(tryParseMoney(pyramid.budgetCap), parseMoney(pyramid.spent));
      const caller = new Caller({
        complete: (req) => openrouter.complete(apiKey, req, pricing),
        record: async (call) => {
          await ctx.runMutation(internal.pyramidRunner.recordCall, { id, call });
        },
        beforeCall: async () => {
          if (!(await ctx.runQuery(internal.pyramidRunner.isRunning, { id, executionId }))) throw new StoppedError();
        },
        sleep,
        guard,
      });

      if (state.rawContext !== null) {
        const brief = await makeBrief(cfg, state.rawContext, caller);
        await ctx.runMutation(internal.pyramidRunner.saveBrief, { id, executionId, brief });
        return; // the next step runs the first row
      }

      const row = pyramid.currentRow + 1;
      if (row > lastRow(n)) return;
      const rowContext = buildRowContext(n, state.cells, row, pyramid.brief ?? null, cfg.question);
      const outcome = await runRow(cfg, rowContext, caller);

      let status: 'running' | 'awaiting_approval' | 'paused_budget' | 'completed';
      if (row === lastRow(n)) status = 'completed';
      else {
        const averages = tokenAverages(await ctx.runQuery(internal.pyramidRunner.callStats, { id }), n);
        if (guard.wouldExceed(remainingExpected(cfg, pricing, row + 1, averages))) status = 'paused_budget';
        else status = cfg.autoApprove ? 'running' : 'awaiting_approval';
      }
      await ctx.runMutation(internal.pyramidRunner.commitRow, {
        id,
        executionId,
        row,
        cells: outcome.cells,
        failedPanelists: outcome.failedPanelists,
        status,
      });
    } catch (error) {
      if (error instanceof StoppedError) return;
      const message = error instanceof Error ? error.message : String(error);
      const paused = error instanceof BudgetExceededError;
      await ctx.runMutation(internal.pyramidRunner.stop, {
        id,
        executionId,
        status: paused ? 'paused_budget' : 'failed',
        error: error instanceof ConvexError ? String(error.data) : message,
      });
    }
  },
});
