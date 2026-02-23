export interface AppAccessEntry {
  appId: string;
  permissions: string[];
}

export interface McpServerEntry {
  name: string;
  url: string;
  auth: Record<string, string>;
}

export interface OrchestratorConfig {
  canDelegateToAgents: boolean;
  autoSelectAgent: boolean;
  fallbackBehavior: string;
}

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
  isOrchestrator: boolean;
  appAccess: AppAccessEntry[];
  mcpServers: McpServerEntry[];
  orchestratorConfig: OrchestratorConfig | null;
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
  is_orchestrator?: boolean;
  app_access?: { app_id: string; permissions: string[] }[];
  mcp_servers?: { name: string; url: string; auth: Record<string, string> }[];
  orchestrator_config?: { can_delegate_to_agents: boolean; auto_select_agent: boolean; fallback_behavior: string } | null;
}

export interface AgentUpdatePayload {
  name?: string;
  model_mode?: string;
  model_provider?: string;
  model_name?: string;
  skills?: string[];
  context?: string;
  is_orchestrator?: boolean;
  app_access?: { app_id: string; permissions: string[] }[];
  mcp_servers?: { name: string; url: string; auth: Record<string, string> }[];
  orchestrator_config?: { can_delegate_to_agents: boolean; auto_select_agent: boolean; fallback_behavior: string } | null;
}
