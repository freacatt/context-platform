import { storage } from './storage';
import { setupWorkspace as agentSetupWorkspace, teardownWorkspace, AgentPlatformError } from './agentPlatformClient';
import { Workspace } from '../types';

const mapWorkspaceFromStorage = (data: any): Workspace => {
    return {
        id: data.id,
        userId: data.userId,
        name: data.name,
        createdAt: data.createdAt ? new Date(data.createdAt) : null,
        lastModified: data.lastModified ? new Date(data.lastModified) : null,
        gmAgentId: data.gmAgentId,
        aiRecommendationAgentId: data.aiRecommendationAgentId,
        aiChatAgentId: data.aiChatAgentId,
        islandAgentIds: data.islandAgentIds || [],
    };
};

export const createWorkspace = async (userId: string, name: string): Promise<string> => {
  const id = storage.createId();
  const workspaceData = {
    id,
    userId,
    name,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString()
  };

  await storage.save('workspaces', workspaceData);
  return id;
};

/**
 * Call agent-platform to set up AI infrastructure for a workspace.
 * Updates the workspace doc with agent IDs on success.
 */
export const setupWorkspaceAgentPlatform = async (
  workspaceId: string,
  name: string
): Promise<{ gmAgentId: string }> => {
  const result = await agentSetupWorkspace(workspaceId, name);
  // Update workspace doc with agent references
  await storage.update('workspaces', workspaceId, {
    gmAgentId: result.gm_agent_id,
    aiRecommendationAgentId: result.gm_agent_id,
    aiChatAgentId: result.gm_agent_id,
    lastModified: new Date().toISOString(),
  });
  return { gmAgentId: result.gm_agent_id };
};

/**
 * Update workspace AI agent assignments.
 */
export const updateWorkspaceAgentSettings = async (
  workspaceId: string,
  settings: {
    aiRecommendationAgentId?: string;
    aiChatAgentId?: string;
    islandAgentIds?: string[];
  }
): Promise<void> => {
  await storage.update('workspaces', workspaceId, {
    ...settings,
    lastModified: new Date().toISOString(),
  });
};

export const getWorkspace = async (workspaceId: string): Promise<Workspace | null> => {
  const data = await storage.get('workspaces', workspaceId);
  if (!data) return null;
  return mapWorkspaceFromStorage(data);
};

export const getUserWorkspaces = async (userId: string): Promise<Workspace[]> => {
    const results = await storage.query('workspaces', { userId });
    const workspaces = results.map(mapWorkspaceFromStorage);

    return workspaces.sort((a, b) => {
         const dateA = a.createdAt?.getTime() || 0;
         const dateB = b.createdAt?.getTime() || 0;
         return dateB - dateA;
    });
};

export const updateWorkspace = async (workspaceId: string, updates: Partial<Workspace>): Promise<void> => {
    await storage.update('workspaces', workspaceId, {
        ...updates,
        lastModified: new Date().toISOString()
    });
};

export const deleteWorkspace = async (workspaceId: string, userId: string): Promise<void> => {
    // 0. Tear down agent-platform resources (agents, sessions, Qdrant)
    try {
        await teardownWorkspace(workspaceId);
    } catch {
        // Best-effort: don't block workspace deletion if agent-platform is unreachable
    }

    const commonFilter = { workspaceId, userId };

    // 1. Delete simple collections (direct workspace children)
    const collections = [
        'pyramids',
        'productDefinitions',
        'contextDocuments',
        'directories',
        'uiUxArchitectures',
        'diagrams',
        'technicalTasks',
        'pipelines',
        'technicalArchitectures',
        'globalTasks'
    ];

    for (const collection of collections) {
        const items = await storage.query(collection, commonFilter);
        const promises = items.map(item => storage.delete(collection, item.id));
        await Promise.all(promises);
    }

    // 2. Finally delete the workspace
    await storage.delete('workspaces', workspaceId);
};

export { AgentPlatformError };
