import { storage } from './storage';
import { ContextSource } from '../types';

const SETTINGS_COLLECTION = 'userSettings';

export const saveUserGlobalContext = async (userId: string, selectedSources: ContextSource[]): Promise<void> => {
    try {
        // We need to preserve existing settings if any
        const existingSettings = await storage.get(SETTINGS_COLLECTION, userId) || {};
        
        const newSettings = {
            ...existingSettings,
            id: userId,
            userId: userId,
            globalContextSources: selectedSources,
            lastUpdated: new Date().toISOString()
        };

        await storage.save(SETTINGS_COLLECTION, newSettings);
    } catch (error) {
        console.error("Error saving user global context:", error);
        throw error;
    }
};

export const getUserGlobalContext = async (userId: string): Promise<ContextSource[] | null> => {
    try {
        const data = await storage.get(SETTINGS_COLLECTION, userId);

        if (data && data.globalContextSources) {
            console.log("getUserGlobalContext: Data found:", data.globalContextSources);
            return data.globalContextSources as ContextSource[];
        } else {
            console.log("getUserGlobalContext: User settings not found or no global context");
            return null;
        }
    } catch (error) {
        console.error("Error fetching user global context:", error);
        throw error;
    }
};
