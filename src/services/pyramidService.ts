import { db } from './firebase';
import { collection, addDoc, getDoc, getDocs, doc, updateDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import { createBlock, Block } from '../utils/pyramidLayout';
import { Pyramid } from '../types';

// Helper to map DB snake_case to JS camelCase
const mapPyramidFromDB = (data: any, id: string): Pyramid | null => {
    if (!data) return null;
    return {
        id: id,
        userId: data.userId || data.user_id,
        title: data.title,
        context: data.context,
        createdAt: (data.createdAt || data.created_at) ? new Date(data.createdAt || data.created_at) : null,
        lastModified: (data.lastModified || data.last_modified) ? new Date(data.lastModified || data.last_modified) : null,
        status: data.status,
        blocks: data.blocks,
        connections: data.connections,
        contextSources: data.contextSources || data.context_sources
    };
};

// Create a new pyramid
export const createPyramid = async (userId: string, title: string, context: string | null = null): Promise<string> => {
  try {
    // Create an 8x8 grid of blocks
    const blocks: Record<string, Block> = {};
    for (let u = 0; u < 8; u++) {
      for (let v = 0; v < 8; v++) {
        const block = createBlock(u, v, 'question');
        blocks[block.id] = block;
      }
    }

    const pyramidData = {
      userId: userId,
      title,
      context,
      status: 'in_progress',
      blocks: blocks,
      connections: [],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'pyramids'), pyramidData);
    return docRef.id;
  } catch (error) {
    console.error("Error creating pyramid: ", error);
    throw error;
  }
};

// Get a single pyramid
export const getPyramid = async (pyramidId: string): Promise<Pyramid | null> => {
  try {
    const docRef = doc(db, 'pyramids', pyramidId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
        throw new Error("Pyramid not found");
    }

    return mapPyramidFromDB(docSnap.data(), docSnap.id);
  } catch (error) {
    console.error("Error fetching pyramid: ", error);
    throw error;
  }
};

// Subscribe to pyramid updates
export const subscribeToPyramid = (pyramidId: string, onUpdate: (pyramid: Pyramid | null) => void) => {
  const unsubscribe = onSnapshot(doc(db, 'pyramids', pyramidId), (doc) => {
    if (doc.exists()) {
        onUpdate(mapPyramidFromDB(doc.data(), doc.id));
    } else {
        onUpdate(null);
    }
  }, (error) => {
    console.error("Error subscribing to pyramid:", error);
  });

  return () => {
    unsubscribe();
  };
};

// Get all pyramids for a user
export const getUserPyramids = async (userId: string): Promise<Pyramid[]> => {
    try {
        const q = query(
            collection(db, 'pyramids'), 
            where('userId', '==', userId)
        );
        const querySnapshot = await getDocs(q);
        const pyramids = querySnapshot.docs.map(doc => mapPyramidFromDB(doc.data(), doc.id)).filter((p): p is Pyramid => p !== null);
        
        // Sort in memory
        return pyramids.sort((a, b) => {
            const dateA = a.lastModified ? new Date(a.lastModified).getTime() : 0;
            const dateB = b.lastModified ? new Date(b.lastModified).getTime() : 0;
            return dateB - dateA;
        });
    } catch (error) {
        console.error("Error fetching user pyramids:", error);
        throw error;
    }
};

// Delete a pyramid
export const deletePyramid = async (pyramidId: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, 'pyramids', pyramidId));
    } catch (error) {
        console.error("Error deleting pyramid:", error);
        throw error;
    }
};

// Duplicate a pyramid
export const duplicatePyramid = async (userId: string, pyramidId: string): Promise<string> => {
    try {
        const originalPyramid = await getPyramid(pyramidId);
        if (!originalPyramid) throw new Error("Pyramid not found");

        const newPyramidData = {
            userId: userId,
            title: `${originalPyramid.title} (Copy)`,
            context: originalPyramid.context,
            status: originalPyramid.status,
            blocks: originalPyramid.blocks,
            connections: originalPyramid.connections,
            contextSources: originalPyramid.contextSources,
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, 'pyramids'), newPyramidData);
        return docRef.id;
    } catch (error) {
        console.error("Error duplicating pyramid:", error);
        throw error;
    }
};

// Update pyramid context sources
export const updatePyramidContextSources = async (pyramidId: string, contextSources: any[]): Promise<void> => {
    try {
        await updateDoc(doc(db, 'pyramids', pyramidId), {
            contextSources: contextSources,
            lastModified: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error updating pyramid context sources:", error);
        throw error;
    }
};

// Update pyramid blocks
export const updatePyramidBlocks = async (pyramidId: string, blocks: Record<string, Block>): Promise<void> => {
    try {
        await updateDoc(doc(db, 'pyramids', pyramidId), {
            blocks: blocks,
            lastModified: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error updating pyramid blocks:", error);
        throw error;
    }
};

// Update pyramid context
export const updatePyramidContext = async (pyramidId: string, context: string): Promise<void> => {
    try {
        await updateDoc(doc(db, 'pyramids', pyramidId), {
            context: context,
            lastModified: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error updating pyramid context:", error);
        throw error;
    }
};
