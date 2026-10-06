import { describe, expect, it } from 'vitest';
import { parseWorkspaceImport } from './workspaceTransfer';

/** Shape of a file exported by the previous, Firestore-based version of the app. */
const legacyExport = {
  meta: { exportedAt: '2025-01-01', userId: 'u1', user: { displayName: 'Pouria', email: 'p@x.com' } },
  pyramids: [
    {
      id: 'p1',
      userId: 'u1',
      title: 'Pyr',
      context: 'Ctx',
      status: 'in_progress',
      contextSources: [{ id: 'd1', type: 'contextDocument' }],
      blocks: { '0-0': { id: '0-0', u: 0, v: 0, type: 'question', content: 'Q', parentIds: [], childIds: ['1-0'], isAI: true } },
    },
  ],
  productDefinitions: [{ id: 'pd1', title: 'PD', data: { root: { id: 'root', label: 'Root', contextSources: [] } } }],
  contextDocuments: [{ id: 'd1', title: 'Doc', type: 'text', content: 'Hello', directoryId: 'dir1', notionId: '' }],
  directories: [{ id: 'dir1', title: 'Dir' }],
  diagrams: [{ id: 'g1', title: 'G', nodes: [{ id: 'n', data: { title: 'T', contextSources: [{ id: 'x' }] } }], edges: [] }],
  technicalArchitectures: [{ id: 'a1', title: 'Arch', system_architecture: { main: { architecture_type: 'MVC' } } }],
  uiUxArchitectures: [{ id: 'ux1', title: 'UX', pages: [{ page_id: 'home' }] }],
  technicalTasks: {
    pipelines: [{ id: 'pl1', title: 'Backlog', order: 0 }],
    tasks: [{ id: 't1', title: 'Task', type: 'FIX_TASK', pipelineId: 'pl1', technicalArchitectureId: 'a1', order: 2, data: {} }],
  },
};

describe('parseWorkspaceImport', () => {
  it('reads legacy exports and keeps source ids for re-linking', () => {
    const parsed = parseWorkspaceImport(legacyExport, 'Fallback');
    expect(parsed.name).toBe('Imported: Pouria');
    expect(parsed.contextDocuments[0]).toMatchObject({ sourceId: 'd1', directorySourceId: 'dir1', content: 'Hello' });
    // Legacy tasks become technical plans.
    expect(parsed.technicalTasks[0]).toMatchObject({ sourceId: 't1', title: 'Task', architectureSourceId: 'a1', order: 2, spec: { status: 'draft' } });
  });

  it('drops fields the current schema does not have', () => {
    const parsed = parseWorkspaceImport(legacyExport, 'Fallback');
    expect(parsed.pyramids[0]).not.toHaveProperty('contextSources');
    expect(parsed.productDefinitions[0].spec).not.toHaveProperty('contextSources');
    expect((parsed.diagrams[0].nodes[0] as { data: object }).data).toEqual({ title: 'T' });
  });

  it('reads previous-version architectures as specs', () => {
    const [arch] = parseWorkspaceImport(legacyExport, 'Fallback').technicalArchitectures;
    expect(arch.spec).toMatchObject({ style: 'layered', context: 'Architecture type: MVC', components: [] });
    const [ux] = parseWorkspaceImport(legacyExport, 'Fallback').uiUxArchitectures;
    expect(ux.sections.pages).toEqual([{ page_id: 'home' }]);
    expect(ux.sections.base_components).toBeUndefined();
  });

  it('uses the fallback name and empty collections for a bare object', () => {
    const parsed = parseWorkspaceImport({}, 'Fallback');
    expect(parsed.name).toBe('Fallback');
    expect(parsed.pyramids).toEqual([]);
    expect(parsed.technicalTasks).toEqual([]);
  });

  it('gives untitled records a readable title; a legacy block pyramid becomes a draft of its root question', () => {
    const parsed = parseWorkspaceImport({ pyramids: [{ title: '  ' }] }, 'F');
    expect(parsed.pyramids[0].title).toBe('Untitled pyramid');
    expect(parsed.pyramids[0]).toMatchObject({ status: 'draft', currentRow: 0, config: { question: 'Untitled pyramid' } });
    const legacy = parseWorkspaceImport(legacyExport, 'F').pyramids[0];
    expect(legacy.status).toBe('draft');
    expect(legacy.config.question).toBe('Ctx'); // no root question in the grid: the problem statement
  });

  it('reads current pyramids with their cells; a run caught mid-row can be resumed', () => {
    const parsed = parseWorkspaceImport(
      {
        pyramids: [
          {
            id: 'p1',
            title: 'Run',
            status: 'running',
            currentRow: 1,
            spent: '0.01',
            budgetCap: '1',
            rowResults: [{ row: 1, failedPanelists: [], committedAt: 5 }],
            config: { question: 'Which market next?', context: '', contextDocumentIds: ['d1'], boardSize: 3, panel: [{ model: 'a/b', bogus: 1 }], host: { model: 'c/d' }, minPanelists: 4 },
          },
        ],
        pyramidCells: [
          { pyramidId: 'p1', label: 'A2', row: 1, cell: { conclusion: 'c', confidence: 2, dissent: ['x', 3], nextQuestion: 'n?', summary: 's' } },
          { pyramidId: 'p1', label: 'not a label', row: 1, cell: {} },
        ],
      },
      'F',
    );
    expect(parsed.pyramids[0]).toMatchObject({ status: 'failed', currentRow: 1, spent: '0.01', budgetCap: '1', contextSourceRefs: [{ kind: 'item', app: 'contextDocuments', sourceId: 'd1' }] });
    expect(parsed.pyramids[0].config.panel).toEqual([{ model: 'a/b' }]);
    expect(parsed.pyramids[0].config.minPanelists).toBe(1);
    expect(parsed.pyramidCells).toHaveLength(1);
    expect(parsed.pyramidCells[0].cell).toMatchObject({ label: 'A2', confidence: 1, dissent: ['x'], primaryParent: null });
  });

  it('rejects non-objects', () => {
    expect(() => parseWorkspaceImport([1, 2], 'F')).toThrow('Not a workspace export');
    expect(() => parseWorkspaceImport(null, 'F')).toThrow('Not a workspace export');
  });
});
