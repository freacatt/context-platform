import { db } from './firebase';
import { collection, addDoc, getDoc, getDocs, doc, updateDoc, deleteDoc, query, where, onSnapshot, writeBatch } from 'firebase/firestore';
import { Conversation, StoredMessage } from '../types';

const CONVERSATIONS_TABLE = 'conversations';

// Helper to determine subcollection name
const getSubcollectionName = (parentCollection: string) => {
    return parentCollection === 'conversations' ? 'messages' : 'chat';
};

// Helper to map Conversation
const mapConversationFromDB = (data: any, id: string): Conversation | null => {
  if (!data) return null;
  return {
    id: id,
    userId: data.userId || data.user_id, // Support both for migration
    title: data.title,
    createdAt: (data.createdAt || data.created_at) ? new Date(data.createdAt || data.created_at) : null,
    updatedAt: (data.updatedAt || data.updated_at) ? new Date(data.updatedAt || data.updated_at) : null,
  };
};

// Helper to map Message
const mapMessageFromDB = (data: any, id: string): StoredMessage | null => {
  if (!data) return null;
  return {
    id: id,
    userId: data.userId || data.user_id,
    role: data.role,
    content: data.content,
    timestamp: (data.createdAt || data.created_at) ? new Date(data.createdAt || data.created_at) : null,
    metadata: data.metadata || {},
    parentId: data.parentId || data.parent_id,
    parentCollection: data.parentCollection || data.parent_collection
  };
};

/**
 * Create a new conversation
 */
export const createConversation = async (userId: string, title: string = 'New Chat'): Promise<Conversation | null> => {
  if (!userId) return null;

  try {
    const newDoc = {
      userId: userId,
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const docRef = await addDoc(collection(db, CONVERSATIONS_TABLE), newDoc);
    const docSnap = await getDoc(docRef);
    
    return mapConversationFromDB(docSnap.data(), docSnap.id);
  } catch (error) {
    console.error("Error creating conversation:", error);
    throw error;
  }
};

/**
 * Get all conversations for a user
 */
export const subscribeToConversations = (userId: string, callback: (conversations: Conversation[]) => void) => {
  if (!userId) return () => {};

  // Note: Rules check request.auth.uid == userId, so we just need to ensure we query correctly
  // We'll query by userId (camelCase) to match new data, but old data might be hidden if it's user_id
  const q = query(
      collection(db, CONVERSATIONS_TABLE), 
      where('userId', '==', userId)
  );

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const conversations = querySnapshot.docs
        .map(doc => mapConversationFromDB(doc.data(), doc.id))
        .filter((c): c is Conversation => c !== null)
        .sort((a, b) => {
            const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            return dateB - dateA; // Descending order
        });
      callback(conversations);
  }, (error) => {
      console.error("Error subscribing to conversations:", error);
  });

  return () => {
    unsubscribe();
  };
};

/**
 * Update conversation title
 */
export const updateConversationTitle = async (conversationId: string, newTitle: string): Promise<void> => {
  try {
      await updateDoc(doc(db, CONVERSATIONS_TABLE, conversationId), { 
          title: newTitle, 
          updatedAt: new Date().toISOString() 
      });
  } catch (error) {
      console.error("Error updating conversation title:", error);
      throw error;
  }
};

/**
 * Delete a conversation
 */
export const deleteConversation = async (conversationId: string): Promise<void> => {
    try {
        // Delete messages first
        // Messages are in subcollection 'messages' for conversations
        const subcollectionName = getSubcollectionName('conversations');
        const q = query(
            collection(db, CONVERSATIONS_TABLE, conversationId, subcollectionName)
        );
        
        const querySnapshot = await getDocs(q);
        const batch = writeBatch(db);
        
        querySnapshot.forEach((doc) => {
            batch.delete(doc.ref);
        });
        
        // Delete conversation document
        batch.delete(doc(db, CONVERSATIONS_TABLE, conversationId));
        
        await batch.commit();
    } catch (error) {
        console.error("Error deleting conversation:", error);
        throw error;
    }
};

/**
 * Send a message to the chat
 */
export const sendMessage = async (
    userId: string, 
    parentId: string, 
    role: 'user' | 'assistant', 
    content: string, 
    metadata: Record<string, any> = {}, 
    parentCollection: string = 'conversations'
): Promise<void> => {
    if (!userId || !parentId) return;

    const messageData = {
        userId: userId,
        parentId: parentId,
        parentCollection: parentCollection,
        role,
        content,
        metadata,
        createdAt: new Date().toISOString()
    };

    try {
        const subcollectionName = getSubcollectionName(parentCollection);
        await addDoc(collection(db, parentCollection, parentId, subcollectionName), messageData);

        // If this is a conversation, update the updatedAt timestamp
        if (parentCollection === 'conversations') {
            await updateDoc(doc(db, CONVERSATIONS_TABLE, parentId), {
                updatedAt: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error("Error sending message:", error);
        throw error;
    }
};

/**
 * Subscribe to chat messages for a specific context
 */
export const subscribeToChat = (
    userId: string, 
    parentId: string, 
    callback: (messages: StoredMessage[]) => void, 
    parentCollection: string = 'conversations'
) => {
    if (!userId || !parentId) return () => {};

    const subcollectionName = getSubcollectionName(parentCollection);
    const q = query(
        collection(db, parentCollection, parentId, subcollectionName),
        where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const messages = querySnapshot.docs
            .map(doc => mapMessageFromDB(doc.data(), doc.id))
            .filter((m): m is StoredMessage => m !== null)
            .sort((a, b) => {
                const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                return dateA - dateB;
            });
            
        // We only take the last 50 messages after sorting
        const recentMessages = messages.slice(-50);
        
        callback(recentMessages);
    }, (error) => {
        console.error("Error subscribing to chat:", error);
    });

    return () => {
        unsubscribe();
    };
};

/**
 * Clear all chat history for a context
 */
export const clearChatHistory = async (userId: string, parentId: string, parentCollection: string = 'conversations'): Promise<void> => {
    if (!userId || !parentId) return;

    try {
        const subcollectionName = getSubcollectionName(parentCollection);
        const q = query(
            collection(db, parentCollection, parentId, subcollectionName)
        );
        
        const querySnapshot = await getDocs(q);
        const batch = writeBatch(db);
        
        querySnapshot.forEach((doc) => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
    } catch (error) {
        console.error("Error clearing chat history:", error);
        throw error;
    }
};
