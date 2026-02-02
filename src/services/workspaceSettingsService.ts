import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ContextSource } from '../types';

const WORKSPACES_COLLECTION = 'workspaces';

export const saveWorkspaceGlobalContext = async (workspaceId: string, selectedSources: ContextSource[]): Promise<void> => {
    try {
        const workspaceRef = doc(db, WORKSPACES_COLLECTION, workspaceId);
        
        // Save to the workspace document directly
        await setDoc(workspaceRef, {
            globalContextSources: selectedSources,
            lastGlobalContextUpdate: new Date()
        }, { merge: true });
    } catch (error) {
        console.error("Error saving workspace global context:", error);
        throw error;
    }
};

export const getWorkspaceGlobalContext = async (workspaceId: string): Promise<ContextSource[] | null> => {
    try {
        const workspaceRef = doc(db, WORKSPACES_COLLECTION, workspaceId);
        const snap = await getDoc(workspaceRef);

        if (snap.exists()) {
            const data = snap.data();
            console.log("getWorkspaceGlobalContext: Data found:", data.globalContextSources);
            return (data.globalContextSources as ContextSource[]) || null;
        } else {
            console.log("getWorkspaceGlobalContext: Workspace document not found");
            return null;
        }
    } catch (error) {
        console.error("Error fetching workspace global context:", error);
        throw error;
    }
};
