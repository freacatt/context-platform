import { ContextSource } from './contextSource';

export interface ProductDefinitionNode {
  id: string;
  label: string;
  type?: string;
  description?: string;
  question?: string;
  parent?: string;
  children?: string[];
}

export interface ProductDefinition {
  id: string;
  userId: string;
  workspaceId?: string;
  title: string;
  createdAt: Date | null;
  lastModified: Date | null;
  linkedPyramidId: string | null;
  contextSources: ContextSource[];
  data: Record<string, ProductDefinitionNode>;
}
