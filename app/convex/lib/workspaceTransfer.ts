/**
 * Workspace JSON backup format, shared by export and import.
 *
 * The top-level keys match the export of the previous (Firestore) version of the
 * app, so those files can still be imported. Every record carries its original
 * `id` so references between records (directory, pipeline, architecture) can be
 * re-linked to the newly created documents on import.
 */
import type { ProductDefinitionNode } from '../../shared/types/productDefinition';
import { TECHNICAL_ARCHITECTURE_SECTIONS } from '../../shared/types/technicalArchitecture';
import { createDefaultUiUxArchitecture } from '../../shared/uiUxArchitecture';
import { createDefaultPyramidConfig } from '../../shared/pyramid/config';
import { coordOf, MAX_BOARD_SIZE, MIN_BOARD_SIZE } from '../../shared/pyramid/board';
import type { HostCell, PanelistConfig, PyramidConfig, PyramidStatus } from '../../shared/pyramid/types';
import { isKnowledgeApp, LINK_KINDS, type KnowledgeApp, type LinkKind } from '../../shared/knowledge/types';
import { normalizeDecision } from '../../shared/specs/decision';
import { normalizeDesignSystem } from '../../shared/specs/designSystem';
import { normalizeGlossary } from '../../shared/specs/glossary';
import { normalizeProductSpec, productSpecFromLegacy, type ProductSpec } from '../../shared/specs/productSpec';
import { normalizeResearch } from '../../shared/specs/research';
import { normalizeRoadmap } from '../../shared/specs/roadmap';
import { normalizeTechnicalPlan, technicalPlanFromLegacyTask, type TechnicalPlanSpec } from '../../shared/specs/technicalPlan';
import { technicalArchitectureSpecOf, type TechnicalArchitectureSpec } from '../../shared/specs/technicalArchitecture';

/** The `{ title, spec }` tables and how a backup's spec is normalized. */
export const SPEC_IMPORTS = {
  designSystems: { normalize: normalizeDesignSystem, fallbackTitle: 'Untitled design system' },
  technicalPlans: { normalize: normalizeTechnicalPlan, fallbackTitle: 'Untitled plan' },
  decisions: { normalize: normalizeDecision, fallbackTitle: 'Untitled decision' },
  glossaries: { normalize: normalizeGlossary, fallbackTitle: 'Untitled glossary' },
  researchStudies: { normalize: normalizeResearch, fallbackTitle: 'Untitled research' },
  roadmaps: { normalize: normalizeRoadmap, fallbackTitle: 'Untitled roadmap' },
} as const;
export type SpecTableName = keyof typeof SPEC_IMPORTS;

export const EXPORT_FORMAT = 'context-platform/workspace';
export const EXPORT_VERSION = 4;

type Json = Record<string, unknown>;

export interface ImportedRecord {
  /** Id in the source file; used only to re-link references. */
  sourceId?: string;
  title: string;
}

export interface WorkspaceImport {
  name: string;
  directories: ImportedRecord[];
  contextDocuments: (ImportedRecord & { type: string; content: string; directorySourceId?: string })[];
  pyramids: (ImportedRecord & ImportedPyramid)[];
  pyramidCells: ImportedPyramidCell[];
  pyramidFiles: ImportedPyramidFile[];
  productDefinitions: (ImportedRecord & { spec: ProductSpec })[];
  diagrams: (ImportedRecord & { nodes: unknown[]; edges: unknown[] })[];
  technicalArchitectures: (ImportedRecord & { spec: TechnicalArchitectureSpec })[];
  uiUxArchitectures: (ImportedRecord & { sections: Json; designSystemSourceId?: string })[];
  /** Documents of the `{ title, spec }` apps, specs normalized. */
  specDocs: Record<SpecTableName, (ImportedRecord & { spec: unknown })[]>;
  /** Legacy Technical Tasks: imported as technical plans. */
  technicalTasks: (ImportedRecord & {
    architectureSourceId?: string;
    order: number;
    spec: TechnicalPlanSpec;
  })[];
  links: ImportedLink[];
  contextPacks: (ImportedRecord & { refs: ImportedRef[]; linkDepth: number })[];
}

/** An item reference by its id in the source file; re-linked on import. */
export interface ImportedRef {
  app: KnowledgeApp;
  sourceId: string;
}

export interface ImportedLink {
  from: ImportedRef;
  to: ImportedRef;
  kind: LinkKind;
}

/** A context source by its id in the source file; re-linked on import. */
export type ImportedContextRef =
  | { kind: 'item'; app: KnowledgeApp; sourceId: string }
  | { kind: 'pack'; sourceId: string }
  | { kind: 'file'; sourceId: string };

/** A pyramid's run state; `contextSourceRefs` are re-linked on import. */
export interface ImportedPyramid {
  config: Omit<PyramidConfig, 'contextDocumentIds' | 'contextRefs'>;
  contextSourceRefs: ImportedContextRef[];
  status: PyramidStatus;
  currentRow: number;
  budgetCap?: string;
  spent: string;
  brief?: string;
  error?: string;
  rowResults: { row: number; failedPanelists: string[]; committedAt: number }[];
}

export interface ImportedPyramidFile {
  sourceId?: string;
  pyramidSourceId: string;
  title: string;
  content: string;
}

export interface ImportedPyramidCell {
  pyramidSourceId: string;
  label: string;
  row: number;
  cell: HostCell;
  originalNextQuestion?: string | null;
}

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asArray = (value: unknown): Json[] => (Array.isArray(value) ? value.filter(isObject) : []);

const str = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const optStr = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

const num = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const strArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : [];

const base = (raw: Json, fallbackTitle: string): ImportedRecord => ({
  sourceId: optStr(raw.id),
  title: str(raw.title).trim() || fallbackTitle,
});

const STATUSES: PyramidStatus[] = ['draft', 'estimated', 'running', 'awaiting_approval', 'paused_budget', 'completed', 'failed', 'cancelled'];
const DECIMAL_RE = /^\d+(\.\d+)?$/;
const decimal = (value: unknown, fallback: string) => (typeof value === 'string' && DECIMAL_RE.test(value) ? value : fallback);
const optNum = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);

const panelist = (raw: Json): PanelistConfig => ({
  model: str(raw.model),
  ...(optStr(raw.name) && { name: str(raw.name) }),
  ...(optStr(raw.systemPrompt) && { systemPrompt: str(raw.systemPrompt) }),
  ...((raw.promptMode === 'append' || raw.promptMode === 'replace') && { promptMode: raw.promptMode }),
  ...(optNum(raw.temperature) !== undefined && { temperature: optNum(raw.temperature) }),
  ...(optNum(raw.maxTokens) !== undefined && { maxTokens: optNum(raw.maxTokens) }),
});

/**
 * A pyramid from a backup. Older backups stored a hand-filled block grid; those become
 * drafts asking the grid's root question (or the problem statement).
 */
export const normalizePyramid = (raw: Json, title: string): ImportedPyramid => {
  if (!isObject(raw.config)) {
    const blocks = isObject(raw.blocks) ? raw.blocks : {};
    const root = isObject(blocks['0-0']) ? blocks['0-0'] : {};
    const question = optStr(root.question) ?? optStr(raw.context) ?? title;
    const { contextDocumentIds: _none, contextRefs: _refs, ...config } = createDefaultPyramidConfig({ question });
    // The old problem statement becomes context when the grid had its own root question.
    const context = optStr(root.question) && optStr(raw.context) ? str(raw.context) : '';
    return { config: { ...config, context }, contextSourceRefs: [], status: 'draft', currentRow: 0, spent: '0', rowResults: [] };
  }
  const c = raw.config;
  const defaults = createDefaultPyramidConfig();
  const panel = asArray(c.panel).map(panelist).slice(0, 6);
  const host = isObject(c.host) ? c.host : {};
  const boardSize = num(c.boardSize, defaults.boardSize);
  const config: ImportedPyramid['config'] = {
    question: str(c.question),
    context: str(c.context),
    boardSize: Number.isInteger(boardSize) && boardSize >= MIN_BOARD_SIZE && boardSize <= MAX_BOARD_SIZE ? boardSize : defaults.boardSize,
    panel: panel.length ? panel : defaults.panel,
    host: {
      model: str(host.model),
      ...(optStr(host.systemPrompt) && { systemPrompt: str(host.systemPrompt) }),
      ...(optNum(host.temperature) !== undefined && { temperature: optNum(host.temperature) }),
      ...(optNum(host.maxTokens) !== undefined && { maxTokens: optNum(host.maxTokens) }),
    },
    critiqueRound: c.critiqueRound === true,
    autoApprove: c.autoApprove === true,
    minPanelists: Math.max(1, Math.min(num(c.minPanelists, 1), Math.max(panel.length, 1))),
    ...(optStr(c.defaultSystemPrompt) && { defaultSystemPrompt: str(c.defaultSystemPrompt) }),
    contextLinkDepth: Math.max(-1, Math.floor(num(c.contextLinkDepth, 0))),
  };
  let status = STATUSES.includes(raw.status as PyramidStatus) ? (raw.status as PyramidStatus) : 'draft';
  // Nothing executes an imported run; a run caught mid-row can be resumed.
  if (status === 'running') status = 'failed';
  return {
    config,
    contextSourceRefs: [
      ...strArray(c.contextDocumentIds).map((sourceId): ImportedContextRef => ({ kind: 'item', app: 'contextDocuments', sourceId })),
      ...asArray(c.contextRefs).flatMap((r): ImportedContextRef[] => {
        if (r.kind === 'item') {
          const ref = importedRef(r.app, r.id);
          return ref ? [{ kind: 'item', ...ref }] : [];
        }
        return (r.kind === 'pack' || r.kind === 'file') && optStr(r.id) ? [{ kind: r.kind, sourceId: str(r.id) }] : [];
      }),
    ],
    status,
    currentRow: Math.max(0, Math.floor(num(raw.currentRow, 0))),
    budgetCap: typeof raw.budgetCap === 'string' && DECIMAL_RE.test(raw.budgetCap) ? raw.budgetCap : undefined,
    spent: decimal(raw.spent, '0'),
    brief: optStr(raw.brief),
    error: status === 'failed' && raw.status === 'running' ? 'Imported while running; resume to continue.' : optStr(raw.error),
    rowResults: asArray(raw.rowResults).map((r) => ({
      row: num(r.row, 0),
      failedPanelists: strArray(r.failedPanelists),
      committedAt: num(r.committedAt, 0),
    })),
  };
};

const nullableStr = (value: unknown) => (typeof value === 'string' ? value : null);

const normalizeCell = (raw: Json): ImportedPyramidCell | null => {
  const cell = isObject(raw.cell) ? raw.cell : null;
  const label = str(raw.label);
  if (!cell || !optStr(raw.pyramidId) || !coordOf(MAX_BOARD_SIZE, label)) return null;
  const confidence = num(cell.confidence, 0);
  return {
    pyramidSourceId: str(raw.pyramidId),
    label,
    row: num(raw.row, 0),
    cell: {
      label,
      combinedQuestion: nullableStr(cell.combinedQuestion),
      conclusion: str(cell.conclusion),
      dissent: strArray(cell.dissent),
      confidence: Math.min(1, Math.max(0, confidence)),
      nextQuestion: nullableStr(cell.nextQuestion),
      summary: str(cell.summary),
      primaryParent: nullableStr(cell.primaryParent),
    },
    ...(raw.originalNextQuestion !== undefined && { originalNextQuestion: nullableStr(raw.originalNextQuestion) }),
  };
};

/** Keeps only the fields a product definition node may have (drops `contextSources`). */
const normalizeNodes = (raw: unknown): Record<string, ProductDefinitionNode> => {
  const nodes: Record<string, ProductDefinitionNode> = {};
  if (!isObject(raw)) return nodes;
  for (const [key, value] of Object.entries(raw)) {
    if (!isObject(value)) continue;
    nodes[key] = {
      id: str(value.id, key),
      label: str(value.label, key),
      ...(optStr(value.type) !== undefined && { type: str(value.type) }),
      ...(typeof value.description === 'string' && { description: value.description }),
      ...(typeof value.question === 'string' && { question: value.question }),
      ...(optStr(value.parent) !== undefined && { parent: str(value.parent) }),
      ...(Array.isArray(value.children) && { children: strArray(value.children) }),
    };
  }
  return nodes;
};

/** Removes the AI-era `contextSources` attachment from diagram node data. */
const normalizeDiagramNodes = (raw: unknown): unknown[] =>
  (Array.isArray(raw) ? raw : []).map((node) => {
    if (!isObject(node) || !isObject(node.data)) return node;
    const { contextSources: _dropped, ...data } = node.data;
    return { ...node, data };
  });

const importedRef = (app: unknown, id: unknown): ImportedRef | null =>
  typeof app === 'string' && isKnowledgeApp(app) && optStr(id) ? { app, sourceId: str(id) } : null;

const normalizeLink = (raw: Json): ImportedLink | null => {
  const from = importedRef(raw.fromApp, raw.fromId);
  const to = importedRef(raw.toApp, raw.toId);
  const kind = LINK_KINDS.find((k) => k === raw.kind);
  return from && to && kind ? { from, to, kind } : null;
};

const pickSections = (raw: Json, sections: readonly string[], defaults: Json): Json =>
  Object.fromEntries(sections.map((s) => [s, raw[s] !== undefined ? raw[s] : defaults[s]]));

const UI_UX_SECTIONS = [
  'ui_ux_architecture_metadata',
  'theme_specification',
  'base_components',
  'pages',
  'ux_patterns',
] as const;

/**
 * Validates and normalizes an uploaded backup. Unknown fields are dropped and
 * missing ones get defaults, so the result always fits the database schema.
 */
export function parseWorkspaceImport(json: unknown, fallbackName: string): WorkspaceImport {
  if (!isObject(json)) throw new Error('Not a workspace export: expected a JSON object');

  const meta = isObject(json.meta) ? json.meta : {};
  const workspaceMeta = isObject(json.workspace) ? json.workspace : {};
  const legacyUser = isObject(meta.user) ? meta.user : {};
  const name =
    optStr(workspaceMeta.name) ??
    (optStr(legacyUser.displayName) ? `Imported: ${str(legacyUser.displayName)}` : fallbackName);

  const tasksBlock = isObject(json.technicalTasks) ? json.technicalTasks : {};
  const uiUxDefaults = createDefaultUiUxArchitecture() as unknown as Json;

  return {
    name,
    directories: asArray(json.directories).map((d) => base(d, 'Untitled directory')),
    contextDocuments: asArray(json.contextDocuments).map((d) => ({
      ...base(d, 'Untitled document'),
      type: str(d.type, 'text'),
      content: str(d.content),
      directorySourceId: optStr(d.directoryId),
    })),
    pyramids: asArray(json.pyramids).map((p) => {
      const record = base(p, 'Untitled pyramid');
      return { ...record, ...normalizePyramid(p, record.title) };
    }),
    pyramidCells: asArray(json.pyramidCells).flatMap((c) => normalizeCell(c) ?? []),
    pyramidFiles: asArray(json.pyramidFiles).flatMap((f) =>
      optStr(f.pyramidId)
        ? [{ sourceId: optStr(f.id), pyramidSourceId: str(f.pyramidId), title: str(f.title).trim() || 'file.md', content: str(f.content) }]
        : [],
    ),
    productDefinitions: asArray(json.productDefinitions).map((p) => ({
      ...base(p, 'Untitled product definition'),
      spec: p.spec !== undefined ? normalizeProductSpec(p.spec) : productSpecFromLegacy(normalizeNodes(p.data)),
    })),
    diagrams: asArray(json.diagrams).map((d) => ({
      ...base(d, 'Untitled diagram'),
      nodes: normalizeDiagramNodes(d.nodes),
      edges: Array.isArray(d.edges) ? d.edges : [],
    })),
    technicalArchitectures: asArray(json.technicalArchitectures).map((a) => ({
      ...base(a, 'Untitled architecture'),
      spec: technicalArchitectureSpecOf(a.spec !== undefined ? { spec: a.spec } : pickSections(a, TECHNICAL_ARCHITECTURE_SECTIONS, {})),
    })),
    uiUxArchitectures: asArray(json.uiUxArchitectures).map((a) => ({
      ...base(a, 'Untitled UI/UX architecture'),
      sections: pickSections(a, UI_UX_SECTIONS, uiUxDefaults),
      designSystemSourceId: optStr(a.designSystemId),
    })),
    specDocs: Object.fromEntries(
      Object.entries(SPEC_IMPORTS).map(([table, { normalize, fallbackTitle }]) => [
        table,
        asArray(json[table]).map((d) => ({ ...base(d, fallbackTitle), spec: normalize(d.spec) })),
      ]),
    ) as WorkspaceImport['specDocs'],
    technicalTasks: asArray(tasksBlock.tasks).map((t, i) => ({
      ...base(t, 'Untitled task'),
      architectureSourceId: optStr(t.technicalArchitectureId),
      order: num(t.order, i),
      spec: technicalPlanFromLegacyTask(t.data),
    })),
    links: asArray(json.links).flatMap((l) => normalizeLink(l) ?? []),
    contextPacks: asArray(json.contextPacks).map((p) => ({
      ...base(p, 'Untitled pack'),
      refs: asArray(p.refs).flatMap((r) => importedRef(r.app, r.id) ?? []),
      linkDepth: Math.max(-1, Math.floor(num(p.linkDepth, 0))),
    })),
  };
}
