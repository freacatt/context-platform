/** Saved panel + host + prompts, per user, reusable for any pyramid. */
import { ConvexError, v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import { mutation, query } from './_generated/server';
import { ConfigError, normalizeHost, normalizePanel, PROMPT_MAX } from '../shared/pyramid/config';
import { hostValidator, panelistValidator } from './schema';
import { notFound, requireNonEmpty, requireUserId } from './lib/access';

const NAME_MAX = 80;

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query('pyramidPresets')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
  },
});

/** Saving with an existing name replaces that preset. */
export const save = mutation({
  args: {
    name: v.string(),
    panel: v.array(panelistValidator),
    host: hostValidator,
    defaultSystemPrompt: v.optional(v.string()),
    critiqueRound: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const name = requireNonEmpty(args.name, 'Name');
    if (name.length > NAME_MAX) throw new ConvexError(`Name is longer than ${NAME_MAX} characters`);
    const prompt = args.defaultSystemPrompt?.trim() || undefined;
    if (prompt && prompt.length > PROMPT_MAX) throw new ConvexError(`System prompt is longer than ${PROMPT_MAX} characters`);
    let panel, host;
    try {
      panel = normalizePanel(args.panel);
      host = normalizeHost(args.host);
    } catch (error) {
      throw error instanceof ConfigError ? new ConvexError(error.message) : error;
    }
    const doc = { userId, name, panel, host, defaultSystemPrompt: prompt, critiqueRound: args.critiqueRound, updatedAt: Date.now() };
    const existing = await ctx.db
      .query('pyramidPresets')
      .withIndex('by_user', (q) => q.eq('userId', userId).eq('name', name))
      .unique();
    if (existing) {
      await ctx.db.replace(existing._id, doc);
      return existing._id;
    }
    return ctx.db.insert('pyramidPresets', doc);
  },
});

export const remove = mutation({
  args: { id: v.id('pyramidPresets') },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const preset = await ctx.db.get(id);
    if (!preset || preset.userId !== userId) throw notFound('Preset');
    await ctx.db.delete(id);
  },
});
