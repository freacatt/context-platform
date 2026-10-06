/**
 * A deterministic stand-in for OpenRouter models, for tests. It reads the prompt (role, board
 * size, row labels) and answers with valid JSON for every cell, so whole runs can be driven
 * without the network. `override` lets a test script failures or bad output per call.
 */
import type { Completion, CompletionRequest } from '../ai';
import { coordOf, kind, parents } from './board';
import { BRIEF_SYSTEM, HOST_SYSTEM } from './prompts';

export interface FakeCallInfo {
  role: 'brief' | 'panel' | 'critique' | 'host';
  model: string;
  labels: string[];
  boardSize: number;
  /** The first user message (the row task). */
  prompt: string;
  attempt: number;
}

export interface FakeModelOptions {
  /** Return a string to reply with that text, throw to fail the call, undefined for the default. */
  override?: (info: FakeCallInfo) => string | undefined;
  cost?: string;
}

const LABELS_RE = /labels ([A-Z0-9, ]+?) and no others/;
const SIZE_RE = /The board is a (\d)x\d diamond/;

export function describeRequest(req: CompletionRequest): Omit<FakeCallInfo, 'attempt'> {
  const system = req.messages.find((m) => m.role === 'system')?.content ?? '';
  const prompt = req.messages.find((m) => m.role === 'user')?.content ?? '';
  const role = system === BRIEF_SYSTEM ? 'brief' : system === HOST_SYSTEM ? 'host' : prompt.includes('# Your earlier answer') ? 'critique' : 'panel';
  return {
    role,
    model: req.model,
    labels: LABELS_RE.exec(prompt)?.[1].split(', ') ?? [],
    boardSize: Number(SIZE_RE.exec(prompt)?.[1] ?? 0),
    prompt,
  };
}

/** Valid output for the request's role and row. */
export function defaultReply(info: Omit<FakeCallInfo, 'attempt'>): string {
  if (info.role === 'brief') return 'Brief: the key facts.';
  const n = info.boardSize;
  const cells = info.labels.map((lbl) => {
    const [u, v] = coordOf(n, lbl)!;
    const k = kind(n, u, v);
    const merges = k === 'merge' || k === 'final';
    const common = {
      label: lbl,
      combined_question: merges ? `Combined question for ${lbl}?` : null,
      next_question: k === 'final' ? null : `Next question from ${lbl}?`,
    };
    if (info.role !== 'host') return { ...common, answer: `${info.model} answers ${lbl}.` };
    return {
      ...common,
      conclusion: `Conclusion for ${lbl}.`,
      dissent: [],
      confidence: 0.8,
      summary: `Summary of ${lbl}.`,
      primary_parent: merges ? parents(u, v)[0] : null,
    };
  });
  return JSON.stringify({ cells });
}

/** A `complete` function backed by the fake. `calls` records every request it saw. */
export function createFakeModel(options: FakeModelOptions = {}) {
  const calls: FakeCallInfo[] = [];
  const attempts = new Map<string, number>();
  const complete = async (req: CompletionRequest): Promise<Completion> => {
    const described = describeRequest(req);
    const key = `${described.role}|${described.model}|${described.labels.join(',')}|${described.prompt.length}`;
    const attempt = (attempts.get(key) ?? 0) + 1;
    attempts.set(key, attempt);
    const info = { ...described, attempt };
    calls.push(info);
    const text = options.override?.(info) ?? defaultReply(info);
    return { text, model: req.model, promptTokens: 100, completionTokens: 50, cost: options.cost ?? '0.001' };
  };
  return { complete, calls };
}
