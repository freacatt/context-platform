/**
 * OpenRouter over fetch: chat completions and the model catalog. Runs in Convex actions.
 * Transport errors, 429 and 5xx raise ProviderError (retryable); other 4xx raise
 * ProviderConfigError. The API key is only ever sent in the Authorization header.
 */
import type { ChatMessage, Completion, CompletionRequest, ModelInfo, OpenRouterKeyStatus } from '../../shared/ai';
import { formatMoney, parseMoney, times, tryParseMoney } from '../../shared/pyramid/money';
import { ProviderConfigError, ProviderError } from '../../shared/pyramid/roundtable';

export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const TIMEOUT_MS = 120_000;
const APP_HEADERS = { 'HTTP-Referer': 'https://context-platform.app', 'X-Title': 'Context Platform' };

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

async function request(path: string, init: RequestInit & { apiKey?: string }): Promise<Json> {
  const { apiKey, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let resp: Response;
  try {
    resp = await fetch(`${OPENROUTER_BASE_URL}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...APP_HEADERS,
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
    });
  } catch (error) {
    const reason = controller.signal.aborted ? 'timed out' : error instanceof Error ? error.name : 'failed';
    throw new ProviderError(`OpenRouter request ${reason}`);
  } finally {
    clearTimeout(timer);
  }
  let body: unknown = null;
  const text = await resp.text();
  try {
    body = JSON.parse(text);
  } catch {
    // keep the raw text for the error message
  }
  if (resp.status === 429 || resp.status >= 500) throw new ProviderError(`OpenRouter ${resp.status}: ${errorMessage(body, text)}`);
  if (resp.status >= 400) {
    const hint = resp.status === 401 ? ' (check the OpenRouter API key in Settings)' : '';
    throw new ProviderConfigError(`OpenRouter ${resp.status}: ${errorMessage(body, text)}${hint}`);
  }
  if (!isObject(body)) throw new ProviderError('OpenRouter returned an unexpected body');
  return body;
}

function errorMessage(body: unknown, text: string): string {
  const err = isObject(body) ? (body.error ?? body) : text;
  const message = isObject(err) ? (err.message ?? JSON.stringify(err)) : err;
  return String(message).slice(0, 300);
}

/** Parses the /models payload; prices are decimal USD per token. */
export function parseModelsPayload(payload: Json): ModelInfo[] {
  const data = Array.isArray(payload.data) ? payload.data : [];
  const models: ModelInfo[] = [];
  for (const m of data) {
    if (!isObject(m) || typeof m.id !== 'string') continue;
    const pricing = isObject(m.pricing) ? m.pricing : {};
    const price = (v: unknown) => {
      const parsed = tryParseMoney(typeof v === 'string' || typeof v === 'number' ? v : null);
      return parsed === null || parsed < 0n ? '0' : formatMoney(parsed);
    };
    models.push({
      id: m.id,
      name: typeof m.name === 'string' ? m.name : m.id,
      contextLength: typeof m.context_length === 'number' ? m.context_length : 0,
      promptPrice: price(pricing.prompt),
      completionPrice: price(pricing.completion),
    });
  }
  return models.sort((a, b) => a.id.localeCompare(b.id));
}

export async function listModels(): Promise<ModelInfo[]> {
  return parseModelsPayload(await request('/models', { method: 'GET' }));
}

const money = (v: unknown): string | null => {
  const parsed = tryParseMoney(typeof v === 'number' || typeof v === 'string' ? v : null);
  return parsed === null ? null : formatMoney(parsed);
};

/**
 * The key's usage and limits (GET /key) and, when the key may read them, the account's
 * credits (GET /credits needs a management key; any 4xx there just means "not available").
 * Neither call spends anything.
 */
export async function keyStatus(apiKey: string): Promise<Omit<OpenRouterKeyStatus, 'source'>> {
  const [key, credits] = await Promise.all([
    request('/key', { method: 'GET', apiKey }),
    request('/credits', { method: 'GET', apiKey }).catch((error: unknown) => {
      if (error instanceof ProviderConfigError) return null;
      throw error;
    }),
  ]);
  const data = isObject(key.data) ? key.data : {};
  const creditData = credits && isObject(credits.data) ? credits.data : null;
  const total = creditData ? tryParseMoney(typeof creditData.total_credits === 'number' ? creditData.total_credits : null) : null;
  const used = creditData ? tryParseMoney(typeof creditData.total_usage === 'number' ? creditData.total_usage : null) : null;
  return {
    label: typeof data.label === 'string' ? data.label : null,
    isFreeTier: data.is_free_tier === true,
    usage: {
      total: money(data.usage) ?? '0',
      daily: money(data.usage_daily),
      weekly: money(data.usage_weekly),
      monthly: money(data.usage_monthly),
    },
    limit: money(data.limit),
    limitRemaining: money(data.limit_remaining),
    limitReset: typeof data.limit_reset === 'string' ? data.limit_reset : null,
    credits:
      total !== null && used !== null
        ? { total: formatMoney(total), used: formatMoney(used), remaining: formatMoney(total - used) }
        : null,
  };
}

/**
 * One chat completion. `cost` comes from `usage.cost` (what OpenRouter billed); without it,
 * list prices from `pricing` are used so a budget never sees a free call by accident.
 */
export async function complete(
  apiKey: string,
  req: CompletionRequest,
  pricing?: Map<string, ModelInfo>,
): Promise<Completion> {
  const body = await request('/chat/completions', {
    method: 'POST',
    apiKey,
    body: JSON.stringify({
      model: req.model,
      messages: req.messages satisfies ChatMessage[],
      ...(req.temperature !== undefined && { temperature: req.temperature }),
      ...(req.maxTokens !== undefined && { max_tokens: req.maxTokens }),
      usage: { include: true },
    }),
  });
  if (body.error) throw new ProviderError(`OpenRouter error for ${req.model}: ${errorMessage(body, '')}`);
  const choice = Array.isArray(body.choices) ? body.choices[0] : undefined;
  const message = isObject(choice) && isObject(choice.message) ? choice.message : null;
  if (!message) throw new ProviderError(`OpenRouter response for ${req.model} has no choices`);
  const usage = isObject(body.usage) ? body.usage : {};
  const promptTokens = Number(usage.prompt_tokens) || 0;
  const completionTokens = Number(usage.completion_tokens) || 0;

  let cost = tryParseMoney(typeof usage.cost === 'number' || typeof usage.cost === 'string' ? usage.cost : null);
  if (cost === null) {
    const info = pricing?.get(req.model);
    cost = info ? times(parseMoney(info.promptPrice), promptTokens) + times(parseMoney(info.completionPrice), completionTokens) : 0n;
  }
  return {
    text: typeof message.content === 'string' ? message.content : '',
    model: typeof body.model === 'string' ? body.model : req.model,
    promptTokens,
    completionTokens,
    cost: formatMoney(cost),
  };
}
