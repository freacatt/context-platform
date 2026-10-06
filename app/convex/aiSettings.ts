/**
 * Per-user AI settings: the OpenRouter API key and the default models AI features use.
 * The key is write-only from the browser's point of view: queries return a hint, never the key.
 */
import { ConvexError, v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import { internalQuery, mutation, query, type QueryCtx, type MutationCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { keyHint } from '../shared/ai';
import { ConfigError, normalizeHost, normalizePanel } from '../shared/pyramid/config';
import { hostValidator, panelistValidator } from './schema';
import { requireUserId } from './lib/access';

/** Deployment-wide fallback key (`npx convex env set OPENROUTER_API_KEY ...`). */
const deploymentKey = () => process.env.OPENROUTER_API_KEY?.trim() || undefined;

async function settingsOf(ctx: QueryCtx | MutationCtx, userId: Id<'users'>) {
  return ctx.db
    .query('aiSettings')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique();
}

type SettingsPatch = Partial<Pick<Doc<'aiSettings'>, 'openRouterApiKey' | 'defaultModel' | 'defaultPanel' | 'defaultHost'>>;

async function upsert(ctx: MutationCtx, userId: Id<'users'>, patch: SettingsPatch) {
  const existing = await settingsOf(ctx, userId);
  if (existing) await ctx.db.patch(existing._id, { ...patch, updatedAt: Date.now() });
  else await ctx.db.insert('aiSettings', { userId, ...patch, updatedAt: Date.now() });
}

const asConvexError = <T>(fn: () => T): T => {
  try {
    return fn();
  } catch (error) {
    if (error instanceof ConfigError) throw new ConvexError(error.message);
    throw error;
  }
};

/** The signed-in user's settings, without the key. Null when signed out. */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const settings = await settingsOf(ctx, userId);
    const userKey = settings?.openRouterApiKey;
    return {
      keySource: userKey ? ('user' as const) : deploymentKey() ? ('deployment' as const) : ('none' as const),
      keyHint: userKey ? keyHint(userKey) : null,
      defaultModel: settings?.defaultModel ?? null,
      defaultPanel: settings?.defaultPanel ?? null,
      defaultHost: settings?.defaultHost ?? null,
    };
  },
});

export const setApiKey = mutation({
  args: { apiKey: v.string() },
  handler: async (ctx, { apiKey }) => {
    const userId = await requireUserId(ctx);
    const key = apiKey.trim();
    if (key.length < 20 || /\s/.test(key)) throw new ConvexError('That does not look like an OpenRouter API key');
    await upsert(ctx, userId, { openRouterApiKey: key });
  },
});

export const removeApiKey = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    await upsert(ctx, userId, { openRouterApiKey: undefined });
  },
});

/** Pass `null` to clear a default; omit a field to leave it unchanged. */
export const updateDefaults = mutation({
  args: {
    defaultModel: v.optional(v.union(v.string(), v.null())),
    defaultPanel: v.optional(v.union(v.array(panelistValidator), v.null())),
    defaultHost: v.optional(v.union(hostValidator, v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const patch: SettingsPatch = {};
    if (args.defaultModel !== undefined) patch.defaultModel = args.defaultModel?.trim() || undefined;
    if (args.defaultPanel !== undefined) {
      patch.defaultPanel = args.defaultPanel?.length ? asConvexError(() => normalizePanel(args.defaultPanel!)) : undefined;
    }
    if (args.defaultHost !== undefined) {
      patch.defaultHost = args.defaultHost?.model.trim() ? asConvexError(() => normalizeHost(args.defaultHost!)) : undefined;
    }
    await upsert(ctx, userId, patch);
  },
});

/** For actions only: the key to call OpenRouter with on behalf of `userId`. */
export const resolveForUser = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const settings = await settingsOf(ctx, userId);
    const userKey = settings?.openRouterApiKey;
    const apiKey = userKey ?? deploymentKey() ?? null;
    return {
      apiKey,
      source: userKey ? ('user' as const) : apiKey ? ('deployment' as const) : null,
      defaultModel: settings?.defaultModel ?? null,
    };
  },
});
