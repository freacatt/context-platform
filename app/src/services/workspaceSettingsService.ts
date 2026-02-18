import { storage } from './storage';
import { ContextSource } from '../types';

const WORKSPACES_COLLECTION = 'workspaces';

export const saveWorkspaceGlobalContext = async (workspaceId: string, selectedSources: ContextSource[]): Promise<void> => {
    try {
        await storage.update(WORKSPACES_COLLECTION, workspaceId, {
            globalContextSources: selectedSources,
            lastGlobalContextUpdate: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error saving workspace global context:", error);
        throw error;
    }
};

export const getWorkspaceGlobalContext = async (workspaceId: string): Promise<ContextSource[] | null> => {
    try {
        const data = await storage.get(WORKSPACES_COLLECTION, workspaceId);

        if (data && data.globalContextSources) {
            console.log("getWorkspaceGlobalContext: Data found:", data.globalContextSources);
            return data.globalContextSources as ContextSource[];
        } else {
            console.log("getWorkspaceGlobalContext: Workspace document not found or no global context");
            return null;
        }
    } catch (error) {
        console.error("Error fetching workspace global context:", error);
        throw error;
    }
};
