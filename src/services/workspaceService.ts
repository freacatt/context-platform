import { db } from './firebase';
import { collection, addDoc, getDoc, getDocs, doc, deleteDoc, updateDoc, query, where, onSnapshot, getCountFromServer } from 'firebase/firestore';
import { Workspace } from '../types';

const mapWorkspaceFromDB = (data: any, id: string): Workspace | null => {
    if (!data) return null;
    return {
        id: id,
        userId: data.userId,
        name: data.name,
        createdAt: data.createdAt ? new Date(data.createdAt) : null,
        lastModified: data.lastModified ? new Date(data.lastModified) : null,
    };
};

export const createWorkspace = async (userId: string, name: string): Promise<string> => {
  try {
    const workspaceData = {
      userId,
      name,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'workspaces'), workspaceData);
    return docRef.id;
  } catch (error) {
    console.error("Error creating workspace: ", error);
    throw error;
  }
};

export const getWorkspace = async (workspaceId: string): Promise<Workspace | null> => {
  try {
    const docRef = doc(db, 'workspaces', workspaceId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
        return null;
    }

    return mapWorkspaceFromDB(docSnap.data(), docSnap.id);
  } catch (error) {
    console.error("Error fetching workspace: ", error);
    throw error;
  }
};

export const getUserWorkspaces = async (userId: string): Promise<Workspace[]> => {
    try {
        const q = query(
            collection(db, 'workspaces'), 
            where('userId', '==', userId)
        );
        const querySnapshot = await getDocs(q);
        const workspaces = querySnapshot.docs.map(doc => mapWorkspaceFromDB(doc.data(), doc.id)).filter((w): w is Workspace => w !== null);
        
        return workspaces.sort((a, b) => {
             const dateA = a.createdAt?.getTime() || 0;
             const dateB = b.createdAt?.getTime() || 0;
             return dateB - dateA;
        });
    } catch (error) {
        console.error("Error fetching user workspaces: ", error);
        throw error;
    }
};

export const updateWorkspace = async (workspaceId: string, updates: Partial<Workspace>): Promise<void> => {
    try {
        const docRef = doc(db, 'workspaces', workspaceId);
        await updateDoc(docRef, {
            ...updates,
            lastModified: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error updating workspace: ", error);
        throw error;
    }
};

export const deleteWorkspace = async (workspaceId: string, userId: string): Promise<void> => {
    try {
        // cleanup pipelines
        const pipelinesQuery = query(collection(db, 'pipelines'), where('workspaceId', '==', workspaceId), where('userId', '==', userId));
        const pipelinesSnap = await getDocs(pipelinesQuery);
        const batch = db.batch ? db.batch() : null; // Check if batch is available on db instance or need writeBatch
        
        // If we can't get batch directly from db, we might need to import writeBatch
        // But let's just use Promise.all for now if writeBatch isn't imported
        
        const deletePromises = pipelinesSnap.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        await deleteDoc(doc(db, 'workspaces', workspaceId));
    } catch (error) {
        console.error("Error deleting workspace: ", error);
        throw error;
    }
};

export const subscribeToUserWorkspaces = (userId: string, onUpdate: (workspaces: Workspace[]) => void) => {
    const q = query(
        collection(db, 'workspaces'), 
        where('userId', '==', userId)
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const workspaces = querySnapshot.docs.map(doc => mapWorkspaceFromDB(doc.data(), doc.id)).filter((w): w is Workspace => w !== null);
         workspaces.sort((a, b) => {
             const dateA = a.createdAt?.getTime() || 0;
             const dateB = b.createdAt?.getTime() || 0;
             return dateB - dateA;
        });
        onUpdate(workspaces);
    }, (error) => {
        console.error("Error subscribing to workspaces:", error);
    });

    return () => unsubscribe();
};

export const checkWorkspaceEmpty = async (workspaceId: string, userId: string): Promise<boolean> => {
    const collectionsToCheck = [
        'pyramids',
        'productDefinitions',
        'diagrams',
        'contextDocuments',
        'directories',
        'technicalArchitectures',
        'uiUxArchitectures',
        'technicalTasks'
    ];

    try {
        const checks = collectionsToCheck.map(async (collectionName) => {
            const q = query(collection(db, collectionName), where('workspaceId', '==', workspaceId), where('userId', '==', userId));
            const snapshot = await getCountFromServer(q);
            return snapshot.data().count > 0;
        });

        const results = await Promise.all(checks);
        return !results.some(hasItems => hasItems);
    } catch (error) {
        console.error("Error checking workspace emptiness:", error);
        // If we can't check, assume it's NOT empty to be safe
        return false;
    }
};
