import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalContext } from '../../contexts/GlobalContext';
import { 
  subscribeToConversations, 
  subscribeToChat, 
  createConversation, 
  deleteConversation,
} from '../../services/chatService';
import { aiService } from '../../services/aiService';
import { Conversation as ConversationType, StoredMessage, Pyramid, ProductDefinition } from '../../types';
import { Plus, MessageSquare, Trash2, Bot, X } from 'lucide-react';
import { cn } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";

// AI Elements
import { 
  Conversation, 
  ConversationContent, 
  ConversationEmptyState 
} from '../ai-elements/conversation';
import { 
  Message, 
  MessageContent, 
  MessageResponse
} from '../ai-elements/message';
import { 
  PromptInput, 
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTools,
} from '../ai-elements/prompt-input';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  parentId?: string;
  parentCollection?: string;
  pyramid?: Pyramid | null;
  productDefinition?: ProductDefinition | null;
  additionalContext?: string | null;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ 
  isOpen,
  onClose,
  parentCollection = 'conversations',
  pyramid = null,
  productDefinition = null,
  additionalContext = null
}) => {
  const { user, apiKey } = useAuth();
  const { aggregatedContext: globalContext } = useGlobalContext();
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [conversations, setConversations] = useState<ConversationType[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState<boolean>(false);

  // Subscribe to conversations list
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToConversations(user.uid, (convs) => {
      setConversations(convs);
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

  const handleSend = async ({ text }: { text: string }) => {
    if (!text.trim() || !apiKey || !user) return;
    
    const userMsg = text.trim();
    setIsTyping(true);

    try {
      let currentConversationId = activeConversationId;

      // Create new conversation if none active
      if (!currentConversationId) {
          const newConv = await createConversation(user.uid, userMsg.substring(0, 30) + (userMsg.length > 30 ? '...' : ''));
          if (newConv) {
            currentConversationId = newConv.id;
            setActiveConversationId(currentConversationId);
          } else {
             throw new Error("Failed to create conversation");
          }
      }

      if (!currentConversationId) return;

      // Prepare context
      let contextToUse = additionalContext || "";
      
      if (productDefinition) {
          await aiService.processProductDefinitionChat(
              user.uid,
              apiKey,
              currentConversationId,
              userMsg,
              productDefinition,
              contextToUse,
              messages
          );
      } else {
          let globalContextStr = globalContext || "";
          if (pyramid) {
              globalContextStr += `\n\nPyramid Context: ${JSON.stringify(pyramid)}`;
          }
          if (contextToUse) {
              globalContextStr += `\n\nAdditional Context: ${contextToUse}`;
          }

          await aiService.processGlobalChat(
              user.uid,
              apiKey,
              currentConversationId,
              userMsg,
              globalContextStr,
              messages,
              "" // No explicit page context here
          );
      }
      
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message.");
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[1100px] h-[85vh] p-0 flex flex-col gap-0 overflow-hidden sm:rounded-2xl border border-gray-200 shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>AI Chat Assistant</DialogTitle>
            <DialogDescription>
                Chat interface for interacting with the AI assistant.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex h-full bg-white">
            {/* Sidebar - History */}
            <div className="w-[280px] border-r border-gray-200 bg-gray-50/50 flex flex-col h-full flex-shrink-0">
                <div className="p-4">
                    <Button 
                        variant="outline"
                        className="w-full justify-start bg-white shadow-sm hover:bg-gray-50 text-gray-700 gap-2"
                        onClick={handleNewChat}
                    >
                        <Plus size={18} /> 
                        New Chat
                    </Button>
                </div>
                
                <div className="px-4 pb-2">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">History</div>
                </div>

                <ScrollArea className="flex-1 px-3">
                    <div className="flex flex-col gap-2 pb-4">
                        {conversations.map((conv) => (
                            <div 
                                key={conv.id}
                                className={cn(
                                    "group flex items-center gap-3 p-2.5 rounded-md cursor-pointer transition-all text-sm border border-transparent",
                                    activeConversationId === conv.id 
                                        ? "bg-white border-gray-200 shadow-sm text-indigo-900 font-medium" 
                                        : "hover:bg-gray-200/50 text-gray-600"
                                )}
                                onClick={() => setActiveConversationId(conv.id)}
                            >
                                <MessageSquare size={16} className={activeConversationId === conv.id ? "text-indigo-500" : "text-gray-400"} />
                                <span className="flex-1 truncate">
                                    {conv.title || 'New Conversation'}
                                </span>
                                <button 
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 hover:text-red-600 rounded transition-all"
                                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                        {conversations.length === 0 && (
                            <p className="py-8 text-center text-xs text-gray-400">
                                No conversations yet
                            </p>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-white">
                {/* Header */}
                <div className="h-14 border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0 bg-white/80 backdrop-blur-sm z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                        <span className="font-medium text-gray-700">
                            {activeConversationId ? (conversations.find(c => c.id === activeConversationId)?.title || "Chat") : "New Chat"}
                        </span>
                    </div>
                    <DialogClose asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-100">
                            <X size={18} className="text-gray-500" />
                        </Button>
                    </DialogClose>
                </div>

                {/* Messages */}
                <Conversation className="flex-1">
                    <ConversationContent className="p-4 md:p-8 max-w-3xl mx-auto w-full">
                        {messages.length === 0 && !activeConversationId ? (
                            <ConversationEmptyState 
                                title="How can I help you?"
                                description="I have access to your selected global context. Ask me anything about your pyramids or product definitions."
                                icon={<Bot size={40} className="text-indigo-200" />}
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
                                if (role === 'conversations') role = 'user'; 
                                
                                return (
                                    <Message 
                                        key={msg.id} 
                                        from={role as "user" | "assistant"}
                                        className={role === 'user' ? "items-end" : "items-start"}
                                    >
                                        <MessageContent className={cn(
                                            "px-4 py-3 rounded-2xl shadow-sm max-w-[85%]",
                                            role === 'user' 
                                                ? "bg-indigo-600 text-white [&_p]:text-white" 
                                                : "bg-white border border-gray-100 text-gray-900"
                                        )}>
                                            <MessageResponse>{textContent}</MessageResponse>
                                        </MessageContent>
                                    </Message>
                                );
                            })
                        )}
                        {isTyping && (
                            <Message from="assistant" className="items-start">
                                <MessageContent className="bg-white border border-gray-100 text-gray-900 px-4 py-3 rounded-2xl shadow-sm">
                                    <div className="flex items-center gap-1 h-6">
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                                    </div>
                                </MessageContent>
                            </Message>
                        )}
                    </ConversationContent>
                </Conversation>

                {/* Input Area */}
                <div className="p-4 border-t bg-white w-full">
                    <div className="max-w-3xl mx-auto">
                        <PromptInput 
                            onSubmit={handleSend} 
                            className="border rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-400"
                        >
                            <PromptInputTextarea 
                                placeholder={apiKey ? "Message AI Assistant..." : "Please set API Key in Navbar first"}
                                disabled={!apiKey}
                                className="min-h-[56px] max-h-[200px]"
                            />
                            <PromptInputFooter>
                                <PromptInputTools />
                                <PromptInputSubmit 
                                    status={isTyping ? 'streaming' : 'idle'}
                                    disabled={!apiKey}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                                />
                            </PromptInputFooter>
                        </PromptInput>
                        {!apiKey && (
                            <p className="mt-2 text-center text-xs text-red-500 font-medium">
                                API Key required to chat.
                            </p>
                        )}
                        <p className="mt-2 text-center text-[11px] text-gray-400 opacity-60">
                            AI can make mistakes. Please verify important information.
                        </p>
                    </div>
                </div>
            </div>
          </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatPanel;