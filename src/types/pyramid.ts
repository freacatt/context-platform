import { Block } from '../utils/pyramidLayout';
import { ContextSource } from './contextSource';

export type { Block };

export type BlockType = 'regular' | 'combined';

export interface Pyramid {
  id: string;
  userId: string;
  workspaceId?: string;
  title: string;
  context: string | null;
  createdAt: Date | null;
  lastModified: Date | null;
  status: string;
  blocks: Record<string, Block>;
  connections: any[];
  contextSources?: ContextSource[];
}

export interface QuestionGenerationData {
  historyContext?: string;
  parentQuestions?: string[];
  parentQuestion?: string;
  combinedQuestion?: string;
  currentAnswer?: string;
}
