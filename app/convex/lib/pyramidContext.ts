/** Resolves a pyramid's context sources (items, packs, files) into text for the brief. */
import type { Doc } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import { linkClosure } from '../../shared/knowledge/graph';
import { knowledgeApp } from '../../shared/knowledge/registry';
import { toKnowledgeItem } from '../../shared/knowledge/serializers';
import { refKey, type KnowledgeRef } from '../../shared/knowledge/types';
import { contextLinkDepthOf, contextRefsOf } from '../../shared/pyramid/config';
import type { ContextRef } from '../../shared/pyramid/types';
import { ConvexError } from 'convex/values';
import { notFound } from './access';
import { getItem, toSource, workspaceEdges, workspaceItems } from './knowledge';

type Ctx = QueryCtx | MutationCtx;

export interface ContextSource {
  kind: 'item' | 'file';
  /** "Diagrams", "Uploaded file", … */
  label: string;
  title: string;
  text: string;
}

/**
 * Every source of the setup as text, in order: files, then items (selected, from packs, then
 * linked). Missing or foreign sources are skipped; each item appears once.
 */
export async function resolveContext(
  ctx: Ctx,
  pyramid: Pick<Doc<'pyramids'>, '_id' | 'workspaceId' | 'config'>,
): Promise<ContextSource[]> {
  const refs = contextRefsOf(pyramid.config);
  const sources: ContextSource[] = [];

  for (const ref of refs) {
    if (ref.kind !== 'file') continue;
    const file = await getFile(ctx, pyramid, ref.id);
    if (file) sources.push({ kind: 'file', label: 'Uploaded file', title: file.title, text: file.content });
  }

  const seeds: KnowledgeRef[] = [];
  let packDepth = 0;
  const packSeeds: KnowledgeRef[] = [];
  for (const ref of refs) {
    if (ref.kind === 'item') seeds.push({ app: ref.app, id: ref.id });
    if (ref.kind === 'pack') {
      const pack = await getPack(ctx, pyramid, ref.id);
      if (!pack) continue;
      packSeeds.push(...pack.refs);
      packDepth = pack.linkDepth === -1 || packDepth === -1 ? -1 : Math.max(packDepth, pack.linkDepth);
    }
  }
  if (seeds.length === 0 && packSeeds.length === 0) return sources;

  const items = await workspaceItems(ctx, pyramid.workspaceId);
  const edges = await workspaceEdges(ctx, pyramid.workspaceId, items);
  const present = (r: KnowledgeRef) => items.has(refKey(r));
  // The pyramid itself is never its own context.
  const self = refKey({ app: 'pyramids', id: pyramid._id });
  const reached = [
    ...linkClosure(seeds.filter(present), edges, contextLinkDepthOf(pyramid.config)),
    ...linkClosure(packSeeds.filter(present), edges, packDepth),
  ];
  const seen = new Set<string>([self]);
  for (const ref of reached) {
    const key = refKey(ref);
    if (seen.has(key)) continue;
    seen.add(key);
    const item = toKnowledgeItem(await toSource(ctx, items.get(key)!));
    sources.push({ kind: 'item', label: knowledgeApp(ref.app).label, title: item.title, text: item.markdown });
  }
  return sources;
}

async function getFile(ctx: Ctx, pyramid: Pick<Doc<'pyramids'>, '_id'>, id: string) {
  const fileId = ctx.db.normalizeId('pyramidFiles', id);
  const file = fileId && (await ctx.db.get(fileId));
  return file && file.pyramidId === pyramid._id ? file : null;
}

async function getPack(ctx: Ctx, pyramid: Pick<Doc<'pyramids'>, 'workspaceId'>, id: string) {
  const packId = ctx.db.normalizeId('contextPacks', id);
  const pack = packId && (await ctx.db.get(packId));
  return pack && pack.workspaceId === pyramid.workspaceId ? pack : null;
}

/** Throws unless every ref exists: items and packs in the workspace, files on this pyramid. */
export async function requireContextRefs(ctx: Ctx, pyramid: Pick<Doc<'pyramids'>, '_id' | 'workspaceId'>, refs: ContextRef[]) {
  for (const ref of refs) {
    const found =
      ref.kind === 'item'
        ? await getItem(ctx, pyramid.workspaceId, ref)
        : ref.kind === 'pack'
          ? await getPack(ctx, pyramid, ref.id)
          : await getFile(ctx, pyramid, ref.id);
    if (!found) throw notFound(ref.kind === 'item' ? 'Context item' : ref.kind === 'pack' ? 'Context pack' : 'Context file');
  }
}

export function contextTooLarge(chars: number, max: number) {
  return new ConvexError(
    `The context is too large (~${Math.ceil(chars / 4).toLocaleString('en-US')} tokens, max ~${Math.ceil(max / 4).toLocaleString('en-US')}). Remove some sources or lower the link depth.`,
  );
}
