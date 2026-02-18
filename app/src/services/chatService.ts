import { storage } from './storage';
import { Conversation, StoredMessage } from '../types';

const CONVERSATIONS_TABLE = 'conversations';
const MESSAGES_TABLE = 'messages';

// Helper to map Message
const mapMessageFromStorage = (data: any): StoredMessage | null => {
  if (!data) return null;
  return {
    id: data.id,
    userId: data.userId || data.user_id,
    role: data.role,
    content: data.content,
    timestamp: (data.createdAt || data.created_at) ? new Date(data.createdAt || data.created_at) : (data.timestamp ? new Date(data.timestamp) : null),
    metadata: data.metadata || {},
    parentId: data.parentId || data.parent_id,
    parentCollection: data.parentCollection || data.parent_collection
  };
};

// Helper to map Conversation
const mapConversationFromStorage = (data: any): Conversation | null => {
  if (!data) return null;
  return {
    id: data.id,
    userId: data.userId || data.user_id, // Support both for migration
    title: data.title,
    createdAt: (data.createdAt || data.created_at) ? new Date(data.createdAt || data.created_at) : null,
    updatedAt: (data.updatedAt || data.updated_at) ? new Date(data.updatedAt || data.updated_at) : null,
    messages: Array.isArray(data.messages) 
        ? data.messages.map(mapMessageFromStorage).filter((m: any): m is StoredMessage => m !== null)
        : []
  };
};

/**
 * Create a new conversation
 */
export const createConversation = async (userId: string, title: string = 'New Chat'): Promise<Conversation | null> => {
  if (!userId) return null;

  try {
    const id = storage.createId();
    const newDoc = {
      id,
      userId: userId,
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [] // Initialize empty messages array
    };
    
    await storage.save(CONVERSATIONS_TABLE, newDoc);
    return mapConversationFromStorage(newDoc);
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

  return storage.subscribeQuery(CONVERSATIONS_TABLE, { userId }, (results) => {
      const conversations = results
        .map(mapConversationFromStorage)
        .filter((c): c is Conversation => c !== null)
        .sort((a, b) => {
            const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            return dateB - dateA; // Descending order
        });
      callback(conversations);
  });
};

/**
 * Update conversation title
 */
export const updateConversationTitle = async (conversationId: string, newTitle: string): Promise<void> => {
  try {
      await storage.update(CONVERSATIONS_TABLE, conversationId, { 
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
        // Just delete the conversation document (messages are embedded)
        await storage.delete(CONVERSATIONS_TABLE, conversationId);
        
        // Clean up legacy messages (optional, if we want to be thorough)
        // const messages = await storage.query(MESSAGES_TABLE, { parentId: conversationId });
        // const deletePromises = messages.map(msg => storage.delete(MESSAGES_TABLE, msg.id));
        // await Promise.all(deletePromises);
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

    const id = storage.createId();
    const messageData = {
        id,
        userId: userId,
        parentId: parentId,
        parentCollection: parentCollection,
        role,
        content,
        metadata,
        createdAt: new Date().toISOString()
    };

    try {
        if (parentCollection === 'conversations') {
            // New embedded structure
            const conversation = await storage.get(CONVERSATIONS_TABLE, parentId);
            if (conversation) {
                const messages = conversation.messages || [];
                // If existing messages are not in the array (migration case), we might lose them 
                // unless we query them. But assuming we want to move forward:
                
                messages.push(messageData);
                
                await storage.update(CONVERSATIONS_TABLE, parentId, {
                    messages,
                    updatedAt: new Date().toISOString()
                });
            }
        } else {
            // Legacy/Other collection support (e.g. comments)
            await storage.save(MESSAGES_TABLE, messageData);
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

    if (parentCollection === 'conversations') {
        // Subscribe to the conversation document
        return storage.subscribe(CONVERSATIONS_TABLE, parentId, (data) => {
            const conv = mapConversationFromStorage(data);
            if (conv) {
                const messages = (conv.messages || []).sort((a, b) => {
                    const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                    const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                    return dateA - dateB;
                });
                callback(messages);
            } else {
                callback([]);
            }
        });
    } else {
        // Legacy subscription for other collections
        const filters = {
            userId,
            parentId
        };

        return storage.subscribeQuery(MESSAGES_TABLE, filters, (results) => {
            const messages = results
                .map(mapMessageFromStorage)
                .filter((m): m is StoredMessage => m !== null)
                .sort((a, b) => {
                    const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                    const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                    return dateA - dateB;
                });
                
            const recentMessages = messages.slice(-50);
            callback(recentMessages);
        });
    }
};

/**
 * Clear all chat history for a context
 */
export const clearChatHistory = async (userId: string, parentId: string, parentCollection: string = 'conversations'): Promise<void> => {
    if (!userId || !parentId) return;

    try {
        if (parentCollection === 'conversations') {
            await storage.update(CONVERSATIONS_TABLE, parentId, {
                messages: [],
                updatedAt: new Date().toISOString()
            });
        } else {
            const messages = await storage.query(MESSAGES_TABLE, { userId, parentId });
            const deletePromises = messages.map(msg => storage.delete(MESSAGES_TABLE, msg.id));
            await Promise.all(deletePromises);
        }
    } catch (error) {
        console.error("Error clearing chat history:", error);
        throw error;
    }
};
