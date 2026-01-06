import React, { useState } from 'react';
import { Flex, Text, Button, Avatar, DropdownMenu, Badge } from '@radix-ui/themes';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalContext } from '../../contexts/GlobalContext';
import { LogOut, LayoutGrid, Globe, Bot, Download, Lock } from 'lucide-react';
import APIKeyModal from './APIKeyModal';
import SetPasswordModal from './SetPasswordModal';
import ContextModal from './ContextModal';
import ContextSelectorModal from '../GlobalContext/ContextSelectorModal';
import ChatPanel from '../Chat/ChatPanel';
import { Link } from 'react-router-dom';
import { exportWorkspaceToJson } from '../../services/exportService';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { 
    setIsContextModalOpen, 
    selectedSources,
    setSelectedSources,
    isContextModalOpen // Add this line
  } = useGlobalContext();
  
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);

  return (
    <div className="sticky top-0 z-50 px-6 py-3 bg-white/80 backdrop-blur-md shadow-md">
      <Flex justify="between" align="center">
        <Flex gap="4" align="center">
            <Link to="/dashboard" className="no-underline text-black cursor-pointer">
                <Text size="5" weight="bold" className="text-gray-900 hover:text-indigo-600 transition-colors cursor-pointer">
                Context Platform
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
          <Button variant="ghost" color="gray" onClick={() => setIsContextModalOpen(true)} className="cursor-pointer hover:bg-gray-100 transition-colors">
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

          {/* Export Workspace */}
          <Button 
            variant="ghost" 
            color="gray" 
            disabled={isExporting} 
            onClick={async () => {
              if (!user?.uid) return;
              try {
                setIsExporting(true);
                await exportWorkspaceToJson(user.uid, { displayName: user.displayName, email: user.email });
              } finally {
                setIsExporting(false);
              }
            }} 
            className="cursor-pointer hover:bg-gray-100 transition-colors"
          >
            <Download size={16} className="text-gray-400" />
            {isExporting ? 'Exporting...' : 'Export Workspace'}
          </Button>

          {/* Global Context Modal */}
          <ContextSelectorModal 
            isOpen={isContextModalOpen}
            onClose={() => setIsContextModalOpen(false)}
            onSave={setSelectedSources}
            initialSelectedSources={selectedSources}
            currentDefinitionId={null} // Global context shouldn't exclude anything by default
          />

          <SetPasswordModal 
            isOpen={isPasswordModalOpen} 
            onClose={() => setIsPasswordModalOpen(false)} 
          />

          <APIKeyModal />
          
          <ContextModal />
          
          {/* Global Chat Panel */}
          <ChatPanel 
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            parentId={user?.uid}
            parentCollection="conversations"
          />

          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <button className="outline-none cursor-pointer rounded-full hover:ring-2 hover:ring-indigo-100 transition-all">
                <Avatar 
                  src={user?.photoURL || undefined} 
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
              <DropdownMenu.Item className="cursor-pointer" onClick={() => setIsPasswordModalOpen(true)}>
                <Lock className="w-4 h-4 mr-2" />
                Set Password
              </DropdownMenu.Item>
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
