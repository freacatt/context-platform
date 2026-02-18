import { storage } from './storage';
import { Workspace } from '../types';

const mapWorkspaceFromStorage = (data: any): Workspace => {
    return {
        id: data.id,
        userId: data.userId,
        name: data.name,
        createdAt: data.createdAt ? new Date(data.createdAt) : null,
        lastModified: data.lastModified ? new Date(data.lastModified) : null,
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

    // 2. Delete conversations and their messages
    const conversations = await storage.query('conversations', commonFilter);
    for (const conversation of conversations) {
        // Delete messages for this conversation
        const messages = await storage.query('messages', { parentId: conversation.id });
        const messagePromises = messages.map(msg => storage.delete('messages', msg.id));
        await Promise.all(messagePromises);
        
        // Delete the conversation itself
        await storage.delete('conversations', conversation.id);
    }

    // 3. Finally delete the workspace
    await storage.delete('workspaces', workspaceId);
};
