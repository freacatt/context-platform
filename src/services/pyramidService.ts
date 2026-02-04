import { storage } from './storage';
import { createBlock, Block } from '../utils/pyramidLayout';
import { Pyramid } from '../types';

// Helper to map DB data to Pyramid type
// Storage adapter returns { ...data, id }
const mapPyramidFromStorage = (data: any): Pyramid => {
    return {
        id: data.id,
        userId: data.userId || data.user_id,
        workspaceId: data.workspaceId,
        title: data.title,
        context: data.context,
        createdAt: (data.createdAt || data.created_at) ? new Date(data.createdAt || data.created_at) : null,
        lastModified: (data.lastModified || data.last_modified) ? new Date(data.lastModified || data.last_modified) : null,
        status: data.status,
        blocks: data.blocks,
        connections: data.connections,
        contextSources: data.contextSources || data.context_sources
    };
};

export const createPyramid = async (userId: string, title: string, context: string | null = null, workspaceId?: string): Promise<string> => {
    // Create an 8x8 grid of blocks
    const blocks: Record<string, Block> = {};
    for (let u = 0; u < 8; u++) {
      for (let v = 0; v < 8; v++) {
        const block = createBlock(u, v, 'question');
        blocks[block.id] = block;
      }
    }

    const id = storage.createId();
    const pyramidData = {
      id,
      userId: userId,
      workspaceId: workspaceId || null,
      title,
      context,
      status: 'in_progress',
      blocks: blocks,
      connections: [],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    await storage.save('pyramids', pyramidData);
    return id;
};

export const getPyramid = async (pyramidId: string): Promise<Pyramid | null> => {
    const data = await storage.get('pyramids', pyramidId);
    
    // Original threw "Pyramid not found". I'll keep consistency.
    if (!data) throw new Error("Pyramid not found");
    
    return mapPyramidFromStorage(data);
};

export const subscribeToPyramid = (pyramidId: string, onUpdate: (pyramid: Pyramid | null) => void) => {
    return storage.subscribe('pyramids', pyramidId, (data) => {
        if (data) {
            onUpdate(mapPyramidFromStorage(data));
        } else {
            onUpdate(null);
        }
    });
};

export const getUserPyramids = async (userId: string, workspaceId?: string): Promise<Pyramid[]> => {
    const results = await storage.query('pyramids', { userId, workspaceId });
    
    const pyramids = results.map(mapPyramidFromStorage);
    
    return pyramids.sort((a, b) => {
        const dateA = a.lastModified ? new Date(a.lastModified).getTime() : 0;
        const dateB = b.lastModified ? new Date(b.lastModified).getTime() : 0;
        return dateB - dateA;
    });
};

export const deletePyramid = async (pyramidId: string): Promise<void> => {
    await storage.delete('pyramids', pyramidId);
};

export const duplicatePyramid = async (userId: string, pyramidId: string, workspaceId?: string): Promise<string> => {
    const originalPyramid = await getPyramid(pyramidId);
    if (!originalPyramid) throw new Error("Pyramid not found");

    const id = storage.createId();
    const newPyramidData = {
        id,
        userId: userId,
        workspaceId: workspaceId || originalPyramid.workspaceId || null,
        title: `${originalPyramid.title} (Copy)`,
        context: originalPyramid.context,
        status: originalPyramid.status,
        blocks: originalPyramid.blocks,
        connections: originalPyramid.connections,
        contextSources: originalPyramid.contextSources,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
    };

    await storage.save('pyramids', newPyramidData);
    return id;
};

export const renamePyramid = async (pyramidId: string, newTitle: string): Promise<void> => {
    await storage.update('pyramids', pyramidId, {
        title: newTitle,
        lastModified: new Date().toISOString()
    });
};

export const updatePyramidContextSources = async (pyramidId: string, contextSources: any[]): Promise<void> => {
    await storage.update('pyramids', pyramidId, {
        contextSources: contextSources,
        lastModified: new Date().toISOString()
    });
};

export const updatePyramidBlocks = async (pyramidId: string, blocks: Record<string, Block>): Promise<void> => {
    await storage.update('pyramids', pyramidId, {
        blocks: blocks,
        lastModified: new Date().toISOString()
    });
};

export const updatePyramidContext = async (pyramidId: string, context: string): Promise<void> => {
    await storage.update('pyramids', pyramidId, {
        context: context,
        lastModified: new Date().toISOString()
    });
};
