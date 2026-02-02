import { db } from './firebase';
import { collection, addDoc, getDoc, getDocs, doc, updateDoc, deleteDoc, query, where, writeBatch } from 'firebase/firestore';
import { Directory, ContextDocument } from '../types';

const TABLE_NAME = 'directories';

const mapDirectoryFromDB = (data: any, id: string): Directory | null => {
  if (!data) return null;
  return {
    id,
    userId: data.userId || data.user_id,
    workspaceId: data.workspaceId,
    title: data.title || '',
    createdAt: (data.createdAt || data.created_at) ? new Date(data.createdAt || data.created_at) : null,
    lastModified: (data.lastModified || data.last_modified) ? new Date(data.lastModified || data.last_modified) : null
  };
};

export const createDirectory = async (userId: string, title: string, workspaceId?: string): Promise<string | null> => {
  if (!userId || !title.trim()) return null;
  const newDir = {
    userId,
    workspaceId: workspaceId || null,
    title,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString()
  };
  const ref = await addDoc(collection(db, TABLE_NAME), newDir);
  return ref.id;
};

export const renameDirectory = async (id: string, newTitle: string): Promise<void> => {
  console.log(`Renaming directory ${id} to "${newTitle}"`);
  try {
    await updateDoc(doc(db, TABLE_NAME, id), {
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
    const batch = writeBatch(db);

    // 1. Find all documents in this directory belonging to the user
    const q = query(
      collection(db, 'contextDocuments'), 
      where('directoryId', '==', id),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);

    // 2. Update them to have no directory
    snapshot.docs.forEach(docSnap => {
      batch.update(doc(db, 'contextDocuments', docSnap.id), { 
        directoryId: null,
        lastModified: new Date().toISOString()
      });
    });

    // 3. Delete the directory
    batch.delete(doc(db, TABLE_NAME, id));

    // 4. Commit
    await batch.commit();
    console.log(`Successfully deleted directory ${id}`);
  } catch (error) {
    console.error(`Error deleting directory ${id}:`, error);
    throw error;
  }
};

export const getDirectory = async (id: string): Promise<Directory> => {
  const ref = doc(db, TABLE_NAME, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Directory not found');
  return mapDirectoryFromDB(snap.data(), snap.id) as Directory;
};

export const getUserDirectories = async (userId: string, workspaceId?: string): Promise<Directory[]> => {
  let q;
  if (workspaceId) {
    q = query(collection(db, TABLE_NAME), where('workspaceId', '==', workspaceId), where('userId', '==', userId));
  } else {
    q = query(collection(db, TABLE_NAME), where('userId', '==', userId));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => mapDirectoryFromDB(d.data(), d.id)).filter((x): x is Directory => x !== null);
};

export const getDirectoryDocuments = async (userId: string, directoryId: string | null, workspaceId?: string): Promise<ContextDocument[]> => {
  let q;
  if (directoryId) {
    // If directoryId is provided, we filter by directoryId (and optionally userId/workspaceId for security, but directoryId is usually unique enough or we trust it exists)
    // However, for consistency and security, let's keep userId check or workspaceId check.
    // Assuming directory belongs to workspace/user.
    // Existing code: q = directoryId ? query(..., where('userId', ...), where('directoryId', ...)) : ...
    
    if (workspaceId) {
         q = query(collection(db, 'contextDocuments'), where('workspaceId', '==', workspaceId), where('directoryId', '==', directoryId));
    } else {
         q = query(collection(db, 'contextDocuments'), where('userId', '==', userId), where('directoryId', '==', directoryId));
    }
  } else {
    if (workspaceId) {
         q = query(collection(db, 'contextDocuments'), where('workspaceId', '==', workspaceId), where('directoryId', '==', null));
    } else {
         q = query(collection(db, 'contextDocuments'), where('userId', '==', userId), where('directoryId', '==', null));
    }
  }

  const snap = await getDocs(q);
  const mapContextDocumentFromDB = (data: any, id: string): ContextDocument | null => {
    if (!data) return null;
    return {
      id,
      userId: data.userId || data.user_id,
      title: data.title,
      type: data.type,
      content: data.content,
      notionId: data.notionId || data.notion_id,
      createdAt: (data.createdAt || data.created_at) ? new Date(data.createdAt || data.created_at) : null,
      lastModified: (data.lastModified || data.last_modified) ? new Date(data.lastModified || data.last_modified) : null,
      directoryId: data.directoryId || data.directory_id || null
    };
  };
  return snap.docs.map(d => mapContextDocumentFromDB(d.data(), d.id)).filter((x): x is ContextDocument => x !== null);
};
