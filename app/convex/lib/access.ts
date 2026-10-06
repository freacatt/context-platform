import { getAuthUserId } from '@convex-dev/auth/server';
import { ConvexError } from 'convex/values';
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';

/** Every table whose documents belong to a workspace (and are deleted with it). */
export const WORKSPACE_TABLES = [
  'pyramids',
  'pyramidCells',
  'pyramidCalls',
  'pyramidFiles',
  'productDefinitions',
  'directories',
  'contextDocuments',
  'diagrams',
  'technicalArchitectures',
  'uiUxArchitectures',
  'pipelines',
  'technicalTasks',
  'links',
  'contextPacks',
  'designSystems',
  'technicalPlans',
  'decisions',
  'glossaries',
  'researchStudies',
  'roadmaps',
] as const;

export type WorkspaceTable = (typeof WORKSPACE_TABLES)[number];

type Ctx = QueryCtx | MutationCtx;

export const notFound = (what: string) => new ConvexError(`${what} not found`);

export async function requireUserId(ctx: Ctx): Promise<Id<'users'>> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError('Not signed in');
  return userId;
}

/** The workspace if the signed-in user owns it; otherwise null. Never throws. */
export async function getOwnedWorkspace(
  ctx: Ctx,
  workspaceId: Id<'workspaces'>,
): Promise<Doc<'workspaces'> | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  const workspace = await ctx.db.get(workspaceId);
  return workspace && workspace.ownerId === userId ? workspace : null;
}

export async function requireOwnedWorkspace(
  ctx: Ctx,
  workspaceId: Id<'workspaces'>,
): Promise<Doc<'workspaces'>> {
  await requireUserId(ctx);
  const workspace = await getOwnedWorkspace(ctx, workspaceId);
  if (!workspace) throw notFound('Workspace');
  return workspace;
}

/** A workspace document if the signed-in user owns its workspace; otherwise null. */
export async function getOwnedDoc<T extends WorkspaceTable>(
  ctx: Ctx,
  id: Id<T>,
): Promise<Doc<T> | null> {
  const doc = (await ctx.db.get(id)) as Doc<T> | null;
  if (!doc) return null;
  const workspace = await getOwnedWorkspace(ctx, doc.workspaceId);
  return workspace ? doc : null;
}

export async function requireOwnedDoc<T extends WorkspaceTable>(
  ctx: Ctx,
  id: Id<T>,
  what: string,
): Promise<Doc<T>> {
  await requireUserId(ctx);
  const doc = await getOwnedDoc(ctx, id);
  if (!doc) throw notFound(what);
  return doc;
}

/**
 * Like getOwnedDoc, but takes an untrusted id string (e.g. from a URL).
 * Malformed ids or ids of another table resolve to null instead of throwing.
 */
export async function getOwnedDocById<T extends WorkspaceTable>(
  ctx: Ctx,
  table: T,
  id: string,
): Promise<Doc<T> | null> {
  const normalized = ctx.db.normalizeId(table, id);
  return normalized ? getOwnedDoc(ctx, normalized) : null;
}

/** All documents of a table in a workspace, or [] when the user has no access. */
export async function listInWorkspace<T extends WorkspaceTable>(
  ctx: Ctx,
  table: T,
  workspaceId: Id<'workspaces'>,
): Promise<Doc<T>[]> {
  if (!(await getOwnedWorkspace(ctx, workspaceId))) return [];
  // Every workspace table defines a `by_workspace` index (see schema.ts); TypeScript
  // cannot see that through the generic `T`, so describe just the part we use.
  const byWorkspace = ctx.db.query(table) as unknown as {
    withIndex(
      index: 'by_workspace',
      range: (q: { eq(field: 'workspaceId', value: Id<'workspaces'>): unknown }) => unknown,
    ): { collect(): Promise<Doc<T>[]> };
  };
  return byWorkspace.withIndex('by_workspace', (q) => q.eq('workspaceId', workspaceId)).collect();
}

export const byRecentlyUpdated = <T extends { updatedAt: number }>(a: T, b: T) =>
  b.updatedAt - a.updatedAt;

export function requireNonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new ConvexError(`${field} is required`);
  return trimmed;
}
