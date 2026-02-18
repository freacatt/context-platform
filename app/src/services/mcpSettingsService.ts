import { storage } from './storage';
import { WorkspaceMcpSettings, McpAccessKey } from '../types';
import { nanoid } from 'nanoid';

const COLLECTION = 'workspace_mcp_settings';

// Helper to hash key
const hashKey = async (key: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

export const getMcpSettings = async (workspaceId: string): Promise<WorkspaceMcpSettings | null> => {
  const settings = await storage.query(COLLECTION, { workspaceId });
  if (settings && settings.length > 0) {
    return settings[0] as WorkspaceMcpSettings;
  }
  return null;
};

export const initMcpSettings = async (workspaceId: string, userId: string): Promise<WorkspaceMcpSettings> => {
  const existing = await getMcpSettings(workspaceId);
  if (existing) return existing;

  const newSettings: WorkspaceMcpSettings = {
    id: storage.createId(),
    workspaceId,
    userId,
    enabled: false,
    allowedTools: ['read_global_context'], // Default allowed
    exposeDocuments: false,
    exposeGlobalContext: true,
    maxContextSize: 10000,
    accessKeys: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await storage.save(COLLECTION, newSettings);
  return newSettings;
};

export const updateMcpSettings = async (settings: WorkspaceMcpSettings): Promise<void> => {
  await storage.update(COLLECTION, settings.id, {
    ...settings,
    updatedAt: new Date().toISOString()
  });
};

export const createAccessKey = async (workspaceId: string, label: string): Promise<{ secret: string, key: McpAccessKey } | null> => {
  const settings = await getMcpSettings(workspaceId);
  if (!settings) return null;

  const secret = `sk-mcp-${nanoid(32)}`; // Generate a secure key
  const hashed = await hashKey(secret);

  const newKey: McpAccessKey = {
    id: nanoid(),
    label,
    keyPrefix: secret.substring(0, 10) + '...',
    hashedKey: hashed,
    createdAt: new Date().toISOString()
  };

  const updatedKeys = [...settings.accessKeys, newKey];
  
  await updateMcpSettings({
    ...settings,
    accessKeys: updatedKeys
  });

  return { secret, key: newKey };
};

export const revokeAccessKey = async (workspaceId: string, keyId: string): Promise<void> => {
  const settings = await getMcpSettings(workspaceId);
  if (!settings) return;

  const updatedKeys = settings.accessKeys.filter(k => k.id !== keyId);
  
  await updateMcpSettings({
    ...settings,
    accessKeys: updatedKeys
  });
};
