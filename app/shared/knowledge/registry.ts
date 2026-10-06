import type { KnowledgeApp } from './types';

export interface KnowledgeAppInfo {
  key: KnowledgeApp;
  /** Plural label, e.g. "Diagrams". */
  label: string;
  /** Folder of the app's files in a zip export. */
  folder: string;
  /** Retired app whose items are still readable until converted. */
  legacy?: boolean;
}

/** Every knowledge app, in dashboard order. The single place a new app plugs into knowledge export. */
export const KNOWLEDGE_APPS: readonly KnowledgeAppInfo[] = [
  { key: 'pyramids', label: 'Pyramid Solver', folder: 'pyramids' },
  { key: 'diagrams', label: 'Diagrams', folder: 'diagrams' },
  { key: 'decisions', label: 'Decisions', folder: 'decisions' },
  { key: 'productDefinitions', label: 'Product Definitions', folder: 'product-definitions' },
  { key: 'researchStudies', label: 'Research & Insights', folder: 'research' },
  { key: 'roadmaps', label: 'Goals & Roadmaps', folder: 'roadmaps' },
  { key: 'designSystems', label: 'Design Systems', folder: 'design-systems' },
  { key: 'uiUxArchitectures', label: 'UI/UX Architectures', folder: 'ui-ux-architectures' },
  { key: 'contextDocuments', label: 'Context & Documents', folder: 'context-documents' },
  { key: 'glossaries', label: 'Glossaries', folder: 'glossaries' },
  { key: 'technicalArchitectures', label: 'Technical Architectures', folder: 'technical-architectures' },
  { key: 'technicalPlans', label: 'Technical Plans', folder: 'technical-plans' },
  { key: 'technicalTasks', label: 'Technical Tasks (legacy)', folder: 'technical-tasks', legacy: true },
];

export function knowledgeApp(key: KnowledgeApp): KnowledgeAppInfo {
  const app = KNOWLEDGE_APPS.find((a) => a.key === key);
  if (!app) throw new Error(`unknown knowledge app ${key}`);
  return app;
}

/** Position of an app in dashboard order (for stable sorting). */
export const appOrder = (key: KnowledgeApp): number => KNOWLEDGE_APPS.findIndex((a) => a.key === key);
