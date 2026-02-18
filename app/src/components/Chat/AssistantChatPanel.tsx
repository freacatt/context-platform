import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalContext } from '../../contexts/GlobalContext';
import { useCurrentPageContext } from '../../hooks/useCurrentPageContext';
import { 
  subscribeToChat, 
  subscribeToConversations, 
  deleteConversation, 
  createConversation
} from '../../services/chatService';
import { aiService } from '../../services/aiService';
import { Conversation as ConversationType, StoredMessage, Pyramid, ProductDefinition } from '../../types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Plus, Bot, X, Info } from 'lucide-react';
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
  PromptInputTools,
  PromptInputButton
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
  const { context: pageContext, title: pageTitle } = useCurrentPageContext();

  const activeContext = useMemo(() => {
    let contextToUse = additionalContext || "";
    
    // Priority: Explicit Props > Page Context
    if (pyramid) {
        contextToUse += `\nPyramid Context: ${pyramid.title}\n${pyramid.context || ""}\nBlocks: ${JSON.stringify(pyramid.blocks)}`;
    } else if (productDefinition) {
            contextToUse += `\nProduct Definition Context: ${productDefinition.title}\n${JSON.stringify(productDefinition.data)}`;
    } else if (pageContext) {
        // Use the automatically detected context
        contextToUse += `\n${pageContext}`;
    }
    return contextToUse;
  }, [additionalContext, pyramid, productDefinition, pageContext]);

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

        // Use AI Service to handle the chat interaction
        await aiService.processGlobalChat(
            user.uid,
            apiKey,
            conversationId,
            textContent,
            globalContext,
            messages,
            activeContext
        );
        
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
                <SheetTitle className="flex items-center gap-2">
                    AI Assistant
                    {/* Show context indicator */}
                    {(pageTitle && !pyramid && !productDefinition) && (
                        <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {pageTitle}
                        </span>
                    )}
                    {(pyramid) && (
                         <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {pyramid.title}
                        </span>
                    )}
                     {(productDefinition) && (
                         <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {productDefinition.title}
                        </span>
                    )}
                </SheetTitle>
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
                            <PromptInputTools>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <PromptInputButton type="button" variant="ghost" size="icon-sm" title="View Context">
                                            <Info className="size-4 text-muted-foreground" />
                                        </PromptInputButton>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                        <DialogHeader>
                                            <DialogTitle>Current Context</DialogTitle>
                                        </DialogHeader>
                                        <div className="whitespace-pre-wrap font-mono text-xs bg-muted p-4 rounded-md overflow-x-auto">
                                            {activeContext || "No specific context active."}
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </PromptInputTools>
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
