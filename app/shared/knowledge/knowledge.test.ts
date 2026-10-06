import { describe, expect, it } from 'vitest';
import { rowLabels, workingRows } from '../pyramid/board';
import { defaultReply } from '../pyramid/fakeModel';
import { validateHostRow } from '../pyramid/parsing';
import type { HostCell } from '../pyramid/types';
import { assignPaths, buildSingleMarkdown, buildZipEntries, demoteHeadings, slugify, type KnowledgeBundle } from './bundle';
import { ALL_LINKS, edgesWithin, linkClosure } from './graph';
import { derivedEdges, toKnowledgeItem, type PyramidSource } from './serializers';
import { refKey, type KnowledgeEdge, type KnowledgeItem, type KnowledgeRef } from './types';

const item = (app: KnowledgeItem['ref']['app'], id: string, title: string, markdown = `# ${title}\n`): KnowledgeItem => ({
  ref: { app, id },
  title,
  updatedAt: Date.UTC(2026, 0, 2),
  meta: {},
  markdown,
});
const edge = (from: KnowledgeRef, to: KnowledgeRef, kind: KnowledgeEdge['kind'] = 'references', source: KnowledgeEdge['source'] = 'explicit'): KnowledgeEdge => ({
  from,
  to,
  kind,
  source,
});

function completedCells(n: number): Record<string, HostCell> {
  const out: Record<string, HostCell> = {};
  for (const row of workingRows(n)) {
    const text = defaultReply({ role: 'host', model: 'h', labels: rowLabels(n, row), boardSize: n, prompt: '' });
    for (const cell of validateHostRow(JSON.parse(text), n, row)) out[cell.label] = cell;
  }
  return out;
}

const pyramid = (cells: Record<string, HostCell>): PyramidSource => ({
  _id: 'p1',
  title: 'Market',
  updatedAt: 1,
  status: 'completed',
  currentRow: 2,
  config: { question: 'Which market next?', context: 'We sell tea.', contextDocumentIds: ['d1', 'd1', 'd2'], boardSize: 2 },
  cells,
});

describe('serializers', () => {
  it('serializes a product definition from its spec, or from the previous version', () => {
    const out = toKnowledgeItem({ app: 'productDefinitions', doc: { _id: 'pd', title: 'Checkout', updatedAt: 5, spec: { vision: 'Pay fast' } } });
    expect(out.ref).toEqual({ app: 'productDefinitions', id: 'pd' });
    expect(out.markdown.startsWith('# Checkout\n')).toBe(true);
    expect(out.markdown).toContain('## Vision\n\nPay fast');
    const legacy = toKnowledgeItem({
      app: 'productDefinitions',
      doc: { _id: 'pd', title: 'Old', updatedAt: 5, data: { root: { id: 'root', label: 'R', children: ['a'] }, a: { id: 'a', label: 'Product Summary', description: 'One-liner' } } },
    });
    expect(legacy.markdown).toContain('## Vision\n\nOne-liner');
  });

  it('serializes spec apps with their status', () => {
    const plan = toKnowledgeItem({ app: 'technicalPlans', doc: { _id: 'tp', title: 'Plan', updatedAt: 1, spec: { status: 'ready', goal: 'Ship' } } });
    expect(plan.meta).toEqual({ status: 'Ready' });
    expect(plan.markdown).toContain('## Goal\n\nShip');
    const decision = toKnowledgeItem({ app: 'decisions', doc: { _id: 'd', title: 'D', updatedAt: 1, spec: { status: 'accepted', date: '2026-01-02' } } });
    expect(decision.meta).toEqual({ status: 'accepted', date: '2026-01-02' });
    for (const app of ['designSystems', 'glossaries', 'researchStudies', 'roadmaps'] as const) {
      expect(toKnowledgeItem({ app, doc: { _id: 'x', title: 'T', updatedAt: 1, spec: {} } }).markdown.startsWith('# T')).toBe(true);
    }
  });

  it('uses the plain text of rich content and records type and folder', () => {
    const content = JSON.stringify({ root: { children: [{ type: 'paragraph', children: [{ text: 'Hello world' }] }] } });
    const out = toKnowledgeItem({ app: 'contextDocuments', doc: { _id: 'd', title: 'Notes', updatedAt: 1, type: 'note', content, folder: 'Research' } });
    expect(out.markdown).toBe('# Notes\n\nHello world\n');
    expect(out.meta).toEqual({ type: 'note', folder: 'Research' });
  });

  it('serializes a completed pyramid without costs', () => {
    const md = toKnowledgeItem({ app: 'pyramids', doc: pyramid(completedCells(2)) }).markdown;
    expect(md).toContain('**Question:** Which market next?');
    expect(md).toContain('## Context\n\nWe sell tea.');
    expect(md).toContain('## Final answer');
    expect(md).toContain('## Critical path');
    expect(md).not.toMatch(/cost/i);
    expect(md).not.toContain('Not reached yet');
  });

  it('says when a pyramid has not reached its final cell', () => {
    const md = toKnowledgeItem({ app: 'pyramids', doc: { ...pyramid({}), status: 'running', currentRow: 0 } }).markdown;
    expect(md).toContain('_Not reached yet: the pyramid is running at row 0._');
    expect(md).not.toContain('## Critical path');
  });

  it('formats task dates deterministically and records type, status and pipeline', () => {
    const out = toKnowledgeItem({
      app: 'technicalTasks',
      doc: {
        _id: 't',
        title: 'Login',
        updatedAt: 1,
        type: 'NEW_TASK',
        pipeline: 'Backlog',
        data: {
          task_metadata: { task_id: 'T-1', task_type: 'NEW_TASK', parent_architecture_ref: '', created_at: '2026-01-02T03:04:05.000Z', priority: 'HIGH', status: 'PENDING', assigned_to: '', estimated_hours: 2 },
          description: { main: { title: 'Login' }, advanced: {} },
        } as never,
      },
    });
    expect(out.markdown).toContain('- **Created:** 2026-01-02T03:04:05.000Z');
    expect(out.meta).toEqual({ type: 'NEW_TASK', status: 'PENDING', pipeline: 'Backlog' });
  });

  it('derives task → architecture and pyramid → documents edges', () => {
    expect(derivedEdges({ app: 'technicalTasks', doc: { _id: 't', technicalArchitectureId: 'a' } })).toEqual([
      edge({ app: 'technicalTasks', id: 't' }, { app: 'technicalArchitectures', id: 'a' }, 'depends-on', 'derived'),
    ]);
    expect(derivedEdges({ app: 'technicalTasks', doc: { _id: 't' } })).toEqual([]);
    expect(derivedEdges({ app: 'pyramids', doc: pyramid({}) }).map((e) => e.to.id)).toEqual(['d1', 'd2']);
    expect(derivedEdges({ app: 'diagrams', doc: { _id: 'x' } })).toEqual([]);
    expect(derivedEdges({ app: 'uiUxArchitectures', doc: { _id: 'u', designSystemId: 'ds' } })).toEqual([
      edge({ app: 'uiUxArchitectures', id: 'u' }, { app: 'designSystems', id: 'ds' }, 'depends-on', 'derived'),
    ]);
  });
});

describe('link closure', () => {
  const task = { app: 'technicalTasks', id: 't' } as const;
  const arch = { app: 'technicalArchitectures', id: 'a' } as const;
  const pd = { app: 'productDefinitions', id: 'p' } as const;
  const edges = [edge(task, arch, 'depends-on', 'derived'), edge(arch, pd, 'implements')];

  it('follows links in both directions up to the depth', () => {
    expect(linkClosure([task], edges, 0).map(refKey)).toEqual(['technicalTasks:t']);
    expect(linkClosure([task], edges, 1).map(refKey)).toEqual(['technicalTasks:t', 'technicalArchitectures:a']);
    expect(linkClosure([pd], edges, 2).map(refKey)).toEqual(['productDefinitions:p', 'technicalArchitectures:a', 'technicalTasks:t']);
    expect(linkClosure([task], edges, ALL_LINKS)).toHaveLength(3);
  });

  it('dedupes seeds and survives cycles', () => {
    expect(linkClosure([task, task], [...edges, edge(pd, task)], ALL_LINKS)).toHaveLength(3);
  });

  it('keeps edges inside the set, preferring explicit over derived duplicates', () => {
    const keys = new Set(['technicalTasks:t', 'technicalArchitectures:a']);
    const kept = edgesWithin([...edges, edge(task, arch, 'depends-on', 'explicit')], keys);
    expect(kept).toEqual([edge(task, arch, 'depends-on', 'explicit')]);
  });
});

describe('bundle', () => {
  it('slugifies titles', () => {
    expect(slugify('  Café Checkout: v2!  ')).toBe('cafe-checkout-v2');
    expect(slugify('***')).toBe('untitled');
    expect(slugify('a'.repeat(200))).toHaveLength(80);
  });

  it('gives duplicate titles unique paths', () => {
    const paths = assignPaths([item('diagrams', 'b', 'Flow'), item('diagrams', 'a', 'Flow')]);
    expect(paths.get('diagrams:a')).toBe('diagrams/flow');
    expect(paths.get('diagrams:b')).toBe('diagrams/flow-2');
  });

  const arch = item('technicalArchitectures', 'a', 'Core', '# Core\n\n## Layers\n');
  const pd = item('productDefinitions', 'p', 'Shop | v1');
  const outside = { app: 'diagrams', id: 'gone' } as const;
  const bundle: KnowledgeBundle = {
    workspaceName: 'Acme',
    exportedAt: '2026-01-02T00:00:00.000Z',
    items: [arch, pd],
    edges: [edge(arch.ref, pd.ref, 'implements'), edge(arch.ref, outside)],
  };

  it('writes item files with frontmatter, links and backlinks', () => {
    const files = buildZipEntries(bundle);
    expect(Object.keys(files).sort()).toEqual(['INDEX.md', 'graph.json', 'product-definitions/shop-v1.md', 'technical-architectures/core.md']);
    const core = files['technical-architectures/core.md'];
    expect(core).toContain('---\nid: "a"\napp: "technicalArchitectures"\ntitle: "Core"\nupdated: "2026-01-02T00:00:00.000Z"\nlinks:\n  - kind: "implements"\n    to: "product-definitions/shop-v1.md"\n---');
    expect(core).toContain('## Links\n\n- Implements: [[product-definitions/shop-v1|Shop v1]]');
    expect(core).not.toContain('gone');
    expect(files['product-definitions/shop-v1.md']).toContain('## Backlinks\n\n- [[technical-architectures/core|Core]] (implements)');
  });

  it('writes the relations into INDEX.md and graph.json', () => {
    const files = buildZipEntries(bundle);
    expect(files['INDEX.md']).toContain('| [[technical-architectures/core\\|Core]] | Implements | [[product-definitions/shop-v1\\|Shop v1]] |');
    expect(files['INDEX.md']).toContain('2 items, 1 relation.');
    const graph = JSON.parse(files['graph.json']);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toEqual([{ from: 'a', to: 'p', kind: 'implements', source: 'explicit' }]);
  });

  it('demotes headings outside fenced code', () => {
    expect(demoteHeadings('# T\n## S\n```\n# comment\n```\n###### h6')).toBe('## T\n### S\n```\n# comment\n```\n###### h6');
    expect(demoteHeadings('~~~~\n# a\n~~~\n# b\n~~~~\n# c')).toBe('~~~~\n# a\n~~~\n# b\n~~~~\n## c');
  });

  it('builds a single document with anchors and in-document links', () => {
    const md = buildSingleMarkdown(bundle);
    expect(md).toContain('<a id="technical-architectures-core"></a>\n\n## Core\n\n### Layers');
    expect(md).toContain('**Links:** Implements [Shop v1](#product-definitions-shop-v1)');
    expect(md).toContain('## Relations');
    expect(md.indexOf('Shop v1](#')).toBeGreaterThan(md.indexOf('## Contents'));
  });
});
