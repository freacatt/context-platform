import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalContext } from '../contexts/GlobalContext';
import { 
  subscribeToConversations, 
  subscribeToChat, 
  createConversation, 
  deleteConversation,
  sendMessage
} from '../services/chatService';
import { sendGlobalChatMessage } from '../services/anthropic';
import { Conversation as ConversationType, StoredMessage } from '../types';
import { Plus, MessageSquare, Trash2, Bot, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

// AI Elements Imports
import { 
  Conversation, 
  ConversationContent, 
  ConversationEmptyState 
} from '../components/ai-elements/conversation';
import { 
  Message, 
  MessageContent, 
  MessageResponse
} from '../components/ai-elements/message';
import { 
  PromptInput, 
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTools,
} from '../components/ai-elements/prompt-input';

const AiChatPage: React.FC = () => {
  const { user, apiKey } = useAuth();
  const { aggregatedContext: globalContext } = useGlobalContext();
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [conversations, setConversations] = useState<ConversationType[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Subscribe to conversations list
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToConversations(user.uid, (convs) => {
      setConversations(convs);
      if (!activeConversationId && convs.length > 0) {
        const sorted = [...convs].sort((a, b) => {
            const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            return dateB - dateA;
        });
        if (sorted.length > 0) {
            setActiveConversationId(sorted[0].id);
        }
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Subscribe to chat messages for active conversation
  useEffect(() => {
    if (!user || !activeConversationId) {
        setMessages([]);
        return;
    }
    const unsubscribe = subscribeToChat(user.uid, activeConversationId, (msgs) => {
      setMessages(msgs);
    }, 'conversations');
    return () => unsubscribe();
  }, [user, activeConversationId]);

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    if (window.confirm("Delete this conversation?")) {
        if (activeConversationId === convId) {
            setActiveConversationId(null);
        }
        await deleteConversation(convId);
    }
  };

  const handleSendMessage = async ({ text }: { text: string }) => {
        if (!text.trim()) return;
        
        setIsRunning(true);
        try {
          let currentConvId = activeConversationId;
          const userMessageContent = text;
          
          if (!currentConvId && user) {
            // Create new conversation first
            const newConv = await createConversation(user.uid, userMessageContent.substring(0, 30) + '...');
            if (newConv) {
                currentConvId = newConv.id;
                setActiveConversationId(newConv.id);
            } else {
                console.error("Failed to create conversation");
                setIsRunning(false);
                return;
            }
          }
          
          if (currentConvId && user && apiKey) {
            // 1. Add user message to Firestore
            await sendMessage(
                user.uid, 
                currentConvId, 
                'user',
                userMessageContent,
                {},
                'conversations'
            );

            // Prepare history for API
            const historyForApi = messages.map(msg => {
                let contentStr = '';
                if (Array.isArray(msg.content)) {
                    contentStr = msg.content.map(c => (c as any).text || '').join('');
                } else if (typeof msg.content === 'string') {
                    contentStr = msg.content;
                }
                return {
                    role: (msg.role === 'conversations' ? 'user' : msg.role) as "user" | "assistant",
                    content: contentStr
                };
            });

            // 2. Call Anthropic API
            const response = await sendGlobalChatMessage(
                apiKey,
                globalContext || "",
                [...historyForApi, { role: 'user', content: userMessageContent }] as any,
                userMessageContent
            );

            // 3. Add assistant response to Firestore
            if (response) {
                await sendMessage(
                    user.uid,
                    currentConvId,
                    'assistant',
                    response,
                    {},
                    'conversations'
                );
            }
          } else if (!apiKey) {
            alert("Please add your API Key in the Settings or Profile page to use the AI chat.");
          }
        } catch (error) {
            console.error("Error sending message:", error);
            alert("Failed to send message. Please check your API key and try again.");
        } finally {
            setIsRunning(false);
        }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50">
      {/* Sidebar Toggle (Mobile/Collapsed) */}
      {!isSidebarOpen && (
        <div className="absolute left-4 top-4 z-10">
            <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsSidebarOpen(true)}
                className="bg-white shadow-md hover:bg-gray-100"
            >
                <PanelLeftOpen size={20} className="text-gray-600" />
            </Button>
        </div>
      )}

      {/* Sidebar */}
      {isSidebarOpen && (
        <div className="w-80 border-r border-gray-200 bg-white flex flex-col h-full transition-all duration-300">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-medium flex items-center gap-2 text-gray-900">
                    <Bot size={20} className="text-indigo-600" />
                    History
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}>
                    <PanelLeftClose size={20} className="text-gray-500" />
                </Button>
            </div>
            
            <div className="p-4">
                <Button 
                    variant="secondary" 
                    className="w-full justify-start gap-2 cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-900" 
                    onClick={handleNewChat}
                >
                    <Plus size={18} />
                    New Chat
                </Button>
            </div>

            <ScrollArea className="flex-1 px-3">
                <div className="flex flex-col gap-2 pb-4">
                    {conversations.map((conv) => (
                        <div 
                            key={conv.id}
                            className={cn(
                                "group flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors text-sm",
                                activeConversationId === conv.id 
                                    ? "bg-indigo-50 text-indigo-900" 
                                    : "hover:bg-gray-100 text-gray-700"
                            )}
                            onClick={() => setActiveConversationId(conv.id)}
                        >
                            <MessageSquare size={16} className={activeConversationId === conv.id ? "text-indigo-500" : "text-gray-400"} />
                            <span className="flex-1 truncate font-medium">
                                {conv.title || 'New Conversation'}
                            </span>
                            <button 
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded text-gray-500 transition-opacity"
                                onClick={(e) => handleDeleteConversation(e, conv.id)}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                    {conversations.length === 0 && (
                        <p className="py-8 text-center text-sm italic text-gray-500">
                            No conversations yet
                        </p>
                    )}
                </div>
            </ScrollArea>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
         <Conversation className="flex-1 w-full">
            <ConversationContent className="max-w-4xl mx-auto w-full p-4 md:p-8">
                {messages.length === 0 ? (
                    <ConversationEmptyState 
                        title="Welcome to AI Assistant"
                        description="Start a new conversation to get help with your project."
                        icon={<Bot size={48} className="text-indigo-200" />}
                    />
                ) : (
                    messages.map((msg) => {
                        let textContent = '';
                        if (Array.isArray(msg.content)) {
                            textContent = msg.content.map(c => (c as any).text || '').join('');
                        } else if (typeof msg.content === 'string') {
                            textContent = msg.content;
                        }

                        // Determine role safely
                        let role = msg.role;
                        if (role === 'conversations') role = 'user'; // Fallback for old data
                        
                        return (
                            <Message 
                                key={msg.id} 
                                from={role as "user" | "assistant"}
                                className={role === 'user' ? "items-end" : "items-start"}
                            >
                                <MessageContent className={cn(
                                    "px-4 py-3 rounded-2xl shadow-sm max-w-[85%] text-sm",
                                    role === 'user' 
                                        ? "!bg-indigo-600 !text-white [&_p]:!text-white [&_pre]:!bg-indigo-700 [&_code]:!bg-indigo-700 [&_code]:!text-white [&_li]:!text-white [&_strong]:!text-white" 
                                        : "!bg-white border !border-gray-200 !text-gray-900 [&_p]:!text-gray-900 [&_li]:!text-gray-900 [&_strong]:!text-gray-900 [&_pre]:!bg-gray-100 [&_code]:!bg-gray-100 [&_code]:!text-gray-900"
                                )}>
                                    <MessageResponse>{textContent}</MessageResponse>
                                </MessageContent>
                            </Message>
                        );
                    })
                )}
            </ConversationContent>
         </Conversation>
            
         <div className="p-4 border-t bg-white w-full mt-auto shrink-0 z-10">
            <div className="max-w-4xl mx-auto">
                <PromptInput 
                    onSubmit={handleSendMessage} 
                    className="border rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-400"
                >
                    <PromptInputTextarea 
                        placeholder="Ask anything about your project context..." 
                        className="min-h-[60px] max-h-[200px]"
                    />
                    <PromptInputFooter>
                        <PromptInputTools>
                            {/* Tools can be added here later */}
                        </PromptInputTools>
                        <PromptInputSubmit 
                            status={isRunning ? 'streaming' : 'idle'}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                        />
                    </PromptInputFooter>
                </PromptInput>
                <p className="mt-2 text-center text-xs text-gray-400 opacity-60">
                    AI can make mistakes. Please verify important information.
                </p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default AiChatPage;
