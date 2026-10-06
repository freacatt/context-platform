/**
 * One row of the roundtable: blind round → optional critique round → host synthesis.
 *
 * `Caller` owns everything about a single provider call: the budget check, retries with
 * backoff, output validation with a repair prompt, and recording each attempt. It is
 * runtime-agnostic: the Convex runner injects the provider, the recorder and `sleep`.
 */
import type { ChatMessage, Completion, CompletionRequest } from '../ai';
import { hostMaxTokens, hostTemperature, panelistMaxTokens, panelistTemperature } from './config';
import { formatMoney, parseMoney, type Money } from './money';
import { ModelOutputError, parseJsonBlock, validateHostRow, validatePanelRow } from './parsing';
import {
  BRIEF_SYSTEM,
  briefPrompt,
  critiquePrompt,
  hostRowPrompt,
  panelOutputText,
  panelRowPrompt,
  repairPrompt,
  resolveHostSystemPrompt,
  resolvePanelSystemPrompt,
  wordsBudget,
} from './prompts';
import type { RowContext } from './rowContext';
import { displayName, type CallRecord, type CallRole, type HostCell, type PanelCell, type PanelistConfig, type PyramidConfig } from './types';

/** Transport failure, 429 or 5xx: worth retrying. */
export class ProviderError extends Error {}
/** The request itself is wrong (bad key, unknown model, 4xx): retrying will not help. */
export class ProviderConfigError extends Error {}
/** Spending reached the confirmed cap; the run pauses. */
export class BudgetExceededError extends Error {}
/** Fewer than `minPanelists` panelists produced a valid answer. */
export class QuorumNotMetError extends Error {}

export const DEFAULT_RETRY_DELAYS_MS = [1000, 4000] as const;

/** Actual spend vs the confirmed cap. */
export class BudgetGuard {
  constructor(
    public cap: Money | null,
    public spent: Money = 0n,
  ) {}

  add(cost: Money) {
    this.spent += cost;
  }

  /** Hard stop before a new call once the cap is used up. */
  checkCall() {
    if (this.cap !== null && this.spent >= this.cap) {
      throw new BudgetExceededError(`Spent $${formatMoney(this.spent, 4)} reached the budget cap $${formatMoney(this.cap, 4)}`);
    }
  }

  /** Projected overrun: spent + expected cost of the remaining rows > cap. */
  wouldExceed(remainingExpected: Money): boolean {
    return this.cap !== null && this.spent + remainingExpected > this.cap;
  }
}

export interface CallerDeps {
  complete: (req: CompletionRequest) => Promise<Completion>;
  record: (call: CallRecord) => Promise<void>;
  sleep: (ms: number) => Promise<void>;
  guard: BudgetGuard;
  /** Runs before every attempt; throw to stop (e.g. the run was cancelled meanwhile). */
  beforeCall?: () => Promise<void>;
  retryDelaysMs?: readonly number[];
  now?: () => number;
}

export interface CallSpec {
  role: CallRole;
  row: number;
  model: string;
  panelist: string | null;
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
  labels: string[];
}

export class Caller {
  private readonly delays: readonly number[];
  private readonly now: () => number;

  constructor(private readonly deps: CallerDeps) {
    this.delays = deps.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
    this.now = deps.now ?? Date.now;
  }

  /**
   * Runs `spec` with up to `delays.length` retries. Provider errors and invalid output share
   * the retry budget; a retry after invalid output carries the validation error.
   */
  async call<T>(spec: CallSpec, validate: (text: string) => T): Promise<T> {
    let messages = spec.messages;
    let last: Error | null = null;
    for (let attempt = 0; attempt <= this.delays.length; attempt++) {
      if (attempt > 0) await this.deps.sleep(this.delays[attempt - 1]);
      await this.deps.beforeCall?.();
      this.deps.guard.checkCall();
      const startedAt = this.now();
      let out: Completion;
      try {
        out = await this.deps.complete({ model: spec.model, messages, temperature: spec.temperature, maxTokens: spec.maxTokens });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await this.record(spec, messages, startedAt, 'error', message);
        if (!(error instanceof ProviderError)) throw error;
        last = error;
        continue;
      }
      this.deps.guard.add(parseMoney(out.cost));
      try {
        const value = validate(out.text);
        await this.record(spec, messages, startedAt, 'ok', out.text, out);
        return value;
      } catch (error) {
        if (!(error instanceof ModelOutputError)) throw error;
        await this.record(spec, messages, startedAt, 'invalid', out.text, out);
        last = error;
        messages = [
          ...spec.messages,
          { role: 'assistant', content: out.text },
          { role: 'user', content: repairPrompt(error.message, spec.labels) },
        ];
      }
    }
    throw last ?? new ProviderError(`${spec.role} call made no attempts`);
  }

  private record(spec: CallSpec, messages: ChatMessage[], startedAt: number, status: CallRecord['status'], output: string, out?: Completion) {
    return this.deps.record({
      row: spec.row,
      role: spec.role,
      model: spec.model,
      panelist: spec.panelist,
      messages,
      output,
      promptTokens: out?.promptTokens ?? 0,
      completionTokens: out?.completionTokens ?? 0,
      cost: out?.cost ?? '0',
      status,
      startedAt,
      endedAt: this.now(),
    });
  }
}

/** The host compresses free-text context and context documents into a ≤ 1500-word brief. */
export async function makeBrief(cfg: PyramidConfig, rawContext: string, caller: Caller): Promise<string> {
  return caller.call(
    {
      role: 'brief',
      row: 0,
      model: cfg.host.model,
      panelist: null,
      messages: [
        { role: 'system', content: BRIEF_SYSTEM },
        { role: 'user', content: briefPrompt(cfg.question, rawContext) },
      ],
      temperature: hostTemperature(cfg.host),
      maxTokens: hostMaxTokens(cfg.host),
      labels: [],
    },
    (text) => {
      if (!text.trim()) throw new ModelOutputError('the brief is empty');
      return text.trim();
    },
  );
}

export interface RowOutcome {
  cells: HostCell[];
  failedPanelists: string[];
}

const isRecoverable = (e: unknown) => e instanceof ProviderError || e instanceof ModelOutputError;

export async function runRow(cfg: PyramidConfig, ctx: RowContext, caller: Caller): Promise<RowOutcome> {
  const n = cfg.boardSize;
  const { row, labels } = ctx;
  const width = ctx.cells.length;
  const panelValidate = (text: string) => validatePanelRow(parseJsonBlock(text), n, row);
  const panelWords = (p: PanelistConfig) => wordsBudget(panelistMaxTokens(p), width, 90, 250);
  const panelSpec = (p: PanelistConfig, role: CallRole, user: string): CallSpec => ({
    role,
    row,
    model: p.model,
    panelist: displayName(p),
    messages: [
      { role: 'system', content: resolvePanelSystemPrompt(cfg.defaultSystemPrompt, p) },
      { role: 'user', content: user },
    ],
    temperature: panelistTemperature(p),
    maxTokens: panelistMaxTokens(p),
    labels,
  });

  // 1. Blind round: every panelist answers the same row task, in parallel.
  const blind = await Promise.all(
    cfg.panel.map(async (p) => {
      try {
        return await caller.call(panelSpec(p, 'panel', panelRowPrompt(ctx, panelWords(p))), panelValidate);
      } catch (error) {
        if (isRecoverable(error)) return null; // the panelist drops out of this row
        throw error;
      }
    }),
  );
  const ok = cfg.panel.flatMap((p, i) => (blind[i] ? [{ p, out: blind[i] }] : []));
  const failedPanelists = cfg.panel.filter((_, i) => !blind[i]).map(displayName);
  if (ok.length < cfg.minPanelists) {
    throw new QuorumNotMetError(
      `Row ${row}: ${ok.length} of ${cfg.panel.length} panelists answered, at least ${cfg.minPanelists} needed` +
        (failedPanelists.length ? ` (failed: ${failedPanelists.join(', ')})` : ''),
    );
  }

  // 2. Critique round: each panelist sees the others (anonymised) and revises.
  let final: PanelCell[][] = ok.map((o) => o.out);
  if (cfg.critiqueRound && ok.length > 1) {
    final = await Promise.all(
      ok.map(async ({ p, out }, i) => {
        const peers = ok.filter((_, j) => j !== i).map((o) => panelOutputText(o.out));
        try {
          return await caller.call(
            panelSpec(p, 'critique', critiquePrompt(ctx, panelOutputText(out), peers, panelWords(p))),
            panelValidate,
          );
        } catch (error) {
          if (isRecoverable(error)) return out; // keep the blind answer
          throw error;
        }
      }),
    );
  }

  // 3. Host synthesis: authoritative cells for the row.
  const cells = await caller.call(
    {
      role: 'host',
      row,
      model: cfg.host.model,
      panelist: null,
      messages: [
        { role: 'system', content: resolveHostSystemPrompt(cfg.host) },
        {
          role: 'user',
          content: hostRowPrompt(ctx, final.map(panelOutputText), wordsBudget(hostMaxTokens(cfg.host), width, 230, 300)),
        },
      ],
      temperature: hostTemperature(cfg.host),
      maxTokens: hostMaxTokens(cfg.host),
      labels,
    },
    (text) => validateHostRow(parseJsonBlock(text), n, row),
  );
  return { cells, failedPanelists };
}
