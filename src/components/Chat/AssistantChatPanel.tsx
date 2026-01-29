import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalContext } from '../../contexts/GlobalContext';
import { 
  subscribeToChat, 
  subscribeToConversations, 
  deleteConversation, 
  sendMessage,
  createConversation
} from '../../services/chatService';
import { 
  sendChatMessage, 
} from '../../services/anthropic';
import { Conversation as ConversationType, StoredMessage, Pyramid, ProductDefinition } from '../../types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Plus, Bot, X } from 'lucide-react';
import { cn } from "@/lib/utils"

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
  PromptInputTools
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

const AssistantChatPanel: React.FC<ChatPanelProps> = ({ 
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
  const [isTyping, setIsTyping] = useState(false);
  const [input, setInput] = useState('');

  // Subscribe to conversations list
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToConversations(user.uid, (convs) => {
      setConversations(convs);
      if (!activeConversationId && convs.length > 0) {
        // Sort by updatedAt desc
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

  // Subscribe to chat messages
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

  const handleSend = async () => {
    if (!input.trim() || !user || !apiKey) return;
    
    const textContent = input.trim();
    setInput(''); // Clear input immediately
    setIsTyping(true);

    try {
        let conversationId = activeConversationId;
        
        // Create conversation if needed
        if (!conversationId) {
             const newConv = await createConversation(user.uid, textContent.substring(0, 30));
             if (newConv) {
                 conversationId = newConv.id;
                 setActiveConversationId(conversationId);
             } else {
                 throw new Error("Failed to create conversation");
             }
        }

        if (!conversationId) return;

        // 1. Save user message
        await sendMessage(user.uid, conversationId, 'user', textContent);

        // 2. Prepare context
        let context = additionalContext || "";
        if (pyramid) context += `\nPyramid Context: ${pyramid.context || ""}`;
        
        // 3. History
        const history = messages.map(m => {
            let contentStr = '';
            if (Array.isArray(m.content)) {
                contentStr = m.content.map(c => (c as any).text || '').join('');
            } else if (typeof m.content === 'string') {
                contentStr = m.content;
            }
            return { role: m.role as "user" | "assistant", content: contentStr };
        });
        
        // 4. Send to AI
        const aiResponse = await sendChatMessage(
            apiKey,
            pyramid as any, 
            history,
            textContent,
            context,
            globalContext
        );
        
        // 5. Save assistant response
        if (aiResponse) {
            await sendMessage(user.uid, conversationId, 'assistant', aiResponse);
        }
        
    } catch (error) {
        console.error(error);
        alert("Failed to send message");
    } finally {
        setIsTyping(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="!max-w-[1000px] w-[90vw] sm:w-[850px] p-0 flex gap-0 border-l" side="right">
        {/* Sidebar for conversations */}
        <div className="w-64 border-r bg-muted/10 flex flex-col hidden sm:flex">
            <div className="p-4 border-b">
                <Button 
                    onClick={handleNewChat}
                    className="w-full justify-start"
                    variant="outline"
                >
                    <Plus className="mr-2 h-4 w-4" /> New Chat
                </Button>
            </div>
            <div className="flex-grow overflow-y-auto p-2 space-y-1">
                {conversations.map(conv => (
                    <div 
                        key={conv.id}
                        onClick={() => setActiveConversationId(conv.id)}
                        className={cn(
                            "p-3 rounded-md cursor-pointer text-sm transition-colors hover:bg-muted",
                            activeConversationId === conv.id ? "bg-muted font-medium text-foreground" : "text-muted-foreground"
                        )}
                    >
                        <div className="truncate">{conv.title || "New Conversation"}</div>
                        <div className="text-xs opacity-60 mt-1">
                            {conv.updatedAt ? new Date(conv.updatedAt).toLocaleDateString() : 'Just now'}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
            <SheetHeader className="p-4 border-b flex-shrink-0 flex flex-row items-center justify-between space-y-0">
                <SheetTitle>AI Assistant</SheetTitle>
            </SheetHeader>
            
            <Conversation className="flex-1 overflow-hidden">
                <ConversationContent className="p-4 h-full overflow-y-auto">
                    {messages.length === 0 && !activeConversationId ? (
                        <ConversationEmptyState 
                            title="AI Assistant"
                            description="Ask questions about your pyramid or product definition."
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
                </ConversationContent>
            </Conversation>

            {/* Input Area */}
            <div className="p-4 border-t bg-white">
                 <div className="max-w-4xl mx-auto">
                    <PromptInput 
                        onSubmit={handleSend} 
                        className="border rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-400"
                    >
                        <PromptInputTextarea 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Ask a question..." 
                            className="min-h-[60px] max-h-[200px] border-0 focus:ring-0 resize-none py-3 px-4"
                        />
                        <PromptInputFooter>
                            <PromptInputTools />
                            <PromptInputSubmit 
                                onClick={handleSend}
                                disabled={!input.trim() || isTyping || !apiKey} 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                            />
                        </PromptInputFooter>
                    </PromptInput>
                    {!apiKey && (
                        <p className="mt-2 text-center text-xs text-red-500 font-medium">
                            API Key required to chat.
                        </p>
                    )}
                 </div>
            </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AssistantChatPanel;
