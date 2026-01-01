import React, { useState } from 'react';
import { Flex, Text, Button, Avatar, DropdownMenu, Badge } from '@radix-ui/themes';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalContext } from '../../contexts/GlobalContext';
import { LogOut, Download, Home, LayoutGrid, Globe, Bot } from 'lucide-react';
import APIKeyModal from './APIKeyModal';
import ContextModal from './ContextModal';
import ContextSelectorModal from '../ProductDefinition/ContextSelectorModal';
import ChatPanel from '../Chat/ChatPanel';
import { exportToExcel } from '../../services/exportService';
import { useLocation, Link } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { 
    openContextModal, 
    closeContextModal, 
    isContextModalOpen, 
    updateContextSources, 
    selectedSources 
  } = useGlobalContext();
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="sticky top-0 z-50 border-b border-gray-200 px-6 py-3 bg-white/80 backdrop-blur-md shadow-sm">
      <Flex justify="between" align="center">
        <Flex gap="4" align="center">
            <Link to="/dashboard" className="no-underline text-black cursor-pointer">
                <Text size="5" weight="bold" className="text-gray-900 hover:text-indigo-600 transition-colors cursor-pointer">
                Product Platform
                </Text>
            </Link>
        </Flex>

        <Flex gap="3" align="center">
          <Link to="/dashboard" className="cursor-pointer">
            <Button variant="ghost" color="gray" className="cursor-pointer hover:bg-gray-100 transition-colors">
                <LayoutGrid size={16} className="mr-2" /> Dashboard
            </Button>
          </Link>

          {/* Global Context Button */}
          <Button variant="ghost" color="gray" onClick={openContextModal} className="cursor-pointer hover:bg-gray-100 transition-colors">
            <Globe size={16} className={selectedSources.length > 0 ? "text-indigo-500" : "text-gray-400"} />
            Global Context
            {selectedSources.length > 0 && (
                <Badge color="indigo" radius="full" variant="solid" size="1">
                    {selectedSources.length}
                </Badge>
            )}
          </Button>

          {/* Global Chat Button */}
          <Button variant="ghost" color="gray" onClick={() => setIsChatOpen(true)} className="cursor-pointer hover:bg-gray-100 transition-colors">
            <Bot size={16} className="text-gray-400" />
            AI Chat
          </Button>

          {/* Global Context Modal */}
          <ContextSelectorModal 
            isOpen={isContextModalOpen}
            onClose={closeContextModal}
            onSave={updateContextSources}
            initialSelectedSources={selectedSources}
            currentDefinitionId={null} // Global context shouldn't exclude anything by default
          />

          <APIKeyModal />
          
          <ContextModal />
          
          {/* Global Chat Panel */}
          <ChatPanel 
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            parentId={user?.uid}
            parentCollection="users"
          />

          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <button className="outline-none cursor-pointer rounded-full hover:ring-2 hover:ring-indigo-100 transition-all">
                <Avatar 
                  src={user?.photoURL} 
                  fallback={user?.displayName?.[0] || 'U'} 
                  radius="full"
                  size="2"
                />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content className="cursor-default">
              <DropdownMenu.Label>
                <Text size="2" weight="bold">{user?.displayName}</Text>
                <br />
                <Text size="1" color="gray">{user?.email}</Text>
              </DropdownMenu.Label>
              <DropdownMenu.Separator />
              <DropdownMenu.Item color="red" onClick={logout} className="cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </Flex>
      </Flex>
    </div>
  );
};

export default Navbar;
