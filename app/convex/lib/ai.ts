/**
 * The one way Convex actions talk to AI models. Any feature that needs AI calls these
 * helpers (or the public `ai.complete` action from the browser): the user's key and default
 * model are resolved here, and provider errors become readable ConvexErrors.
 */
import { ConvexError } from 'convex/values';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import type { ActionCtx } from '../_generated/server';
import { FALLBACK_MODEL, type Completion, type CompletionRequest, type ModelInfo } from '../../shared/ai';
import { ProviderConfigError, ProviderError } from '../../shared/pyramid/roundtable';
import * as openrouter from './openrouter';

export const MODEL_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const NO_KEY_MESSAGE = 'No OpenRouter API key is set. Add one in Settings → AI.';

/** The user's OpenRouter key and default model; throws when there is no key at all. */
export async function requireAiAccess(ctx: ActionCtx, userId: Id<'users'>) {
  const { apiKey, defaultModel } = await ctx.runQuery(internal.aiSettings.resolveForUser, { userId });
  if (!apiKey) throw new ConvexError(NO_KEY_MESSAGE);
  return { apiKey, defaultModel: defaultModel ?? FALLBACK_MODEL };
}

/** Provider errors as ConvexErrors, so the browser sees the message instead of "Server Error". */
export async function asUserError<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ProviderError || error instanceof ProviderConfigError) throw new ConvexError(error.message);
    throw error;
  }
}

/** The OpenRouter catalog, cached in the database for a day. */
export async function loadModels(ctx: ActionCtx, { refresh = false } = {}): Promise<ModelInfo[]> {
  if (!refresh) {
    const cached = await ctx.runQuery(internal.ai.cachedModels, {});
    if (cached && Date.now() - cached.fetchedAt < MODEL_CACHE_TTL_MS) return cached.models;
  }
  const models = await asUserError(() => openrouter.listModels());
  await ctx.runMutation(internal.ai.storeModels, { models });
  return models;
}

/** One completion for `userId`; `model` defaults to the user's default model. */
export async function completeForUser(
  ctx: ActionCtx,
  userId: Id<'users'>,
  req: Omit<CompletionRequest, 'model'> & { model?: string },
): Promise<Completion> {
  const { apiKey, defaultModel } = await requireAiAccess(ctx, userId);
  return asUserError(() => openrouter.complete(apiKey, { ...req, model: req.model?.trim() || defaultModel }));
}
