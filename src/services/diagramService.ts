import { db } from './firebase';
import { collection, addDoc, getDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { Diagram } from '../types';

const TABLE_NAME = 'diagrams';

// Helper to remove undefined values from objects (Firestore doesn't like them)
const sanitizeData = (data: any): any => {
    if (Array.isArray(data)) {
        return data.map(item => sanitizeData(item));
    } else if (data !== null && typeof data === 'object') {
        const newObj: any = {};
        Object.keys(data).forEach(key => {
            const value = data[key];
            if (value !== undefined) {
                newObj[key] = sanitizeData(value);
            }
        });
        return newObj;
    }
    return data;
};

const mapDiagramFromDB = (data: any, id: string): Diagram | null => {
    if (!data) return null;
    return {
        id: id,
        userId: data.userId,
        title: data.title,
        createdAt: data.createdAt ? (typeof data.createdAt === 'string' ? new Date(data.createdAt) : data.createdAt.toDate()) : null,
        lastModified: data.lastModified ? (typeof data.lastModified === 'string' ? new Date(data.lastModified) : data.lastModified.toDate()) : null,
        nodes: data.nodes || [],
        edges: data.edges || []
    };
};

export const createDiagram = async (userId: string, title: string = "New Diagram"): Promise<string | null> => {
    if (!userId) return null;

    const defaultDiagram: Omit<Diagram, 'id'> = {
        userId: userId,
        title,
        createdAt: new Date(),
        lastModified: new Date(),
        nodes: [],
        edges: []
    };

    try {
        // Convert dates to strings for Firestore if needed, or let SDK handle it. 
        // Using serverTimestamp() is better but let's stick to simple Date objects for now or ISO strings.
        // The mapping above handles both.
        const docRef = await addDoc(collection(db, TABLE_NAME), {
            ...defaultDiagram,
            createdAt: defaultDiagram.createdAt?.toISOString(),
            lastModified: defaultDiagram.lastModified?.toISOString()
        });
        return docRef.id;
    } catch (e) {
        console.error("Error creating diagram: ", e);
        return null;
    }
};

export const getUserDiagrams = async (userId: string): Promise<Diagram[]> => {
    try {
        const q = query(collection(db, TABLE_NAME), where("userId", "==", userId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => mapDiagramFromDB(doc.data(), doc.id)!).filter(Boolean);
    } catch (e) {
        console.error("Error fetching diagrams: ", e);
        return [];
    }
};

export const getDiagram = async (id: string): Promise<Diagram | null> => {
    try {
        const docRef = doc(db, TABLE_NAME, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return mapDiagramFromDB(docSnap.data(), docSnap.id);
        }
        return null;
    } catch (e: any) {
        if (e?.code !== 'permission-denied') {
            console.error("Error fetching diagram: ", e);
        }
        return null;
    }
};

export const updateDiagram = async (id: string, updates: Partial<Diagram>): Promise<boolean> => {
    try {
        const docRef = doc(db, TABLE_NAME, id);
        
        // Exclude id from updates if present
        const { id: _, ...dataToUpdate } = updates as any;
        
        // Sanitize data to remove undefined values before saving to Firestore
        const sanitizedData = sanitizeData(dataToUpdate);
        
        await updateDoc(docRef, {
            ...sanitizedData,
            lastModified: new Date().toISOString()
        });
        return true;
    } catch (e) {
        console.error("Error updating diagram: ", e);
        return false;
    }
};

export const deleteDiagram = async (id: string): Promise<boolean> => {
    try {
        const docRef = doc(db, TABLE_NAME, id);
        await deleteDoc(docRef);
        return true;
    } catch (e) {
        console.error("Error deleting diagram: ", e);
        return false;
    }
};
