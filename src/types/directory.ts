export interface Directory {
  id: string;
  userId: string;
  workspaceId?: string;
  title: string;
  createdAt: Date | null;
  lastModified: Date | null;
}
