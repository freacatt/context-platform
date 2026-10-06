/**
 * Every workspace item as a knowledge item. Inputs are structural so both Convex documents
 * and the UI's entity types satisfy them; `shared/` never imports Convex types.
 */
import { coord, finalLabel, kind, rowLabels, workingRows } from '../pyramid/board';
import { cellQuestion, reportCriticalPath } from '../pyramid/report';
import { contextRefsOf } from '../pyramid/config';
import type { ContextRef, HostCell, PyramidStatus } from '../pyramid/types';
import { extractPlainText } from '../richText';
import { decisionToMarkdown, normalizeDecision } from '../specs/decision';
import { designSystemToMarkdown, normalizeDesignSystem } from '../specs/designSystem';
import { glossaryToMarkdown, normalizeGlossary } from '../specs/glossary';
import { normalizeProductSpec, productSpecFromLegacy, productSpecToMarkdown } from '../specs/productSpec';
import { normalizeResearch, researchToMarkdown } from '../specs/research';
import { normalizeRoadmap, roadmapToMarkdown } from '../specs/roadmap';
import { normalizeTechnicalPlan, PLAN_STATUS_LABELS, technicalPlanToMarkdown } from '../specs/technicalPlan';
import { ARCHITECTURE_STYLES, technicalArchitectureSpecOf, technicalArchitectureToMarkdown } from '../specs/technicalArchitecture';
import type { ProductDefinitionData } from '../types/productDefinition';
import type { TechnicalTaskData } from '../types/technicalTask';
import { diagramToMarkdown, type GraphEdge, type GraphNode } from './markdown/diagram';
import { technicalTaskToMarkdown } from './markdown/technicalTask';
import { uiUxArchitectureToMarkdown, type UiUxArchitectureInput } from './markdown/uiUxArchitecture';
import type { KnowledgeApp, KnowledgeEdge, KnowledgeItem } from './types';

interface Base {
  _id: string;
  title: string;
  updatedAt: number;
}

export interface PyramidSource extends Base {
  status: PyramidStatus;
  currentRow: number;
  config: { question: string; context: string; contextDocumentIds: string[]; contextRefs?: ContextRef[]; boardSize: number };
  /** Concluded cells by label. */
  cells: Record<string, HostCell>;
}

export interface ProductDefinitionSource extends Base {
  spec?: unknown;
  /** Previous mind-map version, used until `spec` exists. */
  data?: ProductDefinitionData;
}

/** A document of an app stored as `{ title, spec }`. */
export interface SpecSource extends Base {
  spec: unknown;
}

export const SPEC_APPS = ['designSystems', 'technicalPlans', 'decisions', 'glossaries', 'researchStudies', 'roadmaps'] as const;
export type SpecApp = (typeof SPEC_APPS)[number];

/** The product spec of a product definition document, from the previous version when needed. */
export const productSpecOf = (doc: Pick<ProductDefinitionSource, 'spec' | 'data'>) =>
  doc.spec !== undefined ? normalizeProductSpec(doc.spec) : productSpecFromLegacy(doc.data ?? {});

export interface ContextDocumentSource extends Base {
  type: string;
  content: string;
  /** Title of the document's directory, if any. */
  folder?: string;
}

export interface DiagramSource extends Base {
  nodes: unknown[];
  edges: unknown[];
}

/** `spec`, or the previous version's sections. */
export type TechnicalArchitectureSource = Base & { spec?: unknown } & Record<string, unknown>;
export type UiUxArchitectureSource = Base & UiUxArchitectureInput & { designSystemId?: string };

export interface TechnicalTaskSource extends Base {
  type: string;
  data: TechnicalTaskData;
  technicalArchitectureId?: string;
  /** Title of the task's pipeline. */
  pipeline?: string;
}

/** One item of any app, tagged with its app. */
export type KnowledgeSource =
  | { app: 'pyramids'; doc: PyramidSource }
  | { app: 'productDefinitions'; doc: ProductDefinitionSource }
  | { app: 'contextDocuments'; doc: ContextDocumentSource }
  | { app: 'diagrams'; doc: DiagramSource }
  | { app: 'technicalArchitectures'; doc: TechnicalArchitectureSource }
  | { app: 'uiUxArchitectures'; doc: UiUxArchitectureSource }
  | { app: 'technicalTasks'; doc: TechnicalTaskSource }
  | { app: SpecApp; doc: SpecSource };

const isoDate = (iso: string) => {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? iso : new Date(time).toISOString();
};

export function pyramidToMarkdown(p: PyramidSource): string {
  const n = p.config.boardSize;
  const cells = p.cells;
  const out = [`# ${p.title}`, '', `**Question:** ${p.config.question}`, ''];
  if (p.config.context.trim()) out.push('## Context', '', p.config.context.trim(), '');

  out.push('## Final answer', '');
  const fl = finalLabel(n);
  const final = cells[fl];
  if (!final) {
    out.push(`_Not reached yet: the pyramid is ${p.status} at row ${p.currentRow}._`, '');
  } else {
    out.push(final.conclusion, '', `Confidence: ${final.confidence.toFixed(2)}`, '');
    if (final.dissent.length) out.push('Key dissent:', ...final.dissent.map((d) => `- ${d}`), '');
  }

  const path = reportCriticalPath(n, cells);
  if (path.length) {
    out.push('## Critical path', '');
    path.forEach((lbl, i) => {
      const question = cellQuestion(n, lbl, cells, p.config.question);
      if (kind(n, ...coord(n, lbl)) === 'root') out.push(`${i + 1}. **${lbl}** - ${question}`);
      else out.push(`${i + 1}. **${lbl}** - ${question}`, `   - ${cells[lbl].conclusion}`);
    });
    out.push('');
  }

  const concluded = workingRows(n).flatMap((r) => rowLabels(n, r).filter((l) => l in cells));
  if (concluded.length) {
    out.push('## Conclusions', '');
    for (const lbl of concluded) {
      const cell = cells[lbl];
      out.push(`### ${lbl}: ${cellQuestion(n, lbl, cells, p.config.question)}`, '', cell.conclusion, '');
      if (cell.dissent.length) out.push('Dissent:', ...cell.dissent.map((d) => `- ${d}`), '');
    }
  }
  return out.join('\n');
}

function contextDocumentToMarkdown(doc: ContextDocumentSource): string {
  return `# ${doc.title}\n\n${extractPlainText(doc.content)}\n`;
}

/** The knowledge item of one source. Pure and deterministic. */
export function toKnowledgeItem(source: KnowledgeSource): KnowledgeItem {
  const { app, doc } = source;
  const base = { ref: { app, id: doc._id }, title: doc.title, updatedAt: doc.updatedAt };
  switch (source.app) {
    case 'pyramids':
      return { ...base, meta: { status: source.doc.status }, markdown: pyramidToMarkdown(source.doc) };
    case 'productDefinitions':
      return { ...base, meta: {}, markdown: productSpecToMarkdown(doc.title, productSpecOf(source.doc)) };
    case 'designSystems':
      return { ...base, meta: {}, markdown: designSystemToMarkdown(doc.title, normalizeDesignSystem(source.doc.spec)) };
    case 'technicalPlans': {
      const plan = normalizeTechnicalPlan(source.doc.spec);
      return { ...base, meta: { status: PLAN_STATUS_LABELS[plan.status] }, markdown: technicalPlanToMarkdown(doc.title, plan) };
    }
    case 'decisions': {
      const decision = normalizeDecision(source.doc.spec);
      return { ...base, meta: { status: decision.status, ...(decision.date && { date: decision.date }) }, markdown: decisionToMarkdown(doc.title, decision) };
    }
    case 'glossaries':
      return { ...base, meta: {}, markdown: glossaryToMarkdown(doc.title, normalizeGlossary(source.doc.spec)) };
    case 'researchStudies':
      return { ...base, meta: {}, markdown: researchToMarkdown(doc.title, normalizeResearch(source.doc.spec)) };
    case 'roadmaps':
      return { ...base, meta: {}, markdown: roadmapToMarkdown(doc.title, normalizeRoadmap(source.doc.spec)) };
    case 'contextDocuments': {
      const meta: Record<string, string> = { type: source.doc.type };
      if (source.doc.folder) meta.folder = source.doc.folder;
      return { ...base, meta, markdown: contextDocumentToMarkdown(source.doc) };
    }
    case 'diagrams':
      return {
        ...base,
        meta: {},
        markdown: diagramToMarkdown(doc.title, source.doc.nodes as GraphNode[], source.doc.edges as GraphEdge[]),
      };
    case 'technicalArchitectures': {
      const spec = technicalArchitectureSpecOf(source.doc);
      return { ...base, meta: spec.style ? { style: ARCHITECTURE_STYLES.labels[spec.style] } : {}, markdown: technicalArchitectureToMarkdown(doc.title, spec) };
    }
    case 'uiUxArchitectures':
      return { ...base, meta: {}, markdown: uiUxArchitectureToMarkdown(source.doc) };
    case 'technicalTasks': {
      const task = source.doc;
      const meta: Record<string, string> = { type: task.type };
      const status = task.data?.task_metadata?.status;
      if (status) meta.status = status;
      if (task.pipeline) meta.pipeline = task.pipeline;
      return { ...base, meta, markdown: technicalTaskToMarkdown(task, isoDate) };
    }
  }
}

/** The fields derived relations are read from (a full source also qualifies). */
export type DerivedEdgeSource =
  | { app: 'technicalTasks'; doc: { _id: string; technicalArchitectureId?: string } }
  | { app: 'pyramids'; doc: { _id: string; config: { contextDocumentIds: string[]; contextRefs?: ContextRef[] } } }
  | { app: 'uiUxArchitectures'; doc: { _id: string; designSystemId?: string } }
  | { app: Exclude<KnowledgeApp, 'technicalTasks' | 'pyramids' | 'uiUxArchitectures'>; doc: { _id: string } };

/** Relations an item states through its own fields. They are computed, never stored. */
export function derivedEdges(source: DerivedEdgeSource): KnowledgeEdge[] {
  const from = { app: source.app, id: source.doc._id };
  switch (source.app) {
    case 'technicalTasks':
      return source.doc.technicalArchitectureId
        ? [{ from, to: { app: 'technicalArchitectures', id: source.doc.technicalArchitectureId }, kind: 'depends-on', source: 'derived' }]
        : [];
    case 'pyramids':
      return contextRefsOf(source.doc.config).flatMap((ref): KnowledgeEdge[] =>
        ref.kind === 'item' ? [{ from, to: { app: ref.app, id: ref.id }, kind: 'references', source: 'derived' }] : [],
      );
    case 'uiUxArchitectures':
      return source.doc.designSystemId
        ? [{ from, to: { app: 'designSystems', id: source.doc.designSystemId }, kind: 'depends-on', source: 'derived' }]
        : [];
    default:
      return [];
  }
}
