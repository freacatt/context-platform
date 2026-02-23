export interface SessionMessage {
  id: string;
  role: string;
  content: string;
  timestamp: string;
  metadata: Record<string, any>;
}

export interface Session {
  id: string;
  workspaceId: string;
  agentId: string;
  userId: string;
  title: string | null;
  status: 'active' | 'paused' | 'completed';
  messages: SessionMessage[];
  metadata: Record<string, any>;
  parentSessionId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SessionListItem {
  id: string;
  workspaceId: string;
  agentId: string;
  title: string | null;
  status: string;
  messageCount: number;
  lastMessagePreview: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ToolCallTrace {
  toolId: string;
  args: Record<string, any>;
  result: Record<string, any>;
}

export interface SessionMessageResponse {
  userMessage: SessionMessage;
  assistantMessage: SessionMessage;
  model: string;
  toolCalls: ToolCallTrace[];
}
