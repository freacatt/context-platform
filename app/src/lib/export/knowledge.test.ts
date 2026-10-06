import { describe, expect, it } from 'vitest';
import { KNOWLEDGE_APPS } from '@shared/knowledge/registry';
import { WORKSPACE_APPS } from '@/features/workspaces/apps';
import { buildKnowledgeOutput, formatSize } from './knowledge';

describe('knowledge export', () => {
  it('registers exactly the workspace apps (plus legacy ones), in dashboard order', () => {
    expect(KNOWLEDGE_APPS.filter((a) => !a.legacy).map((a) => a.key)).toEqual(WORKSPACE_APPS.map((a) => a.key));
  });

  const bundle = {
    workspaceName: 'Acme Co',
    exportedAt: '2026-01-02T00:00:00.000Z',
    items: [{ ref: { app: 'diagrams' as const, id: 'd' }, title: 'Flow', updatedAt: 0, meta: {}, markdown: '# Flow\n' }],
    edges: [],
  };

  it('names and sizes both formats', () => {
    const zip = buildKnowledgeOutput(bundle, 'zip');
    expect(zip.filename).toBe('acme_co_knowledge.zip');
    expect(Object.keys(zip.files).sort()).toEqual(['INDEX.md', 'diagrams/flow.md', 'graph.json']);
    const single = buildKnowledgeOutput(bundle, 'single');
    expect(single.filename).toBe('acme_co_knowledge.md');
    expect(single.tokens).toBe(Math.ceil(single.chars / 4));
  });

  it('formats sizes', () => {
    expect(formatSize(999)).toBe('999 B');
    expect(formatSize(12_345)).toBe('12.3 kB');
    expect(formatSize(2_500_000)).toBe('2.5 MB');
  });
});
