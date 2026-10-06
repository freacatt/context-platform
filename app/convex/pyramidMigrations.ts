/**
 * One-off migration: pyramids from the hand-filled block-grid version become drafts of the
 * roundtable solver (root question → question, problem statement → context).
 *
 * The new schema rejects old documents, so on a deployment that still has them: deploy once
 * with `schemaValidation: false` in schema.ts, run
 *   npx convex run pyramidMigrations:legacyToDrafts
 * then deploy again with validation on.
 */
import { internalMutation } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import { normalizePyramid } from './lib/workspaceTransfer';

export const legacyToDrafts = internalMutation({
  args: {},
  handler: async (ctx) => {
    let converted = 0;
    for (const doc of await ctx.db.query('pyramids').collect()) {
      const raw = doc as unknown as Record<string, unknown>;
      if (raw.config !== undefined) continue;
      const { config, contextSourceRefs: _none, ...run } = normalizePyramid(raw, doc.title);
      await ctx.db.replace(doc._id, {
        workspaceId: doc.workspaceId,
        title: doc.title,
        updatedAt: doc.updatedAt,
        config: { ...config, contextDocumentIds: [] },
        ...run,
      } satisfies Omit<Doc<'pyramids'>, '_id' | '_creationTime'>);
      converted++;
    }
    return { converted };
  },
});
