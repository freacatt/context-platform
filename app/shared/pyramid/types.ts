/** Data contracts of the Pyramid Solver (a multi-model roundtable over a diamond board). */
import type { ChatMessage } from '../ai';
import type { KnowledgeApp } from '../knowledge/types';

/** One context source: an item of any app, a saved context pack, or a file uploaded to the pyramid. */
export type ContextRef =
  | { kind: 'item'; app: KnowledgeApp; id: string }
  | { kind: 'pack'; id: string }
  | { kind: 'file'; id: string };

export type PyramidStatus =
  | 'draft'
  | 'estimated'
  | 'running'
  | 'awaiting_approval'
  | 'paused_budget'
  | 'completed'
  | 'failed'
  | 'cancelled';

export const TERMINAL_STATUSES: readonly PyramidStatus[] = ['completed', 'failed', 'cancelled'];
export const NON_TERMINAL_STATUSES: readonly PyramidStatus[] = [
  'draft',
  'estimated',
  'running',
  'awaiting_approval',
  'paused_budget',
];
/** Statuses in which the setup (question, panel, host, …) may still change. */
export const EDITABLE_STATUSES: readonly PyramidStatus[] = ['draft', 'estimated'];

export type PromptMode = 'append' | 'replace';

export interface PanelistConfig {
  /** OpenRouter model id, e.g. "openai/gpt-4o-mini". */
  model: string;
  /** Display name; defaults to the model id. */
  name?: string;
  systemPrompt?: string;
  promptMode?: PromptMode;
  temperature?: number;
  maxTokens?: number;
}

export interface HostConfig {
  model: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface PyramidConfig {
  /** The root question, 10..4000 characters. */
  question: string;
  /** Free-text background. */
  context: string;
  /** Legacy: context documents picked before `contextRefs` existed. Folded into `contextRefs` on save. */
  contextDocumentIds: string[];
  /** Context sources of the same workspace (or this pyramid's files), read when the run starts. */
  contextRefs?: ContextRef[];
  /** How far item and pack sources are expanded along links (0 = not at all, -1 = all). */
  contextLinkDepth?: number;
  boardSize: number;
  panel: PanelistConfig[];
  host: HostConfig;
  critiqueRound: boolean;
  autoApprove: boolean;
  minPanelists: number;
  /** Replaces the built-in panel system prompt for every panelist. */
  defaultSystemPrompt?: string;
}

/** One cell inside a panelist's row output. */
export interface PanelCell {
  label: string;
  combinedQuestion: string | null;
  answer: string;
  nextQuestion: string | null;
}

/** One cell as concluded by the host: what later rows build on. */
export interface HostCell {
  label: string;
  combinedQuestion: string | null;
  conclusion: string;
  /** Disagreements between panelists worth keeping. */
  dissent: string[];
  confidence: number;
  nextQuestion: string | null;
  /** ≤ 100 words; later rows see only this. */
  summary: string;
  /** Required for MERGE and FINAL cells, null otherwise. */
  primaryParent: string | null;
}

/** A host cell plus checkpoint edits, as stored and shown. `cell.nextQuestion` is the effective one. */
export interface CellRecord {
  label: string;
  row: number;
  cell: HostCell;
  edited: boolean;
  originalNextQuestion: string | null;
}

/** Amounts are decimal USD strings. */
export interface CostEstimate {
  low: string;
  expected: string;
  high: string;
  /** model id → planned calls */
  calls: Record<string, number>;
  /** model id → expected cost */
  perModel: Record<string, string>;
}

export type CallRole = 'brief' | 'panel' | 'critique' | 'host';
export type CallStatus = 'ok' | 'error' | 'invalid';

/** One provider attempt; stored append-only. */
export interface CallRecord {
  row: number;
  role: CallRole;
  model: string;
  panelist: string | null;
  messages: ChatMessage[];
  output: string;
  promptTokens: number;
  completionTokens: number;
  /** Decimal USD. */
  cost: string;
  status: CallStatus;
  startedAt: number;
  endedAt: number;
}

export const displayName = (p: PanelistConfig): string => p.name?.trim() || p.model;
