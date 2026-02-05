import { Request, Response, NextFunction } from 'express';
import { db } from './firebase.js';
import crypto from 'crypto';

interface McpRequest extends Request {
  workspaceId?: string;
  mcpSettings?: any;
}

export const authMiddleware = async (req: McpRequest, res: Response, next: NextFunction) => {
  let apiKey = req.headers['x-mcp-key'] as string;
  let workspaceId = req.headers['x-workspace-id'] as string;

  // Fallback to query params
  if (!apiKey) apiKey = req.query['key'] as string;
  if (!workspaceId) workspaceId = req.query['workspaceId'] as string;

  if (!apiKey || !workspaceId) {
    return res.status(401).json({ error: 'Missing x-mcp-key or x-workspace-id (check headers or query params)' });
  }

  try {
    // Fetch settings for this workspace
    // Note: We query the collection we defined in frontend
    const settingsSnapshot = await db.collection('workspace_mcp_settings')
      .where('workspaceId', '==', workspaceId)
      .limit(1)
      .get();

    if (settingsSnapshot.empty) {
      return res.status(404).json({ error: 'Workspace MCP settings not found' });
    }

    const settings = settingsSnapshot.docs[0].data();

    if (!settings.enabled) {
      return res.status(403).json({ error: 'MCP access is disabled for this workspace' });
    }

    // Verify key
    // We hash the incoming key and compare with stored hashes
    const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    const validKey = settings.accessKeys.find((k: any) => k.hashedKey === hash);

    if (!validKey) {
      return res.status(401).json({ error: 'Invalid API Key' });
    }

    // Attach to request
    req.workspaceId = workspaceId;
    req.mcpSettings = settings;

    // Update last used (fire and forget)
    // In a real app, optimize this to not write on every request
    const now = new Date().toISOString();
    const updatedKeys = settings.accessKeys.map((k: any) => 
      k.id === validKey.id ? { ...k, lastUsedAt: now } : k
    );
    
    db.collection('workspace_mcp_settings').doc(settingsSnapshot.docs[0].id).update({
      accessKeys: updatedKeys
    });

    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
