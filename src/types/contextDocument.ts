export interface ContextDocument {
  id: string;
  userId: string;
  workspaceId?: string;
  title: string;
  type: string;
  content: string;
  notionId: string;
  createdAt: Date | null;
  lastModified: Date | null;
  directoryId?: string | null;
}
