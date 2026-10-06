/**
 * Knowledge export formats, as plain strings (zipping happens in the browser):
 * - zip: one `<folder>/<slug>.md` per item (frontmatter + wiki-links), INDEX.md, graph.json
 * - single: one Markdown document with anchors and in-document links
 */
import { edgesWithin } from './graph';
import { appOrder, knowledgeApp, KNOWLEDGE_APPS } from './registry';
import { LINK_KIND_LABELS, refKey, type KnowledgeEdge, type KnowledgeItem } from './types';

export interface KnowledgeBundle {
  workspaceName: string;
  /** ISO timestamp. */
  exportedAt: string;
  items: KnowledgeItem[];
  /** Explicit and derived edges; edges leaving the export are ignored. */
  edges: KnowledgeEdge[];
}

const MAX_SLUG = 80;

export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG)
    .replace(/-+$/, '');
  return slug || 'untitled';
}

/** Items in a stable order: app (dashboard order), then title, then id. */
export function sortItems(items: KnowledgeItem[]): KnowledgeItem[] {
  return [...items].sort(
    (a, b) =>
      appOrder(a.ref.app) - appOrder(b.ref.app) ||
      a.title.localeCompare(b.title) ||
      a.ref.id.localeCompare(b.ref.id),
  );
}

/** `<folder>/<slug>` (no extension) per item key; duplicate slugs get -2, -3, … */
export function assignPaths(items: KnowledgeItem[]): Map<string, string> {
  const paths = new Map<string, string>();
  const used = new Set<string>();
  for (const item of sortItems(items)) {
    const base = `${knowledgeApp(item.ref.app).folder}/${slugify(item.title)}`;
    let path = base;
    for (let i = 2; used.has(path); i++) path = `${base}-${i}`;
    used.add(path);
    paths.set(refKey(item.ref), path);
  }
  return paths;
}

/** A YAML scalar; JSON strings are valid YAML double-quoted scalars. */
const yaml = (value: string | number) => (typeof value === 'number' ? String(value) : JSON.stringify(value));

/** Text safe inside `[[path|text]]` and `[text](url)`. */
const linkText = (title: string) => title.replace(/[[\]|]/g, ' ').replace(/\s+/g, ' ').trim() || 'Untitled';

const kindLabel = (edge: KnowledgeEdge) => LINK_KIND_LABELS[edge.kind];

interface Prepared {
  items: KnowledgeItem[];
  byKey: Map<string, KnowledgeItem>;
  paths: Map<string, string>;
  edges: KnowledgeEdge[];
}

function prepare(bundle: KnowledgeBundle): Prepared {
  const items = sortItems(bundle.items);
  const byKey = new Map(items.map((i) => [refKey(i.ref), i]));
  const paths = assignPaths(items);
  const edges = edgesWithin(bundle.edges, new Set(byKey.keys())).sort(
    (a, b) =>
      paths.get(refKey(a.from))!.localeCompare(paths.get(refKey(b.from))!) ||
      paths.get(refKey(a.to))!.localeCompare(paths.get(refKey(b.to))!) ||
      a.kind.localeCompare(b.kind),
  );
  return { items, byKey, paths, edges };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const summaryLine = (bundle: KnowledgeBundle, p: Prepared) =>
  `Exported ${bundle.exportedAt}. ${plural(p.items.length, 'item')}, ${plural(p.edges.length, 'relation')}.`;

// --- zip ---------------------------------------------------------------------------------

function itemFile(item: KnowledgeItem, p: Prepared): string {
  const key = refKey(item.ref);
  const outgoing = p.edges.filter((e) => refKey(e.from) === key);
  const incoming = p.edges.filter((e) => refKey(e.to) === key);
  const wiki = (k: string) => `[[${p.paths.get(k)}|${linkText(p.byKey.get(k)!.title)}]]`;

  const front = [
    '---',
    `id: ${yaml(item.ref.id)}`,
    `app: ${yaml(item.ref.app)}`,
    `title: ${yaml(item.title)}`,
    `updated: ${yaml(new Date(item.updatedAt).toISOString())}`,
    ...Object.entries(item.meta).map(([k, v]) => `${k}: ${yaml(v)}`),
  ];
  if (outgoing.length) {
    front.push('links:');
    for (const e of outgoing) front.push(`  - kind: ${yaml(e.kind)}`, `    to: ${yaml(`${p.paths.get(refKey(e.to))}.md`)}`);
  }
  front.push('---', '');

  const out = [...front, item.markdown.trimEnd(), ''];
  if (outgoing.length) out.push('## Links', '', ...outgoing.map((e) => `- ${kindLabel(e)}: ${wiki(refKey(e.to))}`), '');
  if (incoming.length) out.push('## Backlinks', '', ...incoming.map((e) => `- ${wiki(refKey(e.from))} (${kindLabel(e).toLowerCase()})`), '');
  return out.join('\n');
}

function indexFile(bundle: KnowledgeBundle, p: Prepared): string {
  const out = [`# ${bundle.workspaceName} — Knowledge`, '', summaryLine(bundle, p), ''];
  for (const app of KNOWLEDGE_APPS) {
    const items = p.items.filter((i) => i.ref.app === app.key);
    if (!items.length) continue;
    out.push(`## ${app.label}`, '', ...items.map((i) => `- [[${p.paths.get(refKey(i.ref))}|${linkText(i.title)}]]`), '');
  }
  if (p.edges.length) {
    out.push('## Relations', '', '| From | Relation | To |', '|---|---|---|');
    for (const e of p.edges) {
      const from = refKey(e.from);
      const to = refKey(e.to);
      out.push(
        `| [[${p.paths.get(from)}\\|${linkText(p.byKey.get(from)!.title)}]] | ${kindLabel(e)}${e.source === 'derived' ? ' (auto)' : ''} | ` +
          `[[${p.paths.get(to)}\\|${linkText(p.byKey.get(to)!.title)}]] |`,
      );
    }
    out.push('');
  }
  return out.join('\n');
}

function graphFile(bundle: KnowledgeBundle, p: Prepared): string {
  const graph = {
    workspace: bundle.workspaceName,
    exportedAt: bundle.exportedAt,
    nodes: p.items.map((i) => ({ id: i.ref.id, app: i.ref.app, title: i.title, path: `${p.paths.get(refKey(i.ref))}.md` })),
    edges: p.edges.map((e) => ({ from: e.from.id, to: e.to.id, kind: e.kind, source: e.source })),
  };
  return JSON.stringify(graph, null, 2) + '\n';
}

/** Zip contents: path → file text. */
export function buildZipEntries(bundle: KnowledgeBundle): Record<string, string> {
  const p = prepare(bundle);
  const files: Record<string, string> = { 'INDEX.md': indexFile(bundle, p), 'graph.json': graphFile(bundle, p) };
  for (const item of p.items) files[`${p.paths.get(refKey(item.ref))}.md`] = itemFile(item, p);
  return files;
}

// --- single file -------------------------------------------------------------------------

/** Adds one `#` to every ATX heading outside fenced code blocks (h6 stays h6). */
export function demoteHeadings(markdown: string): string {
  let fence: string | null = null;
  return markdown
    .split('\n')
    .map((line) => {
      const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];
      if (marker) {
        if (fence === null) fence = marker;
        else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
        return line;
      }
      if (fence === null && /^#{1,5}\s/.test(line)) return `#${line}`;
      return line;
    })
    .join('\n');
}

const anchorOf = (path: string) => path.replace(/\//g, '-');

export function buildSingleMarkdown(bundle: KnowledgeBundle): string {
  const p = prepare(bundle);
  const link = (k: string) => `[${linkText(p.byKey.get(k)!.title)}](#${anchorOf(p.paths.get(k)!)})`;
  const out = [`# ${bundle.workspaceName} — Knowledge`, '', summaryLine(bundle, p), '', '## Contents', ''];
  for (const app of KNOWLEDGE_APPS) {
    const items = p.items.filter((i) => i.ref.app === app.key);
    if (!items.length) continue;
    out.push(`- **${app.label}**`, ...items.map((i) => `  - ${link(refKey(i.ref))}`));
  }
  out.push('');

  for (const item of p.items) {
    const key = refKey(item.ref);
    const outgoing = p.edges.filter((e) => refKey(e.from) === key);
    const incoming = p.edges.filter((e) => refKey(e.to) === key);
    out.push('---', '', `<a id="${anchorOf(p.paths.get(key)!)}"></a>`, '', demoteHeadings(item.markdown.trimEnd()), '');
    const facts = [`App: ${knowledgeApp(item.ref.app).label}`, ...Object.entries(item.meta).map(([k, v]) => `${k}: ${v}`)];
    out.push(`_${facts.join(' · ')}_`, '');
    if (outgoing.length) out.push('**Links:** ' + outgoing.map((e) => `${kindLabel(e)} ${link(refKey(e.to))}`).join('; '), '');
    if (incoming.length) out.push('**Backlinks:** ' + incoming.map((e) => `${link(refKey(e.from))} (${kindLabel(e).toLowerCase()})`).join('; '), '');
  }

  if (p.edges.length) {
    out.push('---', '', '## Relations', '', '| From | Relation | To |', '|---|---|---|');
    for (const e of p.edges) out.push(`| ${link(refKey(e.from))} | ${kindLabel(e)}${e.source === 'derived' ? ' (auto)' : ''} | ${link(refKey(e.to))} |`);
    out.push('');
  }
  return out.join('\n');
}

/** Rough token count for display (≈4 characters per token). */
export const estimateTokens = (text: string): number => Math.ceil(text.length / 4);
