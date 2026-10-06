/**
 * The standard functions of an app whose documents are `{ title, spec }`: the spec is
 * editor-owned JSON, normalized by a pure `shared/specs` function on every write and read.
 */
import { v } from 'convex/values';
import type { Doc, Id } from '../_generated/dataModel';
import { mutation, query, type MutationCtx } from '../_generated/server';
import { byRecentlyUpdated, getOwnedDocById, listInWorkspace, requireNonEmpty, requireOwnedDoc, requireOwnedWorkspace } from './access';
import { deleteLinksOf } from './knowledge';

export const SPEC_TABLES = ['designSystems', 'technicalPlans', 'decisions', 'glossaries', 'researchStudies', 'roadmaps'] as const;
export type SpecTable = (typeof SPEC_TABLES)[number];

export type SpecDoc<T extends SpecTable, S> = Omit<Doc<T>, 'spec'> & { spec: S };

interface Options<S> {
  /** Singular, capitalized: "Decision" (used in "Decision not found"). */
  what: string;
  normalize: (raw: unknown) => S;
  initial: () => S;
}

/** Inserts a document of a spec table (also used by imports and conversions). */
export async function insertSpecDoc<T extends SpecTable>(ctx: MutationCtx, table: T, workspaceId: Id<'workspaces'>, title: string, spec: unknown) {
  return (await ctx.db.insert(table, { workspaceId, title, spec, updatedAt: Date.now() } as never)) as Id<T>;
}

export function specDocFunctions<T extends SpecTable, S>(table: T, {
    what,
    normalize,
    initial,
    onRemove,
  }: Options<S> & {
    /** Clean-up of references to the document, before it is deleted. */
    onRemove?: (ctx: MutationCtx, id: Id<T>) => Promise<void>;
  }) {
  const withSpec = (doc: Doc<T>): SpecDoc<T, S> => ({ ...doc, spec: normalize(doc.spec) });

  return {
    list: query({
      args: { workspaceId: v.id('workspaces') },
      handler: async (ctx, { workspaceId }) =>
        (await listInWorkspace(ctx, table, workspaceId)).sort((a, b) => byRecentlyUpdated(a as unknown as { updatedAt: number }, b as unknown as { updatedAt: number })).map(withSpec),
    }),

    /** Accepts any string (e.g. a URL segment); unknown or foreign ids return null. */
    get: query({
      args: { id: v.string() },
      handler: async (ctx, { id }) => {
        const doc = await getOwnedDocById(ctx, table, id);
        return doc ? withSpec(doc) : null;
      },
    }),

    create: mutation({
      args: { workspaceId: v.id('workspaces'), title: v.string() },
      handler: async (ctx, { workspaceId, title }) => {
        await requireOwnedWorkspace(ctx, workspaceId);
        return insertSpecDoc(ctx, table, workspaceId, requireNonEmpty(title, 'Title'), initial());
      },
    }),

    rename: mutation({
      args: { id: v.id(table), title: v.string() },
      handler: async (ctx, { id, title }) => {
        await requireOwnedDoc(ctx, id as Id<T>, what);
        await ctx.db.patch(id as Id<T>, { title: requireNonEmpty(title, 'Title'), updatedAt: Date.now() } as never);
      },
    }),

    /** Replaces the spec (normalized). */
    update: mutation({
      args: { id: v.id(table), spec: v.any() },
      handler: async (ctx, { id, spec }) => {
        await requireOwnedDoc(ctx, id as Id<T>, what);
        await ctx.db.patch(id as Id<T>, { spec: normalize(spec), updatedAt: Date.now() } as never);
      },
    }),

    duplicate: mutation({
      args: { id: v.id(table) },
      handler: async (ctx, { id }) => {
        const doc = await requireOwnedDoc(ctx, id as Id<T>, what);
        return insertSpecDoc(ctx, table, doc.workspaceId, `${doc.title} (Copy)`, normalize(doc.spec));
      },
    }),

    remove: mutation({
      args: { id: v.id(table) },
      handler: async (ctx, { id }) => {
        await requireOwnedDoc(ctx, id as Id<T>, what);
        await onRemove?.(ctx, id as Id<T>);
        await deleteLinksOf(ctx, id);
        await ctx.db.delete(id as Id<T>);
      },
    }),
  };
}
