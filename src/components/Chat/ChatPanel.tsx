import React, { useState, useEffect, useRef } from 'react';
import { Box, Flex, Text, TextArea, IconButton, Dialog, ScrollArea, Button } from '@radix-ui/themes';
import { Send, Trash2, MessageSquare, Bot, X, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalContext } from '../../contexts/GlobalContext';
import { 
  sendMessage, 
  subscribeToChat, 
  subscribeToConversations, 
  createConversation, 
  deleteConversation 
} from '../../services/chatService';
import { 
  sendChatMessage, 
  sendProductDefinitionChatMessage, 
  sendGlobalChatMessage 
} from '../../services/anthropic';
import ChatMessage from './ChatMessage';
import { Conversation, StoredMessage, Pyramid, ProductDefinition } from '../../types';

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
  const [input, setInput] = useState<string>('');
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Subscribe to conversations list
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToConversations(user.uid, (convs) => {
      setConversations(convs);
      // Select first conversation if none selected and not explicitly creating new
      if (!activeConversationId && convs.length > 0) {
        // setActiveConversationId(convs[0].id); // Optional: Auto-select latest
      }
    });
    return () => unsubscribe();
  }, [user, activeConversationId]); // Added activeConversationId to deps to match logic if uncommented, but harmless here

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

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, isTyping, activeConversationId]);

  const handleNewChat = async () => {
    setActiveConversationId(null); // Reset active ID to show empty state/ready for new
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

  const handleSend = async () => {
    if (!input.trim() || !apiKey || !user) return;
    
    const userMsg = input.trim();
    setInput('');
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

      // 1. Optimistic Update
      const optimisticMessage: StoredMessage = {
          id: `temp-${Date.now()}`,
          userId: user.uid,
          role: 'user',
          content: userMsg,
          timestamp: new Date(),
          metadata: {},
          parentId: currentConversationId,
          parentCollection: 'conversations'
      };
      setMessages(prev => [...prev, optimisticMessage]);

      // 2. Save user message
      await sendMessage(user.uid, currentConversationId, 'user', userMsg, {}, 'conversations');

      // 3. Get AI Response
      let response: string = "";
      const combinedContext = (additionalContext || "") + "\n\n" + (globalContext || "");

      // Create a simplified message history for the AI service
      const historyForAI = messages.map(m => ({ role: m.role, content: m.content }));

      if (parentCollection === 'productDefinitions' && productDefinition) {
        // Use Product Definition Chat Mode (Legacy/Specific)
        const res = await sendProductDefinitionChatMessage(
            apiKey, 
            productDefinition, 
            combinedContext, 
            historyForAI, 
            userMsg
        );
        response = res || "No response";
      } else if (parentCollection === 'pyramids' && pyramid) {
        // Use Standard Pyramid Chat Mode (Legacy/Specific)
        const res = await sendChatMessage(apiKey, pyramid, historyForAI, userMsg, combinedContext, parentCollection);
        response = res || "No response";
      } else {
        // Use Global Chat Mode
        const res = await sendGlobalChatMessage(apiKey, globalContext || "", historyForAI, userMsg);
        response = res || "No response";
      }

      // 4. Save AI message
      await sendMessage(user.uid, currentConversationId, 'assistant', response, {}, 'conversations');

    } catch (error) {
      console.error("Chat Error:", error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content style={{ maxWidth: 1100, height: '85vh', padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '16px', border: '1px solid #e5e7eb', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)' }}>
          <Dialog.Title className="sr-only">AI Chat Assistant</Dialog.Title>
          <Dialog.Description className="sr-only">
            Chat interface for interacting with the AI assistant about your pyramids and product definitions.
          </Dialog.Description>
          <Flex className="h-full bg-white">
            {/* Sidebar - History */}
            <Box className="w-[280px] border-r border-gray-200 bg-gray-50/50 flex flex-col h-full flex-shrink-0">
                <Box className="p-4">
                    <Button 
                        size="3"
                        variant="soft" 
                        color="gray" 
                        className="w-full cursor-pointer justify-start bg-white border border-gray-300 shadow-sm hover:border-gray-400 hover:bg-gray-50 text-gray-700"
                        onClick={handleNewChat}
                    >
                        <Plus size={18} className="mr-2" /> 
                        <Text weight="medium">New Chat</Text>
                    </Button>
                </Box>
                
                <Box className="px-4 pb-2">
                    <Text size="1" weight="bold" color="gray" className="uppercase tracking-wider opacity-60">History</Text>
                </Box>

                <ScrollArea className="flex-1 px-3 pb-4">
                    <Flex direction="column" gap="1">
                        {conversations.map(conv => (
                            <Box 
                                key={conv.id}
                                className={`
                                    p-3 rounded-lg cursor-pointer transition-all duration-200 group relative
                                    ${activeConversationId === conv.id 
                                        ? 'bg-white shadow-sm ring-1 ring-gray-200 text-gray-900' 
                                        : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'}
                                `}
                                onClick={() => setActiveConversationId(conv.id)}
                            >
                                <Text size="2" className="block truncate pr-6 font-medium">
                                    {conv.title || "New Chat"}
                                </Text>
                                <Text size="1" className="block truncate opacity-50 mt-0.5">
                                    {(() => {
                                        if (!conv.updatedAt) return '';
                                        const date = conv.updatedAt instanceof Date ? conv.updatedAt : new Date(conv.updatedAt);
                                        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                    })()}
                                </Text>
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <IconButton 
                                        size="1" 
                                        variant="ghost" 
                                        color="red" 
                                        onClick={(e) => handleDeleteConversation(e, conv.id)}
                                        className="hover:bg-red-50"
                                    >
                                        <Trash2 size={14} />
                                    </IconButton>
                                </div>
                            </Box>
                        ))}
                        {conversations.length === 0 && (
                            <Box className="p-8 text-center opacity-40">
                                <MessageSquare size={24} className="mx-auto mb-2" />
                                <Text size="2">No history yet</Text>
                            </Box>
                        )}
                    </Flex>
                </ScrollArea>
            </Box>

            {/* Main Chat Area */}
            <Flex direction="column" className="flex-1 h-full min-w-0 bg-white relative">
                {/* Header */}
                <Flex 
                    justify="between" 
                    align="center" 
                    className="px-6 py-4 border-b border-gray-100"
                >
                    <Flex gap="3" align="center">
                        <Text size="3" weight="bold" className="text-gray-900">
                            {activeConversationId ? (conversations.find(c => c.id === activeConversationId)?.title || "Chat") : "New Chat"}
                        </Text>
                        <Box className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-medium tracking-wide">
                        
                        </Box>
                    </Flex>
                    <Dialog.Close>
                        <IconButton variant="ghost" color="gray" className="cursor-pointer hover:bg-gray-100 rounded-full">
                            <X size={20} />
                        </IconButton>
                    </Dialog.Close>
                </Flex>

                {/* Messages Area */}
                <Box className="flex-1 overflow-y-auto px-4 md:px-20 py-8 scroll-smooth" ref={scrollRef}>
                    <Box className="max-w-3xl mx-auto w-full">
                        {messages.length === 0 && !activeConversationId ? (
                            <Flex direction="column" align="center" justify="center" className="min-h-[400px] text-center space-y-6">
                                <Box className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 mb-2 ring-1 ring-gray-100">
                                    <Bot size={32} />
                                </Box>
                                <Box>
                                    <Text size="6" weight="bold" className="block mb-2 text-gray-900">How can I help you?</Text>
                                    <Text size="2" color="gray" className="max-w-md mx-auto leading-relaxed">
                                        I have access to your selected global context. Ask me anything about your pyramids or product definitions.
                                    </Text>
                                </Box>
                            </Flex>
                        ) : (
                            <Flex direction="column">
                                {messages.map((msg) => (
                                    <ChatMessage 
                                        key={msg.id} 
                                        message={msg} 
                                        onCopy={handleCopy} 
                                    />
                                ))}
                                {isTyping && (
                                    <Flex gap="4" className="mb-6 animate-pulse">
                                        <Box className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                                            <Bot size={16} />
                                        </Box>
                                        <Box className="flex items-center gap-1 mt-2">
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                        </Box>
                                    </Flex>
                                )}
                            </Flex>
                        )}
                    </Box>
                </Box>

                {/* Input Area */}
                <Box className="p-6 bg-gradient-to-t from-white via-white to-transparent">
                    <Box className="max-w-3xl mx-auto w-full relative">
                        <Box className="relative shadow-lg rounded-2xl bg-white ring-1 ring-gray-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all duration-200">
                            <TextArea 
                                placeholder={apiKey ? "Message AI Assistant..." : "Please set API Key in Navbar first"}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                disabled={!apiKey || isTyping}
                                size="3"
                                rows={1}
                                className="w-full min-h-[56px] max-h-[200px] py-4 pl-5 pr-14 bg-transparent border-none focus:ring-0 resize-none text-base"
                                style={{ boxShadow: 'none' }}
                            />
                            <Box className="absolute right-2 bottom-2">
                                <IconButton 
                                    size="2" 
                                    variant={input.trim() ? "solid" : "soft"}
                                    color={input.trim() ? "indigo" : "gray"}
                                    onClick={handleSend}
                                    disabled={!input.trim() || !apiKey || isTyping}
                                    className={`rounded-xl transition-all duration-200 ${input.trim() ? 'shadow-md hover:scale-105' : 'opacity-50'}`}
                                >
                                    <Send size={16} />
                                </IconButton>
                            </Box>
                        </Box>
                        {!apiKey && (
                            <Text size="1" color="red" className="mt-2 block text-center font-medium">
                                API Key required to chat.
                            </Text>
                        )}
                        <Text size="1" align="center" color="gray" className="mt-3 opacity-50 text-[11px]">
                            AI can make mistakes. Please verify important information.
                        </Text>
                    </Box>
                </Box>
            </Flex>
          </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default ChatPanel;
