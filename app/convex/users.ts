import { getAuthUserId } from '@convex-dev/auth/server';
import { query } from './_generated/server';

/** The signed-in user, or null. */
export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return { _id: user._id, email: user.email ?? null, name: user.name ?? null };
  },
});
