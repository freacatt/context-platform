import {
  BookA,
  BookOpen,
  ClipboardList,
  GitMerge,
  Layout,
  Map,
  Microscope,
  Palette,
  Pyramid,
  Scale,
  Server,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import type { KnowledgeApp } from '@shared/knowledge/types';

export interface WorkspaceApp {
  key: Exclude<KnowledgeApp, 'technicalTasks'>;
  title: string;
  description: string;
  /** List page, relative to the workspace. */
  path: string;
  /** Editor route prefix of one item, relative to the workspace (`${itemPath}/${id}`). */
  itemPath: string;
  icon: LucideIcon;
  category: string;
  colorClass: string;
  buttonColorClass: string;
  /** Soft tint of the app's icon tile on its cards. */
  tintClassName: string;
}

/** The workspace apps, in dashboard and sidebar order. Single source for both. */
export const WORKSPACE_APPS: WorkspaceApp[] = [
  {
    key: 'pyramids',
    title: 'Pyramid Solver',
    description:
      'Solve hard questions with a roundtable of AI models: one question expands across a pyramid, every row is debated, and the board converges to one answer.',
    path: '/pyramids',
    itemPath: '/pyramid',
    icon: Pyramid,
    category: 'Thinking & Deciding',
    colorClass: 'bg-indigo-600',
    buttonColorClass: 'bg-indigo-500/25 hover:bg-indigo-500/35',
    tintClassName: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  },
  {
    key: 'diagrams',
    title: 'Diagrams',
    description: 'Create and manage visual diagrams to illustrate system flows, architectures, and processes.',
    path: '/diagrams',
    itemPath: '/diagram',
    icon: Workflow,
    category: 'Thinking & Deciding',
    colorClass: 'bg-rose-600',
    buttonColorClass: 'bg-rose-500/25 hover:bg-rose-500/35',
    tintClassName: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  },
  {
    key: 'decisions',
    title: 'Decisions',
    description: 'Record decisions with their context, the options you weighed and the consequences, so the reasoning outlives the meeting.',
    path: '/decisions',
    itemPath: '/decision',
    icon: Scale,
    category: 'Thinking & Deciding',
    colorClass: 'bg-orange-600',
    buttonColorClass: 'bg-orange-500/25 hover:bg-orange-500/35',
    tintClassName: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  },
  {
    key: 'productDefinitions',
    title: 'Product Definition',
    description: 'Define the product: vision, problem, personas, jobs to be done, features, requirements, success metrics and the assumptions behind them.',
    path: '/product-definitions',
    itemPath: '/product-definition',
    icon: GitMerge,
    category: 'Product',
    colorClass: 'bg-teal-600',
    buttonColorClass: 'bg-teal-500/25 hover:bg-teal-500/35',
    tintClassName: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
  },
  {
    key: 'researchStudies',
    title: 'Research & Insights',
    description: 'Collect interviews, surveys and other sources, and turn them into insights with evidence your product decisions can cite.',
    path: '/research',
    itemPath: '/research-study',
    icon: Microscope,
    category: 'Product',
    colorClass: 'bg-cyan-600',
    buttonColorClass: 'bg-cyan-500/25 hover:bg-cyan-500/35',
    tintClassName: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  },
  {
    key: 'roadmaps',
    title: 'Goals & Roadmap',
    description: 'Set goals with measurable key results and lay out the initiatives that move them — Now, Next and Later.',
    path: '/roadmaps',
    itemPath: '/roadmap',
    icon: Map,
    category: 'Product',
    colorClass: 'bg-emerald-600',
    buttonColorClass: 'bg-emerald-500/25 hover:bg-emerald-500/35',
    tintClassName: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'designSystems',
    title: 'Design Systems',
    description: 'Build design systems: color, type, spacing and motion tokens, components with variants and guidelines. Export Markdown, design tokens or CSS.',
    path: '/design-systems',
    itemPath: '/design-system',
    icon: Palette,
    category: 'Design',
    colorClass: 'bg-fuchsia-600',
    buttonColorClass: 'bg-fuchsia-500/25 hover:bg-fuchsia-500/35',
    tintClassName: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400',
  },
  {
    key: 'uiUxArchitectures',
    title: 'UI/UX Architecture',
    description: "Map your application's screens and navigation flow on a visual canvas, built with one of your design systems.",
    path: '/ui-ux-architectures',
    itemPath: '/ui-ux-architecture',
    icon: Layout,
    category: 'Design',
    colorClass: 'bg-pink-600',
    buttonColorClass: 'bg-pink-500/25 hover:bg-pink-500/35',
    tintClassName: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  },
  {
    key: 'contextDocuments',
    title: 'Context & Documents',
    description: 'Create and manage knowledge base documents for your product definitions and problem solving.',
    path: '/context-documents',
    itemPath: '/context-document',
    icon: BookOpen,
    category: 'Knowledge Base',
    colorClass: 'bg-amber-600',
    buttonColorClass: 'bg-amber-500/25 hover:bg-amber-500/35',
    tintClassName: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    key: 'glossaries',
    title: 'Glossary',
    description: 'Agree on the words: terms, definitions and aliases of your domain, so people and AI use the same language.',
    path: '/glossaries',
    itemPath: '/glossary',
    icon: BookA,
    category: 'Knowledge Base',
    colorClass: 'bg-yellow-600',
    buttonColorClass: 'bg-yellow-500/25 hover:bg-yellow-500/35',
    tintClassName: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  },
  {
    key: 'technicalArchitectures',
    title: 'Technical Architecture',
    description:
      'Define the full technical architecture of your application. Specify system layers, technology stack, and engineering standards.',
    path: '/technical-architectures',
    itemPath: '/technical-architecture',
    icon: Server,
    category: 'Technical',
    colorClass: 'bg-purple-600',
    buttonColorClass: 'bg-purple-500/25 hover:bg-purple-500/35',
    tintClassName: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
  {
    key: 'technicalPlans',
    title: 'Technical Plans',
    description: 'Plan how to build something: goal, scope, approach, phases and steps, decisions, risks and acceptance criteria — ready for a person or a coding agent.',
    path: '/technical-plans',
    itemPath: '/technical-plan',
    icon: ClipboardList,
    category: 'Technical',
    colorClass: 'bg-blue-600',
    buttonColorClass: 'bg-blue-500/25 hover:bg-blue-500/35',
    tintClassName: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
];

/** Header and card styling for an app's page, so every feature page looks the same. */
export function appPage(key: string) {
  const app = WORKSPACE_APPS.find((a) => a.key === key);
  if (!app) throw new Error(`unknown app ${key}`);
  return {
    heading: app.title,
    description: app.description,
    icon: app.icon,
    iconClassName: app.colorClass,
    cardIconClassName: app.tintClassName,
  };
}
