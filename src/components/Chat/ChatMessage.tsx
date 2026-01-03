import React from 'react';
import { Box, Flex, Text, Avatar, IconButton } from '@radix-ui/themes';
import ReactMarkdown from 'react-markdown';
import { Bot, Copy } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { StoredMessage } from '../../types';

interface ChatMessageProps {
  message: StoredMessage;
  onCopy: (content: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onCopy }) => {
  const isUser = message.role === 'user';
  const { user } = useAuth();

  return (
    <Flex 
      direction="column" 
      align={isUser ? 'end' : 'start'} 
      className={`mb-6 w-full ${isUser ? 'items-end' : 'items-start'}`}
    >
      <Flex gap="4" className={`max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <Box className="flex-shrink-0 mt-1">
          {isUser ? (
             <Avatar 
                src={user?.photoURL || undefined} 
                fallback={user?.displayName?.[0] || 'U'} 
                radius="full" 
                size="1"
                className="w-8 h-8" 
             />
          ) : (
             <Box className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <Bot size={16} />
             </Box>
          )}
        </Box>

        {/* Message Content */}
        <Box className="flex-1 min-w-0">
            <Flex direction="column" gap="1">
                <Box className="flex items-baseline gap-2">
                    <Text size="2" weight="bold" color="gray" className="opacity-90">
                        {isUser ? 'You' : 'AI Assistant'}
                    </Text>
                </Box>
                
                <Box 
                  className={`
                    text-[15px] leading-relaxed relative group
                    ${isUser 
                      ? 'bg-gray-100 text-gray-900 px-4 py-3 rounded-2xl rounded-tr-sm' 
                      : 'text-gray-800 py-1 pr-4'}
                  `}
                >
                  {isUser ? (
                    <Text>{message.content}</Text>
                  ) : (
                    <Box className="markdown-content prose prose-sm max-w-none text-gray-800 prose-p:my-1 prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-100">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </Box>
                  )}

                  {/* Action Buttons (Hover) */}
                  {!isUser && (
                    <Flex 
                        className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity gap-2"
                        align="center"
                    >
                        <IconButton 
                            size="1" 
                            variant="ghost" 
                            color="gray" 
                            onClick={() => onCopy(message.content)}
                            className="hover:bg-gray-100 rounded-full"
                        >
                            <Copy size={14} />
                        </IconButton>
                    </Flex>
                  )}
                </Box>
            </Flex>
        </Box>
      </Flex>
    </Flex>
  );
};

export default ChatMessage;
