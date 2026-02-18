import { db } from './firebase';
import { localDB } from './localDB';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs, query, where, Timestamp, onSnapshot } from 'firebase/firestore';
import { auth } from './firebase';
import { nanoid } from 'nanoid';
import { liveQuery } from 'dexie';

// Storage Settings Keys
const SETTINGS_SAVE_LOCALLY = 'settings_saveLocally';
const SETTINGS_SAVE_TO_CLOUD = 'settings_saveToCloud';
const IS_GUEST_KEY = 'auth_isGuest';

// Helper to get settings
export const getStorageSettings = () => {
  const isGuest = localStorage.getItem(IS_GUEST_KEY) === 'true';
  // Default: Guest -> Local=true, Cloud=false. LoggedIn -> Local=true, Cloud=true (or user pref)
  const saveLocally = isGuest ? true : (localStorage.getItem(SETTINGS_SAVE_LOCALLY) !== 'false'); // Default true
  const saveToCloud = isGuest ? false : (localStorage.getItem(SETTINGS_SAVE_TO_CLOUD) !== 'false'); // Default true
  
  return { isGuest, saveLocally, saveToCloud };
};

// Generic Document Interface
export interface StorageDocument {
  id: string;
  userId: string;
  workspaceId?: string | null;
  [key: string]: any;
}

// Map Firestore Data to JS
const mapFromFirestore = (docSnap: any) => {
  const data = docSnap.data();
  return { ...data, id: docSnap.id };
};

// Helper to sanitize data for Dexie (remove undefined, convert dates if needed)
const sanitizeForDexie = (data: any) => {
  return JSON.parse(JSON.stringify(data));
};

export const storage = {
  // Generate ID
  createId: () => nanoid(),

  // Save (Create/Update)
  save: async (collectionName: string, data: StorageDocument) => {
    const { isGuest, saveLocally, saveToCloud } = getStorageSettings();
    const userId = auth.currentUser?.uid || (isGuest ? 'guest' : data.userId);
    
    // Ensure userId is set
    const finalData = { ...data, userId };
    
    const promises = [];

    if (saveLocally) {
      // @ts-ignore - Dynamic table access
      const table = localDB[collectionName as keyof typeof localDB];
      if (table) {
        promises.push(table.put(sanitizeForDexie(finalData)));
      } else {
        console.warn(`LocalDB table ${collectionName} not found`);
      }
    }

    if (saveToCloud && auth.currentUser) {
      const docRef = doc(db, collectionName, finalData.id);
      promises.push(setDoc(docRef, finalData));
    }

    await Promise.all(promises);
    return finalData.id;
  },

  // Update (Partial)
  update: async (collectionName: string, id: string, data: Partial<StorageDocument>) => {
    const { saveLocally, saveToCloud } = getStorageSettings();
    const promises = [];

    if (saveLocally) {
      // @ts-ignore
      const table = localDB[collectionName as keyof typeof localDB];
      if (table) {
        promises.push(table.update(id, sanitizeForDexie(data)));
      }
    }

    if (saveToCloud && auth.currentUser) {
      const docRef = doc(db, collectionName, id);
      promises.push(updateDoc(docRef, data));
    }

    await Promise.all(promises);
  },

  // Get
  get: async (collectionName: string, id: string): Promise<any | null> => {
    const { saveLocally, saveToCloud } = getStorageSettings();
    
    // Try local first if enabled (faster)
    if (saveLocally) {
      // @ts-ignore
      const table = localDB[collectionName as keyof typeof localDB];
      if (table) {
        const item = await table.get(id);
        if (item) return item;
      }
    }

    // Try cloud
    if (saveToCloud && auth.currentUser) {
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = mapFromFirestore(docSnap);
        // Optional: Sync back to local if found in cloud but not local
        if (saveLocally) {
             // @ts-ignore
            const table = localDB[collectionName as keyof typeof localDB];
            if (table) table.put(sanitizeForDexie(data));
        }
        return data;
      }
    }

    return null;
  },

  // Delete
  delete: async (collectionName: string, id: string) => {
    const { saveLocally, saveToCloud } = getStorageSettings();
    const promises = [];

    if (saveLocally) {
       // @ts-ignore
       const table = localDB[collectionName as keyof typeof localDB];
       if (table) promises.push(table.delete(id));
    }

    if (saveToCloud && auth.currentUser) {
      promises.push(deleteDoc(doc(db, collectionName, id)));
    }

    await Promise.all(promises);
  },

  // Query (Flexible filters)
  query: async (collectionName: string, filters: Record<string, any>) => {
    const { isGuest, saveLocally, saveToCloud } = getStorageSettings();
    
    // Auto-scope to current user if not specified to prevent data leakage
    const currentUserId = auth.currentUser?.uid || (isGuest ? 'guest' : undefined);
    const effectiveFilters = { ...filters };
    if (!effectiveFilters.userId && currentUserId) {
        effectiveFilters.userId = currentUserId;
    }

    let results: any[] = [];
    const ids = new Set();

    // Local Query
    if (saveLocally) {
       // @ts-ignore
       const table = localDB[collectionName as keyof typeof localDB];
       if (table) {
         let dexieCollection;
         
         // Optimization: Use userId index if available in filters
         if (effectiveFilters.userId) {
            dexieCollection = table.where('userId').equals(effectiveFilters.userId);
         } else {
            dexieCollection = table.toCollection();
         }

         // Apply all filters
         const localItems = await dexieCollection.filter((item: any) => {
             return Object.entries(effectiveFilters).every(([key, value]) => {
                 return item[key] === value;
             });
         }).toArray();

         localItems.forEach((item: any) => {
           results.push(item);
           ids.add(item.id);
         });
       }
    }

    // Cloud Query
    if (saveToCloud && auth.currentUser) {
      const constraints = Object.entries(effectiveFilters).map(([key, value]) => where(key, '==', value));
      const q = query(collection(db, collectionName), ...constraints);
      
      const snapshot = await getDocs(q);
      snapshot.forEach((doc) => {
        if (!ids.has(doc.id)) {
          results.push(mapFromFirestore(doc));
          ids.add(doc.id);
          
          // Sync to local
          if (saveLocally) {
             // @ts-ignore
             const table = localDB[collectionName as keyof typeof localDB];
             if (table) table.put(sanitizeForDexie(mapFromFirestore(doc)));
          }
        }
      });
    }

    return results;
  },

  // Subscribe (Real-time updates for single doc)
  subscribe: (collectionName: string, id: string, onUpdate: (data: any) => void) => {
    const { saveLocally, saveToCloud } = getStorageSettings();
    const unsubscribers: (() => void)[] = [];

    // Local Subscription
    if (saveLocally) {
      // @ts-ignore
      const table = localDB[collectionName as keyof typeof localDB];
      if (table) {
        const subscription = liveQuery(() => table.get(id)).subscribe(
          (data) => {
            if (data && !saveToCloud) onUpdate(data);
          },
          (error) => console.error(`LocalDB subscription error for ${collectionName}:`, error)
        );
        unsubscribers.push(() => subscription.unsubscribe());
      }
    }

    // Cloud Subscription
    if (saveToCloud && auth.currentUser) {
       const unsubscribeFirestore = onSnapshot(doc(db, collectionName, id), (docSnap) => {
         if (docSnap.exists()) {
           onUpdate(mapFromFirestore(docSnap));
         }
       }, (error) => console.error(`Firestore subscription error for ${collectionName}:`, error));
       unsubscribers.push(unsubscribeFirestore);
    }

    return () => unsubscribers.forEach(u => u());
  },

  // Subscribe to Query (Real-time updates for list)
  subscribeQuery: (collectionName: string, filters: Record<string, any>, onUpdate: (data: any[]) => void) => {
    const { isGuest, saveLocally, saveToCloud } = getStorageSettings();
    
    // Auto-scope
    const currentUserId = auth.currentUser?.uid || (isGuest ? 'guest' : undefined);
    const effectiveFilters = { ...filters };
    if (!effectiveFilters.userId && currentUserId) {
        effectiveFilters.userId = currentUserId;
    }

    const unsubscribers: (() => void)[] = [];
    
    // Local Subscription
    if (saveLocally) {
       // @ts-ignore
       const table = localDB[collectionName as keyof typeof localDB];
       if (table) {
         const subscription = liveQuery(async () => {
             let dexieCollection;
             if (effectiveFilters.userId) {
                dexieCollection = table.where('userId').equals(effectiveFilters.userId);
             } else {
                dexieCollection = table.toCollection();
             }
             return await dexieCollection.filter((item: any) => {
                 return Object.entries(effectiveFilters).every(([key, value]) => item[key] === value);
             }).toArray();
         }).subscribe(
           (data) => {
             if (!saveToCloud) onUpdate(data);
           },
           (error) => console.error(`LocalDB query subscription error for ${collectionName}:`, error)
         );
         unsubscribers.push(() => subscription.unsubscribe());
       }
    }

    // Cloud Subscription
    if (saveToCloud && auth.currentUser) {
       const constraints = Object.entries(effectiveFilters).map(([key, value]) => where(key, '==', value));
       const q = query(collection(db, collectionName), ...constraints);
       
       const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
         const results = snapshot.docs.map(mapFromFirestore);
         
         // Sync to local
         if (saveLocally) {
             // @ts-ignore
             const table = localDB[collectionName as keyof typeof localDB];
             if (table) {
                 results.forEach(item => table.put(sanitizeForDexie(item)));
             }
         }
         
         onUpdate(results);
       }, (error) => console.error(`Firestore query subscription error for ${collectionName}:`, error));
       
       unsubscribers.push(unsubscribeFirestore);
    }
    
    return () => unsubscribers.forEach(u => u());
  }
};
