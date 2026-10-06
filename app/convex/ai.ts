/**
 * AI for the whole app. From the browser: `useAction(api.ai.complete)` for a completion with
 * the user's key and default model, `api.ai.listModels` for the catalog. From other Convex
 * actions: the helpers in `lib/ai.ts`.
 */
import { ConvexError, v } from 'convex/values';
import { action, internalMutation, internalQuery } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';
import type { Completion, ModelInfo, OpenRouterKeyStatus } from '../shared/ai';
import { internal } from './_generated/api';
import { asUserError, completeForUser, loadModels } from './lib/ai';
import { keyStatus } from './lib/openrouter';
import { chatMessageValidator } from './schema';

const modelValidator = v.object({
  id: v.string(),
  name: v.string(),
  contextLength: v.number(),
  promptPrice: v.string(),
  completionPrice: v.string(),
});

async function requireSignedIn(ctx: Parameters<typeof getAuthUserId>[0]) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError('Not signed in');
  return userId;
}

/** The OpenRouter model catalog (cached for a day). */
export const listModels = action({
  args: { refresh: v.optional(v.boolean()) },
  handler: async (ctx, { refresh }): Promise<ModelInfo[]> => {
    await requireSignedIn(ctx);
    return loadModels(ctx, { refresh });
  },
});

/**
 * Usage, limit and (when readable) credits of the key the user's AI calls use, for the
 * workspace header. Null when there is no key. Spends nothing.
 */
export const accountStatus = action({
  args: {},
  handler: async (ctx): Promise<OpenRouterKeyStatus | null> => {
    const userId = await requireSignedIn(ctx);
    const { apiKey, source } = await ctx.runQuery(internal.aiSettings.resolveForUser, { userId });
    if (!apiKey || !source) return null;
    return { source, ...(await asUserError(() => keyStatus(apiKey))) };
  },
});

/** One chat completion with the user's key; `model` defaults to their default model. */
export const complete = action({
  args: {
    messages: v.array(chatMessageValidator),
    model: v.optional(v.string()),
    temperature: v.optional(v.number()),
    maxTokens: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Completion> => {
    const userId = await requireSignedIn(ctx);
    if (args.messages.length === 0) throw new ConvexError('Send at least one message');
    return completeForUser(ctx, userId, args);
  },
});

export const cachedModels = internalQuery({
  args: {},
  handler: (ctx) => ctx.db.query('aiModelCache').first(),
});

export const storeModels = internalMutation({
  args: { models: v.array(modelValidator) },
  handler: async (ctx, { models }) => {
    const existing = await ctx.db.query('aiModelCache').first();
    if (existing) await ctx.db.replace(existing._id, { fetchedAt: Date.now(), models });
    else await ctx.db.insert('aiModelCache', { fetchedAt: Date.now(), models });
  },
});
