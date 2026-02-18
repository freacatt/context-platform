import { db, auth } from './firebase';
import { localDB } from './localDB';
import { collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore';
import { useSyncStore } from './syncStore';

// List of collections to sync
// Must match keys in LocalDB and Firestore
const COLLECTIONS_TO_SYNC = [
  'workspaces',
  'pyramids',
  'productDefinitions',
  'contextDocuments',
  'conversations',
  'messages',
  'directories',
  'uiUxArchitectures',
  'diagrams',
  'technicalTasks',
  'pipelines',
  'technicalArchitectures',
  'globalTasks',
  'userSettings'
];

// Helper to sanitize data for Dexie (similar to storage.ts)
const sanitizeForDexie = (data: any) => {
  return JSON.parse(JSON.stringify(data));
};

// Helper to get timestamp from an item
const getItemTimestamp = (item: any): number => {
  if (!item) return 0;
  
  // Try different field names
  const val = item.lastModified || item.updatedAt || item.createdAt || item.timestamp;
  
  if (!val) return 0;

  // Handle Firestore Timestamp
  if (typeof val.toDate === 'function') {
    return val.toDate().getTime();
  }

  // Handle serialized Timestamp (e.g. { seconds: ..., nanoseconds: ... })
  if (val.seconds !== undefined && val.nanoseconds !== undefined) {
    return val.seconds * 1000 + val.nanoseconds / 1000000;
  }

  // Handle Date object
  if (val instanceof Date) {
    return val.getTime();
  }

  // Handle ISO string or timestamp number
  return new Date(val).getTime();
};

export const syncWithServer = async () => {
  const { addLog, setSyncing, setLastSyncTime } = useSyncStore.getState();
  const user = auth.currentUser;

  if (!user) {
    addLog('Cannot sync: No user logged in', 'error');
    return;
  }

  if (useSyncStore.getState().isSyncing) {
      addLog('Sync already in progress', 'warning');
      return;
  }

  setSyncing(true);
  addLog('Starting sync with server...', 'info');

  try {
    let totalPulled = 0;
    let totalPushed = 0;

    for (const collectionName of COLLECTIONS_TO_SYNC) {
      // @ts-ignore
      const table = localDB[collectionName as keyof typeof localDB];
      if (!table) {
          addLog(`Local table not found for ${collectionName}`, 'warning');
          continue;
      }

      // 1. Fetch Cloud Data
      const q = query(collection(db, collectionName), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const cloudMap = new Map();
      snapshot.forEach((docSnap) => {
        cloudMap.set(docSnap.id, { ...docSnap.data(), id: docSnap.id });
      });

      // 2. Fetch Local Data
      const localItems = await table.where('userId').equals(user.uid).toArray();
      const localMap = new Map();
      localItems.forEach((item: any) => localMap.set(item.id, item));

      // 3. PULL: Cloud -> Local
      const itemsToPutLocal: any[] = [];
      let pulledCount = 0;

      for (const [id, cloudData] of cloudMap) {
          const localData = localMap.get(id);
          
          let shouldPull = false;

          if (!localData) {
            // Missing locally -> Pull
            shouldPull = true;
          } else {
            // Exists locally -> Check timestamp
            const cloudTime = getItemTimestamp(cloudData);
            const localTime = getItemTimestamp(localData);
            
            // If cloud is newer (with 1s buffer for clock skew), pull it
            if (cloudTime > localTime + 1000) {
              shouldPull = true;
            }
          }

          if (shouldPull) {
              itemsToPutLocal.push(sanitizeForDexie(cloudData));
              pulledCount++;
          }
      }

      if (itemsToPutLocal.length > 0) {
          await table.bulkPut(itemsToPutLocal);
          totalPulled += itemsToPutLocal.length;
      }

      // 4. PUSH: Local -> Cloud
      let pushedCount = 0;
      for (const [id, localData] of localMap) {
          const cloudData = cloudMap.get(id);
          
          let shouldPush = false;

          if (!cloudData) {
            // Missing in cloud -> Push
            shouldPush = true;
          } else {
            // Exists in cloud -> Check timestamp
            const localTime = getItemTimestamp(localData);
            const cloudTime = getItemTimestamp(cloudData);
            
            // If local is newer (with 1s buffer), push it
            if (localTime > cloudTime + 1000) {
              shouldPush = true;
            }
          }

          if (shouldPush) {
              await setDoc(doc(db, collectionName, id), localData);
              pushedCount++;
          }
      }
      totalPushed += pushedCount;

      if (pulledCount > 0 || pushedCount > 0) {
          addLog(`Synced ${collectionName}: Pulled ${pulledCount}, Pushed ${pushedCount}`, 'success');
      }
    }

    setLastSyncTime(new Date());
    addLog(`Sync completed. Pulled: ${totalPulled}, Pushed: ${totalPushed}`, 'success');
  } catch (error: any) {
    console.error('Sync error:', error);
    addLog(`Sync failed: ${error.message}`, 'error');
  } finally {
    setSyncing(false);
  }
};
