import { db } from './firebase';
import { collection, addDoc, getDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { ContextDocument } from '../types';

const TABLE_NAME = 'contextDocuments';

// Helper to map DB snake_case to JS camelCase
export const mapDocumentFromDB = (data: any, id: string): ContextDocument | null => {
    if (!data) return null;
    return {
        id: id,
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
    let q;
    if (workspaceId) {
        q = query(collection(db, TABLE_NAME), where('workspaceId', '==', workspaceId), where('userId', '==', userId));
    } else {
        q = query(collection(db, TABLE_NAME), where('userId', '==', userId));
    }
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => mapDocumentFromDB(doc.data(), doc.id) as ContextDocument);
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

  const newDoc = {
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
      const docRef = await addDoc(collection(db, TABLE_NAME), newDoc);
      return docRef.id;
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
      const docRef = doc(db, TABLE_NAME, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
          throw new Error("Document not found");
      }

      return mapDocumentFromDB(docSnap.data(), docSnap.id) as ContextDocument;
  } catch (error: any) {
      if (error?.code !== 'permission-denied') {
          console.error("Error fetching document:", error);
      }
      throw error;
  }
};

/**
 * Update a context document
 */
export const updateContextDocument = async (id: string, data: Partial<ContextDocument>) => {
  // Map partial update data to snake_case
  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.notionId !== undefined) updateData.notionId = data.notionId;
  if (data.directoryId !== undefined) updateData.directoryId = data.directoryId;
  
  updateData.lastModified = new Date().toISOString();

  try {
      await updateDoc(doc(db, TABLE_NAME, id), updateData);
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
      await deleteDoc(doc(db, TABLE_NAME, id));
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
        await updateDoc(doc(db, TABLE_NAME, id), {
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
    await updateDoc(doc(db, TABLE_NAME, id), {
      directoryId: directoryId || null,
      lastModified: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error assigning document to directory:", error);
    throw error;
  }
};
