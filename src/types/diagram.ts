import { ContextSource } from './contextSource';

export interface DiagramNodeData {
  title: string;
  description: string;
  contextSources?: ContextSource[];
}

export interface Diagram {
  id: string;
  userId: string;
  workspaceId?: string;
  title: string;
  createdAt: Date | null;
  lastModified: Date | null;
  nodes: any[]; // Using any[] to avoid strict dependency on reactflow types
  edges: any[];
}
