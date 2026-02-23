import { auth } from "./firebase";
import type { AgentConfig, AgentCreatePayload, AgentUpdatePayload } from "../types/agent";
import type { Session, SessionListItem, SessionMessage, SessionMessageResponse, ToolCallTrace } from "../types/session";

const AGENT_SERVER_URL =
  import.meta.env.VITE_AGENT_SERVER_URL || "http://localhost:8000";

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class AgentPlatformError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.name = "AgentPlatformError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

// ---------------------------------------------------------------------------
// Internal request helper
// ---------------------------------------------------------------------------

async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new AgentPlatformError("UNAUTHENTICATED", "User not authenticated", 401);
  }
  return user.getIdToken();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");

  const res = await fetch(`${AGENT_SERVER_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let code = "UNKNOWN_ERROR";
    let message = `Agent server error: ${res.status}`;
    try {
      const body = await res.json();
      if (body.error) {
        code = body.error.code || code;
        message = body.error.message || message;
      } else if (body.detail) {
        message = body.detail;
      }
    } catch {
      // JSON parse failed — use default message
    }
    throw new AgentPlatformError(code, message, res.status);
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface WorkspaceSetupResponse {
  workspace_id: string;
  gm_agent_id: string;
}

interface AgentApiResponse {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  type: string;
  model_mode: string;
  model_provider: string | null;
  model_name: string | null;
  skills: string[];
  context: string;
  is_default: boolean;
  is_orchestrator: boolean;
  app_access: { app_id: string; permissions: string[] }[];
  mcp_servers: { name: string; url: string; auth: Record<string, string> }[];
  orchestrator_config: { can_delegate_to_agents: boolean; auto_select_agent: boolean; fallback_behavior: string } | null;
  created_at: string | null;
  updated_at: string | null;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapAgent(raw: AgentApiResponse): AgentConfig {
  return {
    id: raw.id,
    workspaceId: raw.workspace_id,
    userId: raw.user_id,
    name: raw.name,
    type: raw.type as "gm" | "custom",
    modelMode: raw.model_mode as "auto" | "manual",
    modelProvider: raw.model_provider || undefined,
    modelName: raw.model_name || undefined,
    skills: raw.skills || [],
    context: raw.context || "",
    isDefault: raw.is_default,
    isOrchestrator: raw.is_orchestrator ?? false,
    appAccess: (raw.app_access || []).map((a) => ({
      appId: a.app_id,
      permissions: a.permissions || [],
    })),
    mcpServers: (raw.mcp_servers || []).map((s) => ({
      name: s.name,
      url: s.url,
      auth: s.auth || {},
    })),
    orchestratorConfig: raw.orchestrator_config
      ? {
          canDelegateToAgents: raw.orchestrator_config.can_delegate_to_agents,
          autoSelectAgent: raw.orchestrator_config.auto_select_agent,
          fallbackBehavior: raw.orchestrator_config.fallback_behavior,
        }
      : null,
    createdAt: raw.created_at || "",
    updatedAt: raw.updated_at || "",
  };
}

// ---------------------------------------------------------------------------
// Workspace
// ---------------------------------------------------------------------------

export async function setupWorkspace(
  workspaceId: string,
  name: string
): Promise<WorkspaceSetupResponse> {
  return request<WorkspaceSetupResponse>("/workspaces/setup", {
    method: "POST",
    body: JSON.stringify({ workspace_id: workspaceId, name }),
  });
}

export async function getWorkspace(workspaceId: string) {
  return request<{
    id: string;
    name: string;
    gm_agent_id: string | null;
    ai_recommendation_agent_id: string | null;
    ai_chat_agent_id: string | null;
  }>(`/workspaces/${workspaceId}`);
}

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

export async function getAgents(workspaceId: string): Promise<AgentConfig[]> {
  const raw = await request<AgentApiResponse[]>(
    `/agents?workspace_id=${encodeURIComponent(workspaceId)}`
  );
  return raw.map(mapAgent);
}

export async function getAgent(agentId: string): Promise<AgentConfig> {
  const raw = await request<AgentApiResponse>(`/agents/${agentId}`);
  return mapAgent(raw);
}

export async function createAgent(payload: AgentCreatePayload): Promise<AgentConfig> {
  const raw = await request<AgentApiResponse>("/agents", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapAgent(raw);
}

export async function updateAgent(
  agentId: string,
  payload: AgentUpdatePayload
): Promise<AgentConfig> {
  const raw = await request<AgentApiResponse>(`/agents/${agentId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return mapAgent(raw);
}

export async function deleteAgent(agentId: string): Promise<void> {
  await request<void>(`/agents/${agentId}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

export interface ModelOption {
  value: string;
  label: string;
  context_window: number | null;
}

export interface ProviderOption {
  value: string;
  label: string;
  models: ModelOption[];
}

export async function getModels(): Promise<ProviderOption[]> {
  return request<ProviderOption[]>("/models");
}

// ---------------------------------------------------------------------------
// Recommend (server-side prompt templates)
// ---------------------------------------------------------------------------

interface RecommendResponse {
  response: string;
  prompt_type: string;
  model: string;
}

export async function recommend(
  workspaceId: string,
  agentId: string,
  promptType: string,
  variables: Record<string, string> = {}
): Promise<RecommendResponse> {
  return request<RecommendResponse>("/recommend", {
    method: "POST",
    body: JSON.stringify({
      workspace_id: workspaceId,
      agent_id: agentId,
      prompt_type: promptType,
      variables,
    }),
  });
}

export async function getPromptTypes(): Promise<string[]> {
  return request<string[]>("/recommend/prompt-types");
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

interface SessionApiResponse {
  id: string;
  workspace_id: string;
  agent_id: string;
  user_id: string;
  title: string | null;
  status: string;
  messages: { id: string; role: string; content: string; timestamp: string; metadata: Record<string, any> }[];
  metadata: Record<string, any>;
  parent_session_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface SessionListItemApi {
  id: string;
  workspace_id: string;
  agent_id: string;
  title: string | null;
  status: string;
  message_count: number;
  last_message_preview: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface SessionMessageResponseApi {
  user_message: { id: string; role: string; content: string; timestamp: string; metadata: Record<string, any> };
  assistant_message: { id: string; role: string; content: string; timestamp: string; metadata: Record<string, any> };
  model: string;
  tool_calls: { tool_id: string; args: Record<string, any>; result: Record<string, any> }[];
}

function mapSession(raw: SessionApiResponse): Session {
  return {
    id: raw.id,
    workspaceId: raw.workspace_id,
    agentId: raw.agent_id,
    userId: raw.user_id,
    title: raw.title,
    status: raw.status as Session["status"],
    messages: raw.messages || [],
    metadata: raw.metadata || {},
    parentSessionId: raw.parent_session_id,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

function mapSessionListItem(raw: SessionListItemApi): SessionListItem {
  return {
    id: raw.id,
    workspaceId: raw.workspace_id,
    agentId: raw.agent_id,
    title: raw.title,
    status: raw.status,
    messageCount: raw.message_count,
    lastMessagePreview: raw.last_message_preview,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

function mapSessionMessageResponse(raw: SessionMessageResponseApi): SessionMessageResponse {
  return {
    userMessage: raw.user_message,
    assistantMessage: raw.assistant_message,
    model: raw.model,
    toolCalls: (raw.tool_calls || []).map((tc) => ({
      toolId: tc.tool_id,
      args: tc.args,
      result: tc.result,
    })),
  };
}

export async function createSession(
  workspaceId: string,
  agentId: string,
  title?: string,
  chatOnly?: boolean
): Promise<Session> {
  const raw = await request<SessionApiResponse>("/sessions", {
    method: "POST",
    body: JSON.stringify({
      workspace_id: workspaceId,
      agent_id: agentId,
      title: title || null,
      chat_only: chatOnly || false,
    }),
  });
  return mapSession(raw);
}

export async function listSessions(
  workspaceId: string,
  agentId?: string,
  status?: string
): Promise<SessionListItem[]> {
  const params = new URLSearchParams({ workspace_id: workspaceId });
  if (agentId) params.set("agent_id", agentId);
  if (status) params.set("status", status);
  const raw = await request<SessionListItemApi[]>(`/sessions?${params.toString()}`);
  return raw.map(mapSessionListItem);
}

export async function getSession(sessionId: string): Promise<Session> {
  const raw = await request<SessionApiResponse>(`/sessions/${sessionId}`);
  return mapSession(raw);
}

export async function sendSessionMessage(
  sessionId: string,
  message: string,
  context?: string
): Promise<SessionMessageResponse> {
  const raw = await request<SessionMessageResponseApi>(`/sessions/${sessionId}/messages`, {
    method: "POST",
    body: JSON.stringify({ message, context: context || null }),
  });
  return mapSessionMessageResponse(raw);
}

export async function deleteSession(sessionId: string): Promise<void> {
  await request<void>(`/sessions/${sessionId}`, { method: "DELETE" });
}

export async function updateSessionStatus(
  sessionId: string,
  newStatus: string
): Promise<Session> {
  const raw = await request<SessionApiResponse>(`/sessions/${sessionId}`, {
    method: "PATCH",
    body: JSON.stringify({ status: newStatus }),
  });
  return mapSession(raw);
}

// ---------------------------------------------------------------------------
// Apps (kept for compatibility)
// ---------------------------------------------------------------------------

export async function getApps() {
  return request<{ id: string; label: string }[]>("/apps");
}
