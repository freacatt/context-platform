/** Provider-neutral AI contracts shared by the backend (convex/ai.ts) and the UI. */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** A model from the OpenRouter catalog. Prices are decimal USD per token. */
export interface ModelInfo {
  id: string;
  name: string;
  contextLength: number;
  promptPrice: string;
  completionPrice: string;
}

/** What one completion produced. `cost` is decimal USD (as billed when the provider reports it). */
export interface Completion {
  text: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  cost: string;
}

export interface CompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

/** Used when neither the caller nor the user's settings name a model. */
export const FALLBACK_MODEL = 'openai/gpt-4o-mini';

/** "sk-or-v1-…abcd": enough to recognise a key without revealing it. */
export const keyHint = (key: string): string => (key.length <= 8 ? '••••' : `${key.slice(0, 6)}…${key.slice(-4)}`);

/** What OpenRouter reports about the key in use. Amounts are decimal USD strings. */
export interface OpenRouterKeyStatus {
  /** Whose key: the user's own, or the deployment's shared one. */
  source: 'user' | 'deployment';
  label: string | null;
  isFreeTier: boolean;
  usage: { total: string; daily: string | null; weekly: string | null; monthly: string | null };
  /** Spending cap of the key; null = no cap. */
  limit: string | null;
  limitRemaining: string | null;
  /** "daily" | "weekly" | "monthly" when the cap resets; null = never. */
  limitReset: string | null;
  /** Account credits; OpenRouter only returns them to management keys, otherwise null. */
  credits: { total: string; used: string; remaining: string } | null;
}
