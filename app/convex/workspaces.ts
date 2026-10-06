import { getAuthUserId } from '@convex-dev/auth/server';
import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import {
  WORKSPACE_TABLES,
  byRecentlyUpdated,
  getOwnedWorkspace,
  listInWorkspace,
  requireNonEmpty,
  requireOwnedWorkspace,
  requireUserId,
} from './lib/access';
import { EXPORT_FORMAT, EXPORT_VERSION, parseWorkspaceImport, type ImportedContextRef, type ImportedRef, type SpecTableName } from './lib/workspaceTransfer';
import { insertSpecDoc } from './lib/specDocs';
import type { ContextRef } from '../shared/pyramid/types';
import type { KnowledgeApp } from '../shared/knowledge/types';

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const workspaces = await ctx.db
      .query('workspaces')
      .withIndex('by_owner', (q) => q.eq('ownerId', userId))
      .collect();
    return workspaces.sort(byRecentlyUpdated);
  },
});

export const get = query({
  args: { id: v.id('workspaces') },
  handler: (ctx, { id }) => getOwnedWorkspace(ctx, id),
});

function insertWorkspace(ctx: MutationCtx, ownerId: Id<'users'>, name: string) {
  return ctx.db.insert('workspaces', { ownerId, name, updatedAt: Date.now() });
}

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const userId = await requireUserId(ctx);
    return insertWorkspace(ctx, userId, requireNonEmpty(name, 'Name'));
  },
});

export const rename = mutation({
  args: { id: v.id('workspaces'), name: v.string() },
  handler: async (ctx, { id, name }) => {
    await requireOwnedWorkspace(ctx, id);
    await ctx.db.patch(id, { name: requireNonEmpty(name, 'Name'), updatedAt: Date.now() });
  },
});

/** Deletes a workspace and everything in it. */
export const remove = mutation({
  args: { id: v.id('workspaces') },
  handler: async (ctx, { id }) => {
    await requireOwnedWorkspace(ctx, id);
    for (const table of WORKSPACE_TABLES) {
      for (const doc of await listInWorkspace(ctx, table, id)) {
        await ctx.db.delete(doc._id);
      }
    }
    await ctx.db.delete(id);
  },
});

/** Strips Convex system fields and exposes the document id as `id`. */
type StoredDoc = { _id: string; _creationTime: number; workspaceId?: string } & Record<string, unknown>;

function toExportRecord(doc: StoredDoc) {
  const { _id, _creationTime: _created, workspaceId: _workspace, ...rest } = doc;
  return { id: _id, ...rest };
}

/** Everything in a workspace, in the backup format read by `importData`. */
export const exportData = query({
  args: { id: v.id('workspaces') },
  handler: async (ctx, { id }) => {
    const workspace = await getOwnedWorkspace(ctx, id);
    if (!workspace) return null;
    const all = (table: (typeof WORKSPACE_TABLES)[number]) =>
      listInWorkspace(ctx, table, id).then((docs) => docs.map((d) => toExportRecord(d as unknown as StoredDoc)));
    return {
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      workspace: { name: workspace.name },
      pyramids: await all('pyramids'),
      // Calls (prompts and raw outputs) are an audit trail and stay out of backups.
      pyramidCells: await all('pyramidCells'),
      pyramidFiles: await all('pyramidFiles'),
      productDefinitions: await all('productDefinitions'),
      contextDocuments: await all('contextDocuments'),
      directories: await all('directories'),
      technicalArchitectures: await all('technicalArchitectures'),
      uiUxArchitectures: await all('uiUxArchitectures'),
      diagrams: await all('diagrams'),
      // Legacy tasks not converted yet; they import as technical plans.
      technicalTasks: { tasks: await all('technicalTasks') },
      designSystems: await all('designSystems'),
      technicalPlans: await all('technicalPlans'),
      decisions: await all('decisions'),
      glossaries: await all('glossaries'),
      researchStudies: await all('researchStudies'),
      roadmaps: await all('roadmaps'),
      links: await all('links'),
      contextPacks: await all('contextPacks'),
    };
  },
});

/** Creates a new workspace from a backup file's JSON. Returns the new workspace id. */
export const importData = mutation({
  args: { data: v.any() },
  handler: async (ctx, { data }) => {
    const userId = await requireUserId(ctx);
    let parsed;
    try {
      parsed = parseWorkspaceImport(data, `Imported workspace (${new Date().toISOString().slice(0, 10)})`);
    } catch (error) {
      throw new ConvexError(error instanceof Error ? error.message : 'Invalid workspace file');
    }

    const now = Date.now();
    const workspaceId = await insertWorkspace(ctx, userId, parsed.name);
    const scoped = { workspaceId, updatedAt: now };
    /**
     * "app:sourceId" → the new item, for every imported knowledge item (re-links links, packs and
     * pyramid context). Legacy tasks map to the technical plans they become.
     */
    const itemIds = new Map<string, { app: KnowledgeApp; id: string }>();
    const remember = (app: KnowledgeApp, sourceId: string | undefined, id: string, newApp: KnowledgeApp = app) => {
      if (sourceId) itemIds.set(`${app}:${sourceId}`, { app: newApp, id });
    };
    const newItem = (ref: ImportedRef) => itemIds.get(`${ref.app}:${ref.sourceId}`);

    const directoryIds = new Map<string, Id<'directories'>>();
    for (const d of parsed.directories) {
      const id = await ctx.db.insert('directories', { ...scoped, title: d.title });
      if (d.sourceId) directoryIds.set(d.sourceId, id);
    }
    for (const d of parsed.contextDocuments) {
      const documentId = await ctx.db.insert('contextDocuments', {
        ...scoped,
        title: d.title,
        type: d.type,
        content: d.content,
        directoryId: d.directorySourceId ? directoryIds.get(d.directorySourceId) : undefined,
      });
      remember('contextDocuments', d.sourceId, documentId);
    }
    for (const p of parsed.productDefinitions) {
      remember('productDefinitions', p.sourceId, await ctx.db.insert('productDefinitions', { ...scoped, title: p.title, spec: p.spec }));
    }
    for (const d of parsed.diagrams) {
      remember('diagrams', d.sourceId, await ctx.db.insert('diagrams', { ...scoped, title: d.title, nodes: d.nodes, edges: d.edges }));
    }
    const architectureIds = new Map<string, Id<'technicalArchitectures'>>();
    for (const a of parsed.technicalArchitectures) {
      const id = await ctx.db.insert('technicalArchitectures', { ...scoped, title: a.title, spec: a.spec });
      if (a.sourceId) architectureIds.set(a.sourceId, id);
      remember('technicalArchitectures', a.sourceId, id);
    }
    const designSystemIds = new Map<string, Id<'designSystems'>>();
    for (const table of Object.keys(parsed.specDocs) as SpecTableName[]) {
      for (const d of parsed.specDocs[table]) {
        const id = await insertSpecDoc(ctx, table, workspaceId, d.title, d.spec);
        if (table === 'designSystems' && d.sourceId) designSystemIds.set(d.sourceId, id as Id<'designSystems'>);
        remember(table, d.sourceId, id);
      }
    }
    for (const a of parsed.uiUxArchitectures) {
      const id = await ctx.db.insert('uiUxArchitectures', {
        ...scoped,
        title: a.title,
        ...(a.sections as Omit<Doc<'uiUxArchitectures'>, '_id' | '_creationTime' | 'workspaceId' | 'title' | 'updatedAt'>),
        designSystemId: a.designSystemSourceId ? designSystemIds.get(a.designSystemSourceId) : undefined,
      });
      remember('uiUxArchitectures', a.sourceId, id);
    }
    // Legacy technical tasks become technical plans.
    for (const t of [...parsed.technicalTasks].sort((a, b) => a.order - b.order)) {
      const planId = await insertSpecDoc(ctx, 'technicalPlans', workspaceId, t.title, t.spec);
      remember('technicalTasks', t.sourceId, planId, 'technicalPlans');
      const architectureId = t.architectureSourceId && architectureIds.get(t.architectureSourceId);
      if (architectureId) {
        await ctx.db.insert('links', { workspaceId, fromApp: 'technicalPlans', fromId: planId, toApp: 'technicalArchitectures', toId: architectureId, kind: 'depends-on', createdAt: now });
      }
    }

    // Packs and pyramids may reference each other: insert both, then fill in their references.
    const packIds = new Map<string, Id<'contextPacks'>>();
    const packs: [Id<'contextPacks'>, ImportedRef[]][] = [];
    for (const pack of parsed.contextPacks) {
      const id = await ctx.db.insert('contextPacks', { ...scoped, title: pack.title, refs: [], linkDepth: pack.linkDepth });
      if (pack.sourceId) packIds.set(pack.sourceId, id);
      packs.push([id, pack.refs]);
    }

    const pyramidIds = new Map<string, Id<'pyramids'>>();
    const pyramids: [Id<'pyramids'>, ImportedContextRef[]][] = [];
    for (const { sourceId, title, config, contextSourceRefs, ...run } of parsed.pyramids) {
      const id = await ctx.db.insert('pyramids', {
        ...scoped,
        title,
        config: { ...config, contextDocumentIds: [], contextRefs: [] },
        ...run,
      });
      if (sourceId) pyramidIds.set(sourceId, id);
      remember('pyramids', sourceId, id);
      pyramids.push([id, contextSourceRefs]);
    }
    for (const { pyramidSourceId, ...cell } of parsed.pyramidCells) {
      const pyramidId = pyramidIds.get(pyramidSourceId);
      if (pyramidId) await ctx.db.insert('pyramidCells', { workspaceId, pyramidId, ...cell });
    }
    const fileIds = new Map<string, Id<'pyramidFiles'>>();
    for (const f of parsed.pyramidFiles) {
      const pyramidId = pyramidIds.get(f.pyramidSourceId);
      if (!pyramidId) continue;
      const id = await ctx.db.insert('pyramidFiles', { ...scoped, pyramidId, title: f.title, content: f.content });
      if (f.sourceId) fileIds.set(f.sourceId, id);
    }

    for (const [id, sources] of pyramids) {
      const contextRefs = sources.flatMap((ref): ContextRef[] => {
        if (ref.kind === 'item') {
          const item = newItem(ref);
          return item ? [{ kind: 'item', app: item.app, id: item.id }] : [];
        }
        const mapped = ref.kind === 'pack' ? packIds.get(ref.sourceId) : fileIds.get(ref.sourceId);
        return mapped ? [{ kind: ref.kind, id: mapped }] : [];
      });
      const pyramid = (await ctx.db.get(id))!;
      await ctx.db.patch(id, { config: { ...pyramid.config, contextRefs } });
    }
    for (const [id, refs] of packs) {
      await ctx.db.patch(id, { refs: refs.flatMap((r) => newItem(r) ?? []) });
    }

    const seenLinks = new Set<string>();
    for (const link of parsed.links) {
      const from = newItem(link.from);
      const to = newItem(link.to);
      const key = `${from?.id}>${to?.id}>${link.kind}`;
      if (!from || !to || from.id === to.id || seenLinks.has(key)) continue;
      seenLinks.add(key);
      await ctx.db.insert('links', { workspaceId, fromApp: from.app, fromId: from.id, toApp: to.app, toId: to.id, kind: link.kind, createdAt: now });
    }
    return workspaceId;
  },
});
