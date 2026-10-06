/**
 * Call counting and cost estimation. Before a run: low / expected / high per model from a
 * static token model at list prices. During a run: the remaining rows are re-estimated from
 * measured per-role token averages, so the budget guard can pause before an overrun.
 */
import type { ModelInfo } from '../ai';
import { lastRow, rowCoords, workingRows } from './board';
import { hasContext, hostMaxTokens, panelistMaxTokens } from './config';
import { ESTIMATE_DIGITS, formatMoney, parseMoney, roundMoney, scale, sumMoney, times, type Money } from './money';
import type { CallRecord, CallRole, CostEstimate, PyramidConfig } from './types';

const CHARS_PER_TOKEN = 4;

// Token model for one call (replaced by measured averages once a run has data).
const SYSTEM_TOKENS = 350;
const TASK_TOKENS = 650;
const SUMMARY_TOKENS = 140;
const PARENT_TOKENS = 380;
const CELL_TASK_TOKENS = 70;
const BRIEF_TOKENS_MAX = 2000;
const PANEL_TOKENS_PER_CELL = 230;
const HOST_TOKENS_PER_CELL = 340;
const BRIEF_COMPLETION = 1900;

export class UnknownModelError extends Error {}

/** Tokens of one planned call. */
export interface CallShape {
  role: CallRole;
  model: string;
  row: number;
  promptTokens: number;
  completionTokens: number;
  maxTokens: number;
}

/** Measured per-role averages: prompt tokens per call, completion tokens per row cell. */
export interface TokenAverages {
  prompt: Partial<Record<CallRole, number>>;
  completionPerCell: Partial<Record<CallRole, number>>;
}

export type Pricing = Map<string, ModelInfo>;

/** Planned calls per model id: panel (×2 with critique) and host per working row, +1 brief. */
export function countCalls(cfg: PyramidConfig): Record<string, number> {
  const rows = workingRows(cfg.boardSize).length;
  const calls: Record<string, number> = {};
  const add = (model: string, count: number) => (calls[model] = (calls[model] ?? 0) + count);
  for (const p of cfg.panel) add(p.model, rows * (cfg.critiqueRound ? 2 : 1));
  add(cfg.host.model, rows + (hasContext(cfg) ? 1 : 0));
  return calls;
}

function measured(
  averages: TokenAverages | undefined,
  role: CallRole,
  width: number,
  prompt: number,
  perCell: number,
  cap: number,
): [prompt: number, completion: number] {
  const avgPrompt = averages?.prompt[role];
  const avgPerCell = averages?.completionPerCell[role];
  if (avgPrompt !== undefined && avgPerCell !== undefined) {
    prompt = Math.round(avgPrompt);
    perCell = Math.round(avgPerCell);
  }
  return [prompt, Math.min(cap, 60 + width * perCell)];
}

/** Every call a run makes from `fromRow` on, with modelled (or measured) token counts. */
export function planCalls(
  cfg: PyramidConfig,
  opts: { contextChars?: number; fromRow?: number; averages?: TokenAverages; includeBrief?: boolean } = {},
): CallShape[] {
  const { fromRow = 1, averages, includeBrief = true } = opts;
  const n = cfg.boardSize;
  const contextTokens = Math.floor((opts.contextChars ?? cfg.context.length) / CHARS_PER_TOKEN);
  const withContext = hasContext(cfg);
  const briefTokens = withContext ? Math.min(BRIEF_TOKENS_MAX, Math.max(200, contextTokens)) : 0;
  const questionTokens = Math.floor(cfg.question.length / CHARS_PER_TOKEN);
  const hostMax = hostMaxTokens(cfg.host);
  const shapes: CallShape[] = [];

  if (withContext && includeBrief) {
    shapes.push({
      role: 'brief',
      model: cfg.host.model,
      row: 0,
      promptTokens: 400 + questionTokens + contextTokens,
      completionTokens: Math.min(hostMax, BRIEF_COMPLETION),
      maxTokens: hostMax,
    });
  }

  for (const r of workingRows(n)) {
    if (r < fromRow) continue;
    const width = rowCoords(n, r).length;
    const prevWidth = rowCoords(n, r - 1).length;
    let earlier = 0;
    for (let i = 1; i < r - 1; i++) earlier += rowCoords(n, i).length;
    const base =
      SYSTEM_TOKENS +
      TASK_TOKENS +
      questionTokens +
      briefTokens +
      earlier * SUMMARY_TOKENS +
      prevWidth * PARENT_TOKENS +
      width * CELL_TASK_TOKENS;

    const panelOut: number[] = [];
    for (const p of cfg.panel) {
      const max = panelistMaxTokens(p);
      const [prompt, out] = measured(averages, 'panel', width, base, PANEL_TOKENS_PER_CELL, max);
      panelOut.push(out);
      shapes.push({ role: 'panel', model: p.model, row: r, promptTokens: prompt, completionTokens: out, maxTokens: max });
    }
    const panelTotal = panelOut.reduce((a, b) => a + b, 0);
    if (cfg.critiqueRound) {
      cfg.panel.forEach((p) => {
        const max = panelistMaxTokens(p);
        const modelled = base + panelTotal; // own answer + every peer's
        const [prompt, out] = measured(averages, 'critique', width, modelled, PANEL_TOKENS_PER_CELL, max);
        shapes.push({ role: 'critique', model: p.model, row: r, promptTokens: prompt, completionTokens: out, maxTokens: max });
      });
    }
    const modelledHost = base + panelTotal + 40 * cfg.panel.length;
    const [prompt, out] = measured(averages, 'host', width, modelledHost, HOST_TOKENS_PER_CELL, hostMax);
    shapes.push({ role: 'host', model: cfg.host.model, row: r, promptTokens: prompt, completionTokens: out, maxTokens: hostMax });
  }
  return shapes;
}

function price(pricing: Pricing, model: string): { prompt: Money; completion: Money } {
  const info = pricing.get(model);
  if (!info) throw new UnknownModelError(`Model "${model}" is not in the OpenRouter model list`);
  return { prompt: parseMoney(info.promptPrice), completion: parseMoney(info.completionPrice) };
}

const quantize = (m: Money) => roundMoney(m, ESTIMATE_DIGITS);

export function priceCalls(shapes: CallShape[], pricing: Pricing): CostEstimate {
  const calls: Record<string, number> = {};
  const low = new Map<string, Money>();
  const expected = new Map<string, Money>();
  const high = new Map<string, Money>();
  const add = (m: Map<string, Money>, model: string, value: Money) => m.set(model, (m.get(model) ?? 0n) + value);

  for (const s of shapes) {
    const p = price(pricing, s.model);
    calls[s.model] = (calls[s.model] ?? 0) + 1;
    // low: 0.85× prompt, 0.5× completion; high: 1.25× prompt, max_tokens completion, ×1.1 for retries.
    add(low, s.model, scale(times(p.prompt, s.promptTokens), 85n, 100n) + scale(times(p.completion, s.completionTokens), 1n, 2n));
    add(expected, s.model, times(p.prompt, s.promptTokens) + times(p.completion, s.completionTokens));
    add(
      high,
      s.model,
      scale(scale(times(p.prompt, s.promptTokens), 125n, 100n) + times(p.completion, s.maxTokens), 110n, 100n),
    );
  }
  const perModel = Object.fromEntries([...expected].map(([m, v]) => [m, quantize(v)]));
  return {
    low: formatMoney(sumMoney([...low.values()].map(quantize))),
    expected: formatMoney(sumMoney(Object.values(perModel))),
    high: formatMoney(sumMoney([...high.values()].map(quantize))),
    calls,
    perModel: Object.fromEntries(Object.entries(perModel).map(([m, v]) => [m, formatMoney(v)])),
  };
}

/** low / expected / high for the whole run, per model, with call counts. */
export function estimate(cfg: PyramidConfig, pricing: Pricing, contextChars?: number): CostEstimate {
  for (const model of [...cfg.panel.map((p) => p.model), cfg.host.model]) price(pricing, model);
  return priceCalls(planCalls(cfg, { contextChars }), pricing);
}

/** Average measured tokens per role over successful row calls. */
export function tokenAverages(calls: Pick<CallRecord, 'status' | 'role' | 'row' | 'promptTokens' | 'completionTokens'>[], n: number): TokenAverages {
  const prompt: Partial<Record<CallRole, number[]>> = {};
  const perCell: Partial<Record<CallRole, number[]>> = {};
  for (const c of calls) {
    if (c.status !== 'ok' || c.role === 'brief' || c.row < 1) continue;
    (prompt[c.role] ??= []).push(c.promptTokens);
    (perCell[c.role] ??= []).push(c.completionTokens / rowCoords(n, c.row).length);
  }
  const avg = (rec: Partial<Record<CallRole, number[]>>) =>
    Object.fromEntries(Object.entries(rec).map(([r, v]) => [r, v.reduce((a, b) => a + b, 0) / v.length]));
  return { prompt: avg(prompt), completionPerCell: avg(perCell) };
}

/** Expected cost of rows `fromRow`.. using measured token averages. */
export function remainingExpected(cfg: PyramidConfig, pricing: Pricing, fromRow: number, averages?: TokenAverages): Money {
  if (fromRow > lastRow(cfg.boardSize)) return 0n;
  const shapes = planCalls(cfg, { fromRow, averages, includeBrief: false });
  return parseMoney(priceCalls(shapes, pricing).expected);
}

export const pricingMap = (models: ModelInfo[]): Pricing => new Map(models.map((m) => [m.id, m]));
