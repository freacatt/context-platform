import { db } from '../firebase.js';
import { z } from "zod";

export interface ResourceItem {
  id: string;
  type: string;
  title: string;
  updatedAt: string;
}

const COLLECTIONS = [
  'pyramids',
  'productDefinitions',
  'contextDocuments',
  'technicalArchitectures',
  'technicalTasks',
  'uiUxArchitectures',
  'diagrams'
];

export const searchResources = async (workspaceId: string, query: string): Promise<ResourceItem[]> => {
  const results: ResourceItem[] = [];
  const lowerQuery = query.toLowerCase();

  // Parallel queries to all collections
  // Note: Firestore doesn't support full-text search natively without extensions like Algolia.
  // We will do a simple fetch of recent items and filter in memory for this MVP, 
  // or use basic startAt/endAt if we had a normalized index.
  // Given the "Workspace" scope, the data volume might be manageable for in-memory filtering of metadata.
  
  const promises = COLLECTIONS.map(async (collectionName) => {
    try {
      const snapshot = await db.collection(collectionName)
        .where('workspaceId', '==', workspaceId)
        .select('title', 'lastModified', 'createdAt') // Select only needed fields
        .get();

      snapshot.forEach((doc: any) => {
        const data = doc.data();
        const title = data.title || "Untitled";
        
        if (title.toLowerCase().includes(lowerQuery)) {
          results.push({
            id: doc.id,
            type: collectionName.slice(0, -1), // singularize loosely
            title: title,
            updatedAt: data.lastModified || data.createdAt || new Date().toISOString()
          });
        }
      });
    } catch (e) {
      console.error(`Error searching ${collectionName}:`, e);
    }
  });

  await Promise.all(promises);
  return results.slice(0, 20); // Limit results
};

export const readResource = async (workspaceId: string, resourceId: string, resourceType: string): Promise<string | null> => {
  // Try to map singular type back to collection name
  let collectionName = resourceType + 's';
  if (resourceType === 'contextDocument') collectionName = 'contextDocuments';
  if (resourceType === 'productDefinition') collectionName = 'productDefinitions';
  if (resourceType === 'technicalArchitecture') collectionName = 'technicalArchitectures';
  if (resourceType === 'technicalTask') collectionName = 'technicalTasks';
  if (resourceType === 'uiUxArchitecture') collectionName = 'uiUxArchitectures';
  
  // Fallback check if simple plural didn't work (though above covers most)
  if (!COLLECTIONS.includes(collectionName)) {
     // Try finding the document in all collections if type is ambiguous
     // For now, we enforce type to be accurate.
  }

  try {
    const doc = await db.collection(collectionName).doc(resourceId).get();
    
    if (!doc.exists) return null;
    
    const data = doc.data();
    if (data?.workspaceId !== workspaceId) return null; // Security check

    // Format content based on type
    if (resourceType === 'pyramid') {
        return `Title: ${data?.title}\n\nContext: ${data?.context}\n\nBlocks: ${JSON.stringify(data?.blocks, null, 2)}`;
    }
    if (resourceType === 'productDefinition') {
        return JSON.stringify(data?.data, null, 2);
    }
    if (resourceType === 'contextDocument' || resourceType === 'technicalArchitecture') {
        return data?.content || "";
    }
    
    return JSON.stringify(data, null, 2);

  } catch (e) {
    console.error(`Error reading resource ${resourceId}:`, e);
    throw new Error(`Failed to read resource: ${e}`);
  }
};
