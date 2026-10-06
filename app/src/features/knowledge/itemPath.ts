import type { KnowledgeApp } from '@shared/knowledge/types';
import { WORKSPACE_APPS } from '@/features/workspaces/apps';

/** Editor route of an item, relative to the workspace. Legacy tasks open the plans page (to convert them). */
export function itemPath(app: KnowledgeApp, id: string): string {
  if (app === 'technicalTasks') return '/technical-plans';
  const info = WORKSPACE_APPS.find((a) => a.key === app)!;
  return `${info.itemPath}/${id}`;
}
