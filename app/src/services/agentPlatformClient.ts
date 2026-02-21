import { auth } from "./firebase";
import type { AgentConfig, AgentCreatePayload, AgentUpdatePayload } from "../types/agent";

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
  created_at: string | null;
  updated_at: string | null;
}

interface ChatResponse {
  response: string;
  agent_id: string;
  model: string;
}

interface ChatHistoryEntry {
  role: string;
  content: string;
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
// Chat
// ---------------------------------------------------------------------------

export async function chat(
  workspaceId: string,
  agentId: string,
  message: string,
  history: ChatHistoryEntry[] = [],
  context?: string
): Promise<ChatResponse> {
  return request<ChatResponse>("/chat", {
    method: "POST",
    body: JSON.stringify({
      workspace_id: workspaceId,
      agent_id: agentId,
      message,
      history,
      context: context || null,
    }),
  });
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
// Apps (kept for compatibility)
// ---------------------------------------------------------------------------

export async function getApps() {
  return request<{ id: string; label: string }[]>("/apps");
}
