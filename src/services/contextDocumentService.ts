import { storage } from './storage';
import { ContextDocument } from '../types';

const TABLE_NAME = 'contextDocuments';

// Helper to map storage data to JS object
export const mapDocumentFromStorage = (data: any): ContextDocument | null => {
    if (!data) return null;
    return {
        id: data.id,
        userId: data.userId || data.user_id,
        workspaceId: data.workspaceId,
        title: data.title,
        type: data.type,
        content: data.content,
        notionId: data.notionId || data.notion_id,
        createdAt: (data.createdAt || data.created_at) ? new Date(data.createdAt || data.created_at) : null,
        lastModified: (data.lastModified || data.last_modified) ? new Date(data.lastModified || data.last_modified) : null,
        directoryId: data.directoryId || data.directory_id || null
    };
};

/**
 * Get all context documents for a user
 */
export const getUserContextDocuments = async (userId: string, workspaceId?: string): Promise<ContextDocument[]> => {
  if (!userId) return [];
  try {
    const filters: Record<string, any> = { userId };
    if (workspaceId) {
        filters.workspaceId = workspaceId;
    }
    
    const results = await storage.query(TABLE_NAME, filters);
    return results.map(mapDocumentFromStorage).filter((doc): doc is ContextDocument => doc !== null);
  } catch (error) {
      console.error("Error fetching documents:", error);
      throw error;
  }
};

/**
 * Create a new context document
 */
export const createContextDocument = async (userId: string, title: string = "New Context Document", type: string = "text", workspaceId?: string): Promise<string | null> => {
  if (!userId) return null;

  const id = storage.createId();
  const newDoc = {
    id,
    userId: userId,
    workspaceId: workspaceId || null,
    title,
    type,
    content: "", 
    notionId: "",
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    directoryId: null
  };

  try {
      await storage.save(TABLE_NAME, newDoc);
      return id;
  } catch (error) {
      console.error("Error creating document:", error);
      throw error;
  }
};

/**
 * Get a single context document
 */
export const getContextDocument = async (id: string): Promise<ContextDocument> => {
  try {
      const data = await storage.get(TABLE_NAME, id);

      if (!data) {
          throw new Error("Document not found");
      }

      return mapDocumentFromStorage(data) as ContextDocument;
  } catch (error: any) {
      if (error?.code !== 'permission-denied' && !error?.message?.includes('Missing or insufficient permissions')) {
          console.error("Error fetching document:", error);
      }
      throw error;
  }
};

/**
 * Update a context document
 */
export const updateContextDocument = async (id: string, data: Partial<ContextDocument>) => {
  // Map partial update data
  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.notionId !== undefined) updateData.notionId = data.notionId;
  if (data.directoryId !== undefined) updateData.directoryId = data.directoryId;
  
  updateData.lastModified = new Date().toISOString();

  try {
      await storage.update(TABLE_NAME, id, updateData);
  } catch (error) {
      console.error("Error updating document:", error);
      throw error;
  }
};

/**
 * Delete a context document
 */
export const deleteContextDocument = async (id: string): Promise<void> => {
  try {
      await storage.delete(TABLE_NAME, id);
  } catch (error) {
      console.error("Error deleting document:", error);
      throw error;
  }
};

/**
 * Rename a context document
 */
export const renameContextDocument = async (id: string, newTitle: string): Promise<void> => {
    try {
        await storage.update(TABLE_NAME, id, {
            title: newTitle,
            lastModified: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error renaming document:", error);
        throw error;
    }
};

export const assignContextDocumentToDirectory = async (id: string, directoryId: string | null): Promise<void> => {
  try {
    await storage.update(TABLE_NAME, id, {
      directoryId: directoryId || null,
      lastModified: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error assigning document to directory:", error);
    throw error;
  }
};
