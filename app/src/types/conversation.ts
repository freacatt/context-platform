export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface StoredMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date | null;
  metadata: Record<string, any>;
  parentId: string;
  parentCollection: string;
}

export interface Conversation {
  id: string;
  userId: string;
  workspaceId?: string;
  title: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  messages: StoredMessage[];
}
