import { storage } from './storage';
import { Directory, ContextDocument } from '../types';

const TABLE_NAME = 'directories';

const mapDirectoryFromStorage = (data: any): Directory | null => {
  if (!data) return null;
  return {
    id: data.id,
    userId: data.userId || data.user_id,
    workspaceId: data.workspaceId,
    title: data.title || '',
    createdAt: (data.createdAt || data.created_at) ? new Date(data.createdAt || data.created_at) : null,
    lastModified: (data.lastModified || data.last_modified) ? new Date(data.lastModified || data.last_modified) : null
  };
};

export const createDirectory = async (userId: string, title: string, workspaceId?: string): Promise<string | null> => {
  if (!userId || !title.trim()) return null;
  
  const id = storage.createId();
  const newDir = {
    id,
    userId,
    workspaceId: workspaceId || null,
    title,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString()
  };
  
  await storage.save(TABLE_NAME, newDir);
  return id;
};

export const renameDirectory = async (id: string, newTitle: string): Promise<void> => {
  console.log(`Renaming directory ${id} to "${newTitle}"`);
  try {
    await storage.update(TABLE_NAME, id, {
      title: newTitle,
      lastModified: new Date().toISOString()
    });
    console.log(`Successfully renamed directory ${id}`);
  } catch (error) {
    console.error(`Error renaming directory ${id}:`, error);
    throw error;
  }
};

export const deleteDirectory = async (id: string, userId: string): Promise<void> => {
  console.log(`Deleting directory ${id} for user ${userId}`);
  try {
    // 1. Find all documents in this directory belonging to the user
    // storage.query supports multiple filters
    const documents = await storage.query('contextDocuments', { 
      directoryId: id, 
      userId: userId 
    });

    // 2. Update them to have no directory
    // Storage adapter doesn't support batch update in the same way Firestore does,
    // so we execute them in parallel.
    const updatePromises = documents.map(doc => 
      storage.update('contextDocuments', doc.id, { 
        directoryId: null,
        lastModified: new Date().toISOString()
      })
    );
    
    await Promise.all(updatePromises);

    // 3. Delete the directory
    await storage.delete(TABLE_NAME, id);

    console.log(`Successfully deleted directory ${id}`);
  } catch (error) {
    console.error(`Error deleting directory ${id}:`, error);
    throw error;
  }
};

export const getDirectory = async (id: string): Promise<Directory> => {
  const data = await storage.get(TABLE_NAME, id);
  if (!data) throw new Error('Directory not found');
  return mapDirectoryFromStorage(data) as Directory;
};

export const getUserDirectories = async (userId: string, workspaceId?: string): Promise<Directory[]> => {
  const filters: Record<string, any> = { userId };
  if (workspaceId) {
    filters.workspaceId = workspaceId;
  }
  
  const results = await storage.query(TABLE_NAME, filters);
  return results.map(mapDirectoryFromStorage).filter((x): x is Directory => x !== null);
};

export const getDirectoryDocuments = async (userId: string, directoryId: string | null, workspaceId?: string): Promise<ContextDocument[]> => {
  const filters: Record<string, any> = { userId };
  if (workspaceId) {
    filters.workspaceId = workspaceId;
  }
  filters.directoryId = directoryId || null; // null matches null in storage query (assuming implementation handles null)
  
  // Note: Firestore 'null' query works. 
  // For localDB (Dexie), ensure that we store null explicitly or handle undefined.
  // storage.query implementation in storage.ts uses strict equality ===, so it should match null if stored as null.
  
  const results = await storage.query('contextDocuments', filters);

  const mapContextDocumentFromStorage = (data: any): ContextDocument | null => {
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
  
  return results.map(mapContextDocumentFromStorage).filter((x): x is ContextDocument => x !== null);
};
