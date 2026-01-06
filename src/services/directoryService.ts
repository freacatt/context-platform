import { db } from './firebase';
import { collection, addDoc, getDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { Directory, ContextDocument } from '../types';

const TABLE_NAME = 'directories';

const mapDirectoryFromDB = (data: any, id: string): Directory | null => {
  if (!data) return null;
  return {
    id,
    userId: data.userId || data.user_id,
    title: data.title,
    createdAt: (data.createdAt || data.created_at) ? new Date(data.createdAt || data.created_at) : null,
    lastModified: (data.lastModified || data.last_modified) ? new Date(data.lastModified || data.last_modified) : null
  };
};

export const createDirectory = async (userId: string, title: string): Promise<string | null> => {
  if (!userId || !title.trim()) return null;
  const newDir = {
    userId,
    title,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString()
  };
  const ref = await addDoc(collection(db, TABLE_NAME), newDir);
  return ref.id;
};

export const renameDirectory = async (id: string, newTitle: string): Promise<void> => {
  await updateDoc(doc(db, TABLE_NAME, id), {
    title: newTitle,
    lastModified: new Date().toISOString()
  });
};

export const deleteDirectory = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, TABLE_NAME, id));
};

export const getDirectory = async (id: string): Promise<Directory> => {
  const ref = doc(db, TABLE_NAME, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Directory not found');
  return mapDirectoryFromDB(snap.data(), snap.id) as Directory;
};

export const getUserDirectories = async (userId: string): Promise<Directory[]> => {
  const q = query(collection(db, TABLE_NAME), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => mapDirectoryFromDB(d.data(), d.id)).filter((x): x is Directory => x !== null);
};

export const getDirectoryDocuments = async (userId: string, directoryId: string | null): Promise<ContextDocument[]> => {
  const q = directoryId
    ? query(collection(db, 'contextDocuments'), where('userId', '==', userId), where('directoryId', '==', directoryId))
    : query(collection(db, 'contextDocuments'), where('userId', '==', userId), where('directoryId', '==', null));
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
