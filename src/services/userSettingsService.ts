import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ContextSource } from '../types';

interface GlobalContextSettings {
    selectedSources: ContextSource[];
}

const USERS_COLLECTION = 'users';

export const saveUserGlobalContext = async (userId: string, selectedSources: ContextSource[]): Promise<void> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, userId);
        
        // We use setDoc with merge: true to avoid overwriting other user data if it exists
        // or create the document if it doesn't exist.
        await setDoc(userRef, {
            globalContextSources: selectedSources,
            lastUpdated: new Date()
        }, { merge: true });
    } catch (error) {
        console.error("Error saving user global context:", error);
        throw error;
    }
};

export const getUserGlobalContext = async (userId: string): Promise<ContextSource[] | null> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const data = userSnap.data();
            console.log("getUserGlobalContext: Data found:", data.globalContextSources);
            return (data.globalContextSources as ContextSource[]) || null;
        } else {
            console.log("getUserGlobalContext: User document not found");
            return null;
        }
    } catch (error) {
        console.error("Error fetching user global context:", error);
        throw error;
    }
};
