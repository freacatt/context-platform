/**
 * Pyramid Solver: one root question expands across a diamond board and converges to one
 * answer. A panel of OpenRouter models debates every row; a host model concludes it.
 *
 * State machine (the only place status changes besides the runner's commits):
 *   draft ─estimate─► estimated ─confirm─► running ─row done─► awaiting_approval ─approve─► running
 *                                            │  └─last row─► completed
 *                                            ├─projected > cap─► paused_budget ─raiseBudget─► awaiting_approval | running
 *                                            ├─row fails─► failed ─resume─► running
 *   any non-terminal ─cancel─► cancelled
 * Execution happens in `pyramidRunner.step`, scheduled once per row.
 */
import { ConvexError, v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import { action, mutation, query, type QueryCtx } from './_generated/server';
import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { coordOf, MAX_BOARD_SIZE, MIN_BOARD_SIZE, rowLabels } from '../shared/pyramid/board';
import {
  contextLinkDepthOf,
  contextRefsOf,
  createDefaultPyramidConfig,
  MAX_CONTEXT_REFS,
  MAX_PANELISTS,
  QUESTION_MAX,
} from '../shared/pyramid/config';
import { buildRawContext } from '../shared/pyramid/rowContext';
import { formatMoney, parseMoney, tryParseMoney } from '../shared/pyramid/money';
import { extractCellStatement } from '../shared/pyramid/parsing';
import { renderReport, runStats } from '../shared/pyramid/report';
import {
  EDITABLE_STATUSES,
  NON_TERMINAL_STATUSES,
  type CellRecord,
  type ContextRef,
  type CostEstimate,
  type PyramidStatus,
} from '../shared/pyramid/types';
import { pyramidConfigValidator } from './schema';
import {
  byRecentlyUpdated,
  getOwnedDocById,
  listInWorkspace,
  requireNonEmpty,
  requireOwnedDoc,
  requireOwnedWorkspace,
} from './lib/access';
import { startExecution } from './pyramidRunner';
import { deleteLinksOf } from './lib/knowledge';
import { requireContextRefs, resolveContext } from './lib/pyramidContext';

const MAX_EDIT_CHARS = 4000;

/** A run marked `running` whose runner wrote nothing for this long is considered dead. */
export const STALE_RUN_MS = 10 * 60 * 1000;

function requireStatus(pyramid: Doc<'pyramids'>, allowed: readonly PyramidStatus[], action: string) {
  if (!allowed.includes(pyramid.status)) {
    throw new ConvexError(`Cannot ${action} a pyramid that is ${pyramid.status.replace('_', ' ')}`);
  }
}

function filesOf(ctx: QueryCtx, pyramidId: Id<'pyramids'>) {
  return ctx.db
    .query('pyramidFiles')
    .withIndex('by_pyramid', (q) => q.eq('pyramidId', pyramidId))
    .collect();
}

/** The saved setup's context sources and their size (what the brief will read). */
export const contextSummary = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const pyramid = await getOwnedDocById(ctx, 'pyramids', id);
    if (!pyramid) return null;
    const sources = await resolveContext(ctx, pyramid);
    return {
      sources: sources.map((s) => ({ kind: s.kind, label: s.label, title: s.title, chars: s.text.length })),
      totalChars: buildRawContext(pyramid.config.context, sources).length,
    };
  },
});

async function cellsOf(ctx: QueryCtx, pyramidId: Id<'pyramids'>) {
  return ctx.db
    .query('pyramidCells')
    .withIndex('by_pyramid', (q) => q.eq('pyramidId', pyramidId))
    .collect();
}

async function callsOf(ctx: QueryCtx, pyramidId: Id<'pyramids'>, row?: number) {
  return ctx.db
    .query('pyramidCalls')
    .withIndex('by_pyramid', (q) => (row === undefined ? q.eq('pyramidId', pyramidId) : q.eq('pyramidId', pyramidId).eq('row', row)))
    .collect();
}

export const toCellRecord = (c: Doc<'pyramidCells'>): CellRecord => ({
  label: c.label,
  row: c.row,
  cell: c.cell,
  edited: c.originalNextQuestion !== undefined,
  originalNextQuestion: c.originalNextQuestion ?? null,
});

// --- queries -------------------------------------------------------------------------------

export const list = query({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, { workspaceId }) =>
    (await listInWorkspace(ctx, 'pyramids', workspaceId)).sort(byRecentlyUpdated),
});

/** Accepts any string (e.g. a URL segment); unknown or foreign ids return null. */
export const get = query({
  args: { id: v.string() },
  handler: (ctx, { id }) => getOwnedDocById(ctx, 'pyramids', id),
});

/** Concluded cells with their checkpoint edits, one entry per label. */
export const cells = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const pyramid = await getOwnedDocById(ctx, 'pyramids', id);
    return pyramid ? (await cellsOf(ctx, pyramid._id)).map(toCellRecord) : [];
  },
});

/** Cost and failed panelists of one committed row (the checkpoint shows them). */
export const rowSummary = query({
  args: { id: v.string(), row: v.number() },
  handler: async (ctx, { id, row }) => {
    const pyramid = await getOwnedDocById(ctx, 'pyramids', id);
    if (!pyramid) return null;
    const calls = await callsOf(ctx, pyramid._id, row);
    return {
      cost: formatMoney(calls.reduce((sum, c) => sum + parseMoney(c.cost), 0n)),
      calls: calls.length,
      failedPanelists: pyramid.rowResults.find((r) => r.row === row)?.failedPanelists ?? [],
    };
  },
});

/** Totals for the run-details panel: cost and tokens per model and role, calls, timing. */
export const details = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const pyramid = await getOwnedDocById(ctx, 'pyramids', id);
    if (!pyramid) return null;
    const stats = runStats(await callsOf(ctx, pyramid._id));
    const sources = await resolveContext(ctx, pyramid);
    return {
      models: stats.models.map((m) => ({ ...m, cost: formatMoney(m.cost) })),
      roles: Object.fromEntries(Object.entries(stats.roles).map(([role, r]) => [role, { calls: r.calls, cost: formatMoney(r.cost) }])),
      totalCalls: stats.totalCalls,
      failedCalls: stats.failedCalls,
      totalCost: formatMoney(stats.totalCost),
      startedAt: stats.startedAt,
      endedAt: stats.endedAt,
      contextSources: sources.map((s) => ({ kind: s.kind, label: s.label, title: s.title })),
    };
  },
});

/**
 * The debate behind one cell: every panel, critique and host call of its row in order, with
 * what each said about this cell. Failed attempts are included (with their error or output).
 */
export const discussion = query({
  args: { id: v.string(), label: v.string() },
  handler: async (ctx, { id, label }) => {
    const pyramid = await getOwnedDocById(ctx, 'pyramids', id);
    const coord = pyramid && coordOf(pyramid.config.boardSize, label);
    if (!pyramid || !coord) return null;
    const calls = (await callsOf(ctx, pyramid._id, coord[0] + coord[1])).sort((a, b) => a.startedAt - b.startedAt);
    const attempts = new Map<string, number>();
    return calls.map((c) => {
      const who = `${c.role}|${c.panelist ?? 'host'}`;
      const attempt = (attempts.get(who) ?? 0) + 1;
      attempts.set(who, attempt);
      return {
        _id: c._id,
        role: c.role,
        panelist: c.panelist,
        model: c.model,
        status: c.status,
        attempt,
        cost: c.cost,
        promptTokens: c.promptTokens,
        completionTokens: c.completionTokens,
        startedAt: c.startedAt,
        endedAt: c.endedAt,
        statement: c.status === 'error' ? null : extractCellStatement(c.output, label),
        output: c.output,
      };
    });
  },
});

/** Markdown, HTML or transcripts of the run so far; null without access. */
export const report = query({
  args: { id: v.string(), format: v.union(v.literal('md'), v.literal('html'), v.literal('transcripts')) },
  handler: async (ctx, { id, format }) => {
    const pyramid = await getOwnedDocById(ctx, 'pyramids', id);
    if (!pyramid) return null;
    const records = (await cellsOf(ctx, pyramid._id)).map(toCellRecord);
    const calls = (await callsOf(ctx, pyramid._id)).sort((a, b) => a.startedAt - b.startedAt);
    return renderReport(
      {
        title: pyramid.title,
        createdAt: pyramid._creationTime,
        status: pyramid.status,
        currentRow: pyramid.currentRow,
        budgetCap: pyramid.budgetCap ?? null,
        config: pyramid.config,
        cells: Object.fromEntries(records.map((r) => [r.label, r])),
        calls,
        failedPanelists: Object.fromEntries(pyramid.rowResults.map((r) => [r.row, r.failedPanelists])),
      },
      format,
    );
  },
});

// --- setup ---------------------------------------------------------------------------------

export const create = mutation({
  args: { workspaceId: v.id('workspaces'), title: v.string(), question: v.optional(v.string()) },
  handler: async (ctx, { workspaceId, title, question }) => {
    const workspace = await requireOwnedWorkspace(ctx, workspaceId);
    const settings = await ctx.db
      .query('aiSettings')
      .withIndex('by_user', (q) => q.eq('userId', workspace.ownerId))
      .unique();
    return ctx.db.insert('pyramids', {
      workspaceId,
      title: requireNonEmpty(title, 'Title'),
      config: createDefaultPyramidConfig({
        question,
        panel: settings?.defaultPanel,
        host: settings?.defaultHost,
      }) as Doc<'pyramids'>['config'],
      status: 'draft',
      currentRow: 0,
      spent: '0',
      rowResults: [],
      updatedAt: Date.now(),
    });
  },
});

export const rename = mutation({
  args: { id: v.id('pyramids'), title: v.string() },
  handler: async (ctx, { id, title }) => {
    await requireOwnedDoc(ctx, id, 'Pyramid');
    await ctx.db.patch(id, { title: requireNonEmpty(title, 'Title'), updatedAt: Date.now() });
  },
});

/**
 * Saves the setup of a draft. Drafts may be incomplete; full validation happens when
 * estimating. Any change discards a previous estimate.
 */
export const updateConfig = mutation({
  args: { id: v.id('pyramids'), config: pyramidConfigValidator },
  handler: async (ctx, { id, config }) => {
    const pyramid = await requireOwnedDoc(ctx, id, 'Pyramid');
    requireStatus(pyramid, EDITABLE_STATUSES, 'change the setup of');
    if (!Number.isInteger(config.boardSize) || config.boardSize < MIN_BOARD_SIZE || config.boardSize > MAX_BOARD_SIZE) {
      throw new ConvexError(`Board size must be between ${MIN_BOARD_SIZE} and ${MAX_BOARD_SIZE}`);
    }
    if (config.panel.length > MAX_PANELISTS) throw new ConvexError(`The panel can have at most ${MAX_PANELISTS} panelists`);
    if (config.question.length > QUESTION_MAX) throw new ConvexError(`The root question is longer than ${QUESTION_MAX} characters`);
    const contextRefs = contextRefsOf(config);
    if (contextRefs.length > MAX_CONTEXT_REFS) throw new ConvexError(`At most ${MAX_CONTEXT_REFS} context sources`);
    await requireContextRefs(ctx, pyramid, contextRefs);
    await ctx.db.patch(id, {
      // Legacy document ids are folded into the refs.
      config: { ...config, contextDocumentIds: [], contextRefs, contextLinkDepth: contextLinkDepthOf(config) },
      status: 'draft',
      estimate: undefined,
      updatedAt: Date.now(),
    });
  },
});

/** A new draft with the same setup. */
export const duplicate = mutation({
  args: { id: v.id('pyramids') },
  handler: async (ctx, { id }) => {
    const pyramid = await requireOwnedDoc(ctx, id, 'Pyramid');
    const now = Date.now();
    const copyId = await ctx.db.insert('pyramids', {
      workspaceId: pyramid.workspaceId,
      title: `${pyramid.title} (Copy)`,
      config: pyramid.config,
      status: 'draft',
      currentRow: 0,
      spent: '0',
      rowResults: [],
      updatedAt: now,
    });
    // Files are private to a pyramid: the copy gets its own.
    const fileIds = new Map<string, string>();
    for (const file of await filesOf(ctx, id)) {
      const { _id, _creationTime, ...rest } = file;
      fileIds.set(_id, await ctx.db.insert('pyramidFiles', { ...rest, pyramidId: copyId, updatedAt: now }));
    }
    const contextRefs = contextRefsOf(pyramid.config).flatMap((ref): ContextRef[] => {
      if (ref.kind !== 'file') return [ref];
      const copied = fileIds.get(ref.id);
      return copied ? [{ kind: 'file', id: copied }] : [];
    });
    await ctx.db.patch(copyId, { config: { ...pyramid.config, contextDocumentIds: [], contextRefs } });
    return copyId;
  },
});

/** Deletes a pyramid with its cells and calls; a running runner stops at its next check. */
export const remove = mutation({
  args: { id: v.id('pyramids') },
  handler: async (ctx, { id }) => {
    await requireOwnedDoc(ctx, id, 'Pyramid');
    for (const c of await cellsOf(ctx, id)) await ctx.db.delete(c._id);
    for (const c of await callsOf(ctx, id)) await ctx.db.delete(c._id);
    for (const f of await filesOf(ctx, id)) await ctx.db.delete(f._id);
    await deleteLinksOf(ctx, id);
    await ctx.db.delete(id);
  },
});

// --- run lifecycle ---------------------------------------------------------------------------

/** Validates the setup and prices it with OpenRouter's catalog. Nothing is billed. */
export const estimate = action({
  args: { id: v.id('pyramids') },
  handler: async (ctx, { id }): Promise<CostEstimate> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError('Not signed in');
    return ctx.runAction(internal.pyramidRunner.estimateFor, { id, userId });
  },
});

/** Starts the run with a budget cap (default: the high estimate). */
export const confirm = mutation({
  args: { id: v.id('pyramids'), budgetCap: v.optional(v.string()) },
  handler: async (ctx, { id, budgetCap }) => {
    const pyramid = await requireOwnedDoc(ctx, id, 'Pyramid');
    if (pyramid.status !== 'estimated' || !pyramid.estimate) {
      throw new ConvexError('Estimate the cost before starting');
    }
    const cap = budgetCap === undefined ? parseMoney(pyramid.estimate.high) : tryParseMoney(budgetCap);
    if (cap === null || cap < 0n) throw new ConvexError('The budget cap must be an amount of at least 0');
    await ctx.db.patch(id, { status: 'running', budgetCap: formatMoney(cap), error: undefined, updatedAt: Date.now() });
    await startExecution(ctx, id);
  },
});

/** Approves the checkpoint after `row`, optionally editing next questions of that row. */
export const approveRow = mutation({
  args: { id: v.id('pyramids'), row: v.number(), edits: v.optional(v.record(v.string(), v.string())) },
  handler: async (ctx, { id, row, edits = {} }) => {
    const pyramid = await requireOwnedDoc(ctx, id, 'Pyramid');
    if (pyramid.status !== 'awaiting_approval' || pyramid.currentRow !== row) {
      throw new ConvexError(`Row ${row} is not awaiting approval`);
    }
    const n = pyramid.config.boardSize;
    const allowed = new Set(rowLabels(n, row));
    const stored = new Map((await cellsOf(ctx, id)).filter((c) => c.row === row).map((c) => [c.label, c]));
    for (const [rawLabel, rawQuestion] of Object.entries(edits)) {
      const lbl = rawLabel.trim().toUpperCase();
      const question = rawQuestion.trim();
      const cell = stored.get(lbl);
      if (!allowed.has(lbl) || !cell) throw new ConvexError(`${lbl} is not a cell of row ${row}`);
      if (cell.cell.nextQuestion === null) throw new ConvexError(`${lbl} is the final cell; it has no next question`);
      if (!question) throw new ConvexError(`The edited next question for ${lbl} is empty`);
      if (question.length > MAX_EDIT_CHARS) throw new ConvexError(`The edited next question for ${lbl} is too long`);
      if (question === cell.cell.nextQuestion) continue;
      await ctx.db.patch(cell._id, {
        cell: { ...cell.cell, nextQuestion: question },
        originalNextQuestion: cell.originalNextQuestion === undefined ? cell.cell.nextQuestion : cell.originalNextQuestion,
      });
    }
    await ctx.db.patch(id, { status: 'running', updatedAt: Date.now() });
    await startExecution(ctx, id);
  },
});

/** Raises the cap (never below what was spent or the current cap); continues a paused run. */
export const raiseBudget = mutation({
  args: { id: v.id('pyramids'), budgetCap: v.string() },
  handler: async (ctx, { id, budgetCap }) => {
    const pyramid = await requireOwnedDoc(ctx, id, 'Pyramid');
    requireStatus(pyramid, NON_TERMINAL_STATUSES, 'raise the budget of');
    const cap = tryParseMoney(budgetCap);
    if (cap === null) throw new ConvexError('The budget cap must be an amount in USD');
    const spent = parseMoney(pyramid.spent);
    const current = tryParseMoney(pyramid.budgetCap);
    if (cap < spent) throw new ConvexError(`The new cap is below what was already spent ($${formatMoney(spent, 4)})`);
    if (current !== null && cap < current) throw new ConvexError(`The new cap must not be lower than the current cap ($${formatMoney(current, 4)})`);
    const patch = { budgetCap: formatMoney(cap), updatedAt: Date.now() };
    if (pyramid.status !== 'paused_budget') {
      await ctx.db.patch(id, patch);
      return;
    }
    // A pause mid-row (hard stop) re-runs that row; at a row boundary the user approves first.
    const resumeNow = pyramid.config.autoApprove || pyramid.currentRow === 0;
    await ctx.db.patch(id, { ...patch, status: resumeNow ? 'running' : 'awaiting_approval', error: undefined });
    if (resumeNow) await startExecution(ctx, id);
  },
});

export const cancel = mutation({
  args: { id: v.id('pyramids') },
  handler: async (ctx, { id }) => {
    const pyramid = await requireOwnedDoc(ctx, id, 'Pyramid');
    requireStatus(pyramid, NON_TERMINAL_STATUSES, 'cancel');
    await ctx.db.patch(id, { status: 'cancelled', executionId: undefined, updatedAt: Date.now() });
  },
});

/** Retries a failed run from its last committed row (completed rows are never re-billed). */
export const resume = mutation({
  args: { id: v.id('pyramids') },
  handler: async (ctx, { id }) => {
    const pyramid = await requireOwnedDoc(ctx, id, 'Pyramid');
    const stale = pyramid.status === 'running' && Date.now() - pyramid.updatedAt > STALE_RUN_MS;
    if (pyramid.status !== 'failed' && !stale) {
      throw new ConvexError(pyramid.status === 'running' ? 'The pyramid is already running' : `Cannot resume a pyramid that is ${pyramid.status}`);
    }
    await ctx.db.patch(id, { status: 'running', error: undefined, updatedAt: Date.now() });
    await startExecution(ctx, id);
  },
});
