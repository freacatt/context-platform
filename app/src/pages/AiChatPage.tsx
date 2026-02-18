import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalContext } from '../contexts/GlobalContext';
import { 
  subscribeToConversations, 
  subscribeToChat, 
  createConversation, 
  deleteConversation,
} from '../services/chatService';
import { aiService } from '../services/aiService';
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
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

const AiChatPage: React.FC = () => {
  const { user, apiKey } = useAuth();
  const { aggregatedContext: globalContext } = useGlobalContext();
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [conversations, setConversations] = useState<ConversationType[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Delete State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, title: string } | null>(null);

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

  const handleDeleteConversation = (e: React.MouseEvent, convId: string, title: string) => {
    e.stopPropagation();
    setDeleteTarget({ id: convId, title: title || 'New Conversation' });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
        if (activeConversationId === deleteTarget.id) {
            setActiveConversationId(null);
        }
        await deleteConversation(deleteTarget.id);
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
    } catch (error) {
        console.error("Failed to delete conversation", error);
        alert("Failed to delete conversation");
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
            await aiService.processGlobalChat(
                user.uid,
                apiKey,
                currentConvId,
                userMessageContent,
                globalContext || "",
                messages,
                "" // No current page context for general chat page
            );
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
    <div className="flex h-[calc(100vh-64px)] bg-background">
      {/* Sidebar Toggle (Mobile/Collapsed) */}
      {!isSidebarOpen && (
        <div className="absolute left-4 top-4 z-10">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
            className="bg-background shadow-md hover:bg-accent"
          >
            <PanelLeftOpen size={20} className="text-muted-foreground" />
          </Button>
        </div>
      )}

      {/* Sidebar */}
      {isSidebarOpen && (
        <div className="w-80 border-r border-border bg-card flex flex-col h-full transition-all duration-300">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h2 className="text-lg font-medium flex items-center gap-2 text-foreground">
              <Bot size={20} className="text-primary" />
              History
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}>
              <PanelLeftClose size={20} className="text-muted-foreground" />
            </Button>
          </div>
          
          <div className="p-4">
            <Button 
              variant="secondary" 
              className="w-full justify-start gap-2 cursor-pointer bg-secondary hover:bg-secondary/80 text-secondary-foreground" 
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
                      ? "bg-accent text-accent-foreground" 
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setActiveConversationId(conv.id)}
                >
                  <MessageSquare size={16} className={activeConversationId === conv.id ? "text-primary" : "text-muted-foreground"} />
                  <span className="flex-1 truncate font-medium">
                    {conv.title || 'New Conversation'}
                  </span>
                  <button 
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-background rounded text-muted-foreground transition-opacity"
                    onClick={(e) => handleDeleteConversation(e, conv.id, conv.title)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {conversations.length === 0 && (
                <p className="py-8 text-center text-sm italic text-muted-foreground">
                  No conversations yet
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
         <Conversation className="flex-1 w-full bg-background">
            <ConversationContent className="max-w-4xl mx-auto w-full p-4 md:p-8">
                {messages.length === 0 ? (
                    <ConversationEmptyState 
                        title="Welcome to AI Assistant"
                        description="Start a new conversation to get help with your project."
                        icon={<Bot size={48} className="text-primary/50" />}
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
                                        ? "bg-primary text-primary-foreground [&_p]:text-primary-foreground [&_pre]:bg-primary-foreground/10 [&_code]:bg-primary-foreground/10 [&_code]:text-primary-foreground" 
                                        : "bg-muted border border-border text-foreground [&_p]:text-foreground [&_li]:text-foreground [&_strong]:text-foreground [&_pre]:bg-background [&_code]:bg-background [&_code]:text-foreground"
                                )}>
                                    <MessageResponse>{textContent}</MessageResponse>
                                </MessageContent>
                            </Message>
                        );
                    })
                )}
                {isRunning && (
                    <Message from="assistant" className="items-start">
                        <MessageContent className="bg-muted border border-border text-foreground px-4 py-3 rounded-2xl shadow-sm">
                            <div className="flex items-center gap-1 h-6">
                                <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"></div>
                            </div>
                        </MessageContent>
                    </Message>
                )}
            </ConversationContent>
         </Conversation>
            
         <div className="p-4 border-t border-border bg-background w-full mt-auto shrink-0 z-10">
            <div className="max-w-4xl mx-auto">
                <PromptInput 
                    onSubmit={handleSendMessage} 
                    className="border border-border rounded-2xl bg-card shadow-sm hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-ring focus-within:border-primary"
                >
                    <PromptInputTextarea 
                        placeholder="Ask anything about your project context..." 
                        className="min-h-[60px] max-h-[200px] bg-transparent text-foreground placeholder:text-muted-foreground"
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
      <DeleteConfirmDialog 
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Conversation"
        description="This action cannot be undone. This will permanently delete the conversation history."
        itemName={deleteTarget?.title || 'Conversation'}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default AiChatPage;
