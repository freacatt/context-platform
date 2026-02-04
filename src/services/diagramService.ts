import { storage } from './storage';
import { Diagram } from '../types';

const mapDiagramFromStorage = (data: any): Diagram => {
    return {
        id: data.id,
        userId: data.userId,
        workspaceId: data.workspaceId,
        title: data.title,
        createdAt: data.createdAt ? (typeof data.createdAt === 'string' ? new Date(data.createdAt) : new Date(data.createdAt.seconds * 1000)) : null,
        lastModified: data.lastModified ? (typeof data.lastModified === 'string' ? new Date(data.lastModified) : new Date(data.lastModified.seconds * 1000)) : null,
        nodes: data.nodes || [],
        edges: data.edges || []
    };
};

export const createDiagram = async (userId: string, title: string = "New Diagram", workspaceId?: string): Promise<string | null> => {
    if (!userId) return null;

    const id = storage.createId();
    const diagramData = {
        id,
        userId: userId,
        workspaceId: workspaceId || undefined,
        title,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        nodes: [],
        edges: []
    };

    try {
        await storage.save('diagrams', diagramData);
        return id;
    } catch (e) {
        console.error("Error creating diagram: ", e);
        return null;
    }
};

export const getUserDiagrams = async (userId: string, workspaceId?: string): Promise<Diagram[]> => {
    try {
        const results = await storage.query('diagrams', { userId, workspaceId });
        return results.map(mapDiagramFromStorage);
    } catch (e) {
        console.error("Error fetching diagrams: ", e);
        return [];
    }
};

export const getDiagram = async (id: string): Promise<Diagram | null> => {
    try {
        const data = await storage.get('diagrams', id);
        if (data) {
            return mapDiagramFromStorage(data);
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
        await storage.update('diagrams', id, {
            ...updates,
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
        await storage.delete('diagrams', id);
        return true;
    } catch (e) {
        console.error("Error deleting diagram: ", e);
        return false;
    }
};
