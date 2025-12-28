import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc, 
  getDoc,
  serverTimestamp,
  updateDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { createBlock } from '../utils/pyramidLayout';

// Create a new pyramid
export const createPyramid = async (userId, title, context) => {
  try {
    // Create an 8x8 grid of blocks
    const blocks = {};
    for (let u = 0; u < 8; u++) {
      for (let v = 0; v < 8; v++) {
        const block = createBlock(u, v, 'question');
        blocks[block.id] = block;
      }
    }

    const pyramidData = {
      userId,
      title,
      context,
      createdAt: serverTimestamp(),
      lastModified: serverTimestamp(),
      status: 'in_progress',
      blocks: blocks,
      connections: []
    };

    const docRef = await addDoc(collection(db, 'pyramids'), pyramidData);
    return docRef.id;
  } catch (error) {
    console.error("Error creating pyramid: ", error);
    throw error;
  }
};

// Get a single pyramid
export const getPyramid = async (pyramidId) => {
  try {
    const docRef = doc(db, 'pyramids', pyramidId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error("Pyramid not found");
    }
  } catch (error) {
    console.error("Error fetching pyramid: ", error);
    throw error;
  }
};

// Subscribe to pyramid updates
export const subscribeToPyramid = (pyramidId, onUpdate) => {
  const docRef = doc(db, 'pyramids', pyramidId);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate({ id: docSnap.id, ...docSnap.data() });
    } else {
      onUpdate(null);
    }
  });
};

// Update pyramid blocks (save state)
export const updatePyramidBlocks = async (pyramidId, blocks) => {
  try {
    const docRef = doc(db, 'pyramids', pyramidId);
    await updateDoc(docRef, {
      blocks,
      lastModified: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating pyramid blocks: ", error);
    throw error;
  }
};

// Update pyramid context
export const updatePyramidContext = async (pyramidId, context) => {
  try {
    const docRef = doc(db, 'pyramids', pyramidId);
    await updateDoc(docRef, {
      context,
      lastModified: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating pyramid context: ", error);
    throw error;
  }
};

// Duplicate an existing pyramid
export const duplicatePyramid = async (userId, pyramidId) => {
  try {
    // 1. Get original pyramid
    const originalRef = doc(db, 'pyramids', pyramidId);
    const originalSnap = await getDoc(originalRef);
    
    if (!originalSnap.exists()) {
      throw new Error("Pyramid not found");
    }

    const originalData = originalSnap.data();

    // 2. Prepare new data
    const newData = {
      ...originalData,
      userId, // Ensure current user owns the copy
      title: `${originalData.title} (Copy)`,
      createdAt: serverTimestamp(),
      lastModified: serverTimestamp()
    };

    // 3. Create new document
    const docRef = await addDoc(collection(db, 'pyramids'), newData);
    return { id: docRef.id, ...newData }; // Return mock data for UI update
  } catch (error) {
    console.error("Error duplicating pyramid: ", error);
    throw error;
  }
};

// Get all pyramids for a user
export const getUserPyramids = async (userId) => {
  try {
    const q = query(
      collection(db, 'pyramids'), 
      where("userId", "==", userId)
      // orderBy("createdAt", "desc") // Removed to avoid index requirements during dev
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching pyramids: ", error);
    throw error;
  }
};

// Delete a pyramid
export const deletePyramid = async (pyramidId) => {
  try {
    await deleteDoc(doc(db, 'pyramids', pyramidId));
  } catch (error) {
    console.error("Error deleting pyramid: ", error);
    throw error;
  }
};
