import { db } from './firebase';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, getDocs, writeBatch, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';

const CHAT_COLLECTION = 'chat';
const CONVERSATIONS_COLLECTION = 'conversations';
const MESSAGES_SUBCOLLECTION = 'messages';

/**
 * Create a new conversation
 */
export const createConversation = async (userId, title = 'New Chat') => {
  if (!userId) return null;
  
  const docRef = await addDoc(collection(db, CONVERSATIONS_COLLECTION), {
    userId,
    title,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  return { id: docRef.id, title, userId };
};

/**
 * Get all conversations for a user
 */
export const subscribeToConversations = (userId, callback) => {
  if (!userId) return () => {};

  const q = query(
    collection(db, CONVERSATIONS_COLLECTION),
    where('userId', '==', userId)
    // orderBy('updatedAt', 'desc') // Removed to avoid index requirement
  );

  return onSnapshot(q, (snapshot) => {
    const conversations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    // Client-side sort
    conversations.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis() || 0;
        const timeB = b.updatedAt?.toMillis() || 0;
        return timeB - timeA;
    });
    callback(conversations);
  });
};

/**
 * Update conversation title
 */
export const updateConversationTitle = async (conversationId, newTitle) => {
    const docRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    await updateDoc(docRef, { title: newTitle });
};

/**
 * Delete a conversation
 */
export const deleteConversation = async (conversationId) => {
    await deleteDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId));
};

/**
 * Send a message to the chat (Supports legacy subcollections AND new conversations)
 * 
 * @param {string} userId - Current user ID
 * @param {string} parentId - ID of the parent (Pyramid ID, User ID, or Conversation ID)
 * @param {string} role - 'user' or 'assistant'
 * @param {string} content - Message content
 * @param {Object} metadata - Optional metadata (e.g., tokens, model)
 * @param {string} parentCollection - Parent collection name ('pyramids', 'users', 'conversations')
 */
export const sendMessage = async (userId, parentId, role, content, metadata = {}, parentCollection = 'conversations') => {
  if (!userId || !parentId) return;

  // Determine subcollection name based on parent collection
  // Legacy: 'chat'
  // New: 'messages' for 'conversations'
  const subcollectionName = parentCollection === 'conversations' ? MESSAGES_SUBCOLLECTION : CHAT_COLLECTION;

  const chatRef = collection(db, `${parentCollection}/${parentId}/${subcollectionName}`);
  
  await addDoc(chatRef, {
    userId,
    role,
    content,
    timestamp: serverTimestamp(),
    metadata,
  });

  // If this is a conversation, update the updatedAt timestamp and title if it's the first user message
  if (parentCollection === 'conversations') {
      const conversationRef = doc(db, CONVERSATIONS_COLLECTION, parentId);
      const updateData = { updatedAt: serverTimestamp() };
      
      // If it's the first user message, update title
      // We can check if title is 'New Chat' or pass a flag, but for now simple update is fine
      // Or we can let the UI handle title updates
      await updateDoc(conversationRef, updateData);
  }
};

/**
 * Subscribe to chat messages for a specific context
 * 
 * @param {string} userId 
 * @param {string} parentId 
 * @param {Function} callback - Function to receive messages array
 * @param {string} parentCollection - Parent collection name (default: 'conversations')
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToChat = (userId, parentId, callback, parentCollection = 'conversations') => {
  if (!userId || !parentId) return () => {};

  const subcollectionName = parentCollection === 'conversations' ? MESSAGES_SUBCOLLECTION : CHAT_COLLECTION;

  const chatRef = collection(db, `${parentCollection}/${parentId}/${subcollectionName}`);
  const q = query(chatRef, orderBy('timestamp', 'asc'), limit(50));

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(messages);
  });
};

/**
 * Clear all chat history for a context
 * 
 * @param {string} userId 
 * @param {string} parentId 
 * @param {string} parentCollection - Parent collection name
 */
export const clearChatHistory = async (userId, parentId, parentCollection = 'conversations') => {
  if (!userId || !parentId) return;

  const subcollectionName = parentCollection === 'conversations' ? MESSAGES_SUBCOLLECTION : CHAT_COLLECTION;

  const chatRef = collection(db, `${parentCollection}/${parentId}/${subcollectionName}`);
  const snapshot = await getDocs(chatRef);
  
  const batch = writeBatch(db);
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
};
