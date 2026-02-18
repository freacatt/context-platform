import { auth } from "./firebase";

const AGENT_SERVER_URL =
  import.meta.env.VITE_AGENT_SERVER_URL || "http://localhost:8000";

async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
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
    const text = await res.text();
    throw new Error(text || `Agent server error: ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function agentCreateWorkspace(name: string) {
  return request<{ id: string; name: string }>("/workspaces", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function agentDirectAgentCall(workspaceId: string, prompt: string) {
  return request<{ output: string }>("/conversations/direct-agent", {
    method: "POST",
    body: JSON.stringify({ workspace_id: workspaceId, prompt }),
  });
}

export async function agentGMTask(workspaceId: string, task: string) {
  return request<{ output: string }>("/conversations/gm-task", {
    method: "POST",
    body: JSON.stringify({ workspace_id: workspaceId, task }),
  });
}

