export interface AgentConfig {
  id: string;
  workspaceId: string;
  userId: string;
  name: string;
  type: 'gm' | 'custom';
  modelMode: 'auto' | 'manual';
  modelProvider?: string;
  modelName?: string;
  skills: string[];
  context: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentCreatePayload {
  workspace_id: string;
  name: string;
  type?: string;
  model_mode?: string;
  model_provider?: string;
  model_name?: string;
  skills?: string[];
  context?: string;
}

export interface AgentUpdatePayload {
  name?: string;
  model_mode?: string;
  model_provider?: string;
  model_name?: string;
  skills?: string[];
  context?: string;
}
