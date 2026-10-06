import { createDefaultPyramidConfig } from '@shared/pyramid/config';
import type { CellRecord } from '@shared/pyramid/types';
import { ARCHITECTURE_TEMPLATES, normalizeTechnicalArchitecture } from '@shared/specs/technicalArchitecture';
import { createDefaultDesignSystem } from '@shared/specs/designSystem';
import { normalizeDecision } from '@shared/specs/decision';
import { normalizeGlossary } from '@shared/specs/glossary';
import { normalizeProductSpec } from '@shared/specs/productSpec';
import { normalizeResearch } from '@shared/specs/research';
import { normalizeRoadmap } from '@shared/specs/roadmap';
import { normalizeTechnicalPlan } from '@shared/specs/technicalPlan';
import { createDefaultUiUxArchitecture } from '@shared/uiUxArchitecture';
import { KNOWLEDGE_APP_KEYS, type KnowledgeApp } from '@shared/knowledge/types';
import { fake } from './fakeConvex';

const NOW = Date.UTC(2026, 0, 15);
const base = (id: string) => ({ _id: id, _creationTime: NOW, updatedAt: NOW });
const inWorkspace = (id: string, title: string) => ({ ...base(id), workspaceId: 'ws1', title });

const pyramidConfig = {
  ...createDefaultPyramidConfig({ question: 'Why is churn rising?', panel: [{ model: 'a/one' }], host: { model: 'c/host' } }),
  boardSize: 2,
};
const run = { currentRow: 0, spent: '0', rowResults: [] as { row: number; failedPanelists: string[]; committedAt: number }[] };

const hostCell = (label: string): CellRecord => ({
  label,
  row: 1,
  edited: false,
  originalNextQuestion: null,
  cell: {
    label,
    combinedQuestion: null,
    conclusion: `Conclusion ${label}`,
    dissent: [],
    confidence: 0.8,
    nextQuestion: `Next question from ${label}?`,
    summary: `Summary ${label}`,
    primaryParent: null,
  },
});


export const data = {
  user: { _id: 'u1', email: 'ada@example.com', name: null },
  workspaces: [{ ...base('ws1'), ownerId: 'u1', name: 'Acme' }, { ...base('ws2'), ownerId: 'u1', name: 'Side Project' }],
  pyramids: [
    // At the checkpoint after row 1 of a 2×2 board.
    {
      ...inWorkspace('p1', 'Churn Analysis'),
      config: pyramidConfig,
      ...run,
      status: 'awaiting_approval',
      currentRow: 1,
      spent: '0.002',
      budgetCap: '0.05',
      rowResults: [{ row: 1, failedPanelists: [], committedAt: NOW }],
    },
    { ...inWorkspace('p2', 'Pricing'), config: { ...pyramidConfig, question: 'How should we price the Pro plan?' }, ...run, status: 'draft' },
  ],
  pyramidCells: { p1: [hostCell('A2'), hostCell('B1')] } as Record<string, CellRecord[]>,
  productDefinitions: [
    {
      ...inWorkspace('pd1', 'Mobile Redesign'),
      spec: normalizeProductSpec({
        vision: 'A workbench for structured thinking',
        personas: [{ id: 'p1', name: 'Team lead', goals: ['Decide faster'] }],
        features: [{ id: 'f1', name: 'Offline mode', priority: 'must', personaIds: ['p1'] }],
      }),
    },
  ],
  directories: [{ ...inWorkspace('dir1', 'Research') }],
  contextDocuments: [
    { ...inWorkspace('doc1', 'Market Notes'), type: 'text', content: 'Competitors lowered prices', directoryId: 'dir1' },
    { ...inWorkspace('doc2', 'Glossary'), type: 'text', content: '', directoryId: undefined as string | undefined },
  ],
  diagrams: [
    {
      ...inWorkspace('dg1', 'Signup Flow'),
      nodes: [{ id: 'n1', type: 'diagramNode', position: { x: 0, y: 0 }, data: { title: 'Landing', description: '' } }],
      edges: [],
    },
  ],
  technicalArchitectures: [
    { ...inWorkspace('ta1', 'Platform Backend'), spec: normalizeTechnicalArchitecture(ARCHITECTURE_TEMPLATES.find((t) => t.id === 'web-app')!.spec) },
    { ...inWorkspace('ta2', 'Blank'), spec: normalizeTechnicalArchitecture({}) },
  ],
  uiUxArchitectures: [{ ...inWorkspace('ux1', 'Customer Portal'), ...createDefaultUiUxArchitecture() }],
  contextPacks: [{ ...inWorkspace('cp1', 'Signup context'), refs: [{ app: 'diagrams', id: 'dg1' }], linkDepth: 1 }],
  designSystems: [{ ...inWorkspace('ds1', 'Acme UI'), spec: createDefaultDesignSystem() }],
  technicalPlans: [
    {
      ...inWorkspace('tp1', 'Checkout v2'),
      spec: normalizeTechnicalPlan({ status: 'in_progress', goal: 'One-click checkout', phases: [{ id: 'ph1', title: 'API', steps: [{ id: 's1', text: 'Add endpoint', done: true }, { id: 's2', text: 'Add tests' }] }] }),
    },
  ],
  decisions: [{ ...inWorkspace('dc1', 'Use Convex'), spec: normalizeDecision({ status: 'accepted', date: '2026-01-15', decision: 'Convex is the only backend' }) }],
  glossaries: [{ ...inWorkspace('gl1', 'Domain terms'), spec: normalizeGlossary({ terms: [{ id: 't1', term: 'Workspace', definition: 'A container' }, { id: 't2', term: 'Pyramid', definition: 'A roundtable run' }] }) }],
  researchStudies: [{ ...inWorkspace('rs1', 'Onboarding interviews'), spec: normalizeResearch({ goal: 'Why do teams churn?', insights: [{ id: 'i1', statement: 'Setup is too slow' }] }) }],
  roadmaps: [{ ...inWorkspace('rm1', '2027'), spec: normalizeRoadmap({ initiatives: [{ id: 'in1', title: 'Pricing page', horizon: 'now' }, { id: 'in2', title: 'Partner API', horizon: 'later' }] }) }],
  technicalTasks: [] as { _id: string; title: string; updatedAt: number; workspaceId: string }[],
};

type Table = Exclude<keyof typeof data, 'user' | 'workspaces' | 'pyramidCells'>;

/** Wires every query the app uses to the fixture data above. */
export function installFixtures() {
  const list = (table: Table) => (args: Record<string, unknown>) =>
    (data[table] as { workspaceId: string }[]).filter((d) => d.workspaceId === args.workspaceId);
  const get = (table: Table) => (args: Record<string, unknown>) =>
    (data[table] as { _id: string }[]).find((d) => d._id === args.id) ?? null;

  fake.queries = {
    'users:viewer': () => data.user,
    'workspaces:list': () => data.workspaces,
    'workspaces:get': (args) => data.workspaces.find((w) => w._id === args.id) ?? null,
    'workspaces:exportData': () => ({ format: 'context-platform/workspace' }),
    'contextDocuments:listInDirectory': (args) => data.contextDocuments.filter((d) => d.directoryId === args.directoryId),
    'pyramids:cells': (args) => data.pyramidCells[args.id as string] ?? [],
    'pyramids:rowSummary': () => ({ cost: '0.002', calls: 2, failedPanelists: [] }),
    'pyramids:report': () => '# report',
    'pyramids:details': () => ({
      models: [
        { model: 'a/one', calls: 1, promptTokens: 900, completionTokens: 300, cost: '0.001' },
        { model: 'c/host', calls: 1, promptTokens: 1200, completionTokens: 500, cost: '0.001' },
      ],
      roles: { panel: { calls: 1, cost: '0.001' }, host: { calls: 1, cost: '0.001' } },
      totalCalls: 2,
      failedCalls: 0,
      totalCost: '0.002',
      startedAt: NOW,
      endedAt: NOW + 42_000,
      contextSources: [],
    }),
    'pyramids:contextSummary': () => ({ sources: [], totalChars: 0 }),
    'pyramidFiles:list': () => [],
    'pyramids:discussion': (args) => [
      {
        _id: 'call1',
        role: 'panel',
        panelist: 'Skeptic',
        model: 'a/one',
        status: 'ok',
        attempt: 1,
        cost: '0.001',
        promptTokens: 900,
        completionTokens: 300,
        startedAt: NOW,
        endedAt: NOW + 2000,
        statement: { combinedQuestion: null, answer: `Skeptic says ${args.label}`, conclusion: null, nextQuestion: 'n?', dissent: [], confidence: null, primaryParent: null },
        output: '{}',
      },
      {
        _id: 'call2',
        role: 'host',
        panelist: null,
        model: 'c/host',
        status: 'ok',
        attempt: 1,
        cost: '0.001',
        promptTokens: 1200,
        completionTokens: 500,
        startedAt: NOW + 2000,
        endedAt: NOW + 5000,
        statement: { combinedQuestion: null, answer: null, conclusion: `Host concludes ${args.label}`, nextQuestion: 'n?', dissent: [], confidence: 0.8, primaryParent: null },
        output: '{}',
      },
    ],
    'aiSettings:get': () => ({ keySource: 'none', keyHint: null, defaultModel: null, defaultPanel: null, defaultHost: null }),
    'pyramidPresets:list': () => [],
    'knowledge:catalog': () =>
      KNOWLEDGE_APP_KEYS.flatMap((app) =>
        (data[app] as { _id: string; title: string; updatedAt: number }[]).map((d) => ({ app, id: d._id, title: d.title, updatedAt: d.updatedAt })),
      ),
    'knowledge:collect': (args) => ({
      workspaceName: 'Acme',
      items: (args.refs as { app: KnowledgeApp; id: string }[]).map((ref) => ({
        ref,
        title: (data[ref.app] as { _id: string; title: string }[]).find((d) => d._id === ref.id)?.title ?? '?',
        updatedAt: NOW,
        meta: {},
        markdown: `# item ${ref.id}\n`,
      })),
      edges: [],
    }),
    'technicalPlans:legacyTaskCount': () => 0,
    'knowledge:graph': () => ({
      nodes: [
        { app: 'diagrams', id: 'dg1', title: 'Signup Flow' },
        { app: 'productDefinitions', id: 'pd1', title: 'Mobile Redesign' },
        { app: 'technicalPlans', id: 'tp1', title: 'Checkout v2' },
      ],
      edges: [{ from: 'technicalPlans:tp1', to: 'productDefinitions:pd1', kind: 'implements', source: 'explicit' }],
    }),
    'links:listForItem': () => ({
      outgoing: [{ app: 'productDefinitions', id: 'pd1', title: 'Mobile Redesign', kind: 'implements', source: 'explicit', linkId: 'l1' }],
      incoming: [],
    }),
  };
  for (const table of [
    'pyramids',
    'productDefinitions',
    'directories',
    'contextDocuments',
    'diagrams',
    'technicalArchitectures',
    'uiUxArchitectures',
    'contextPacks',
    'designSystems',
    'technicalPlans',
    'decisions',
    'glossaries',
    'researchStudies',
    'roadmaps',
  ] as Table[]) {
    fake.queries[`${table}:list`] = list(table);
    fake.queries[`${table}:get`] = get(table);
  }
}
