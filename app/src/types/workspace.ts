export interface Workspace {
  id: string;
  userId: string; // Owner
  name: string;
  createdAt: Date | null;
  lastModified: Date | null;
}
