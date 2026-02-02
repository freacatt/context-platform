import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useGlobalContext } from '../../contexts/GlobalContext';
import { LogOut, LayoutGrid, Globe, Bot, Download, Lock, User } from 'lucide-react';
import APIKeyModal from './APIKeyModal';
import SetPasswordModal from './SetPasswordModal';
import ContextModal from './ContextModal';
import ContextSelectorModal from '../GlobalContext/ContextSelectorModal';
import { Link } from 'react-router-dom';
import { exportWorkspaceToJson } from '../../services/exportService';

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { 
    setIsContextModalOpen, 
    selectedSources,
    setSelectedSources,
    isContextModalOpen 
  } = useGlobalContext();
  
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);

  return (
    <div className="sticky top-0 z-50 px-6 py-3 bg-white/80 backdrop-blur-md shadow-md border-b">
      <div className="flex justify-between items-center max-w-[1920px] mx-auto">
        <div className="flex gap-4 items-center">
            <Link to={currentWorkspace ? `/workspace/${currentWorkspace.id}/dashboard` : '/workspaces'} className="no-underline text-black cursor-pointer flex items-center gap-2">
                <span className="text-xl font-bold text-gray-900 hover:text-indigo-600 transition-colors cursor-pointer">
                    Context Platform
                </span>
            </Link>
        </div>

        <div className="flex gap-3 items-center">

          {/* Global Context Button */}
          <Button 
            variant="ghost" 
            onClick={() => setIsContextModalOpen(true)} 
            className="cursor-pointer hover:bg-gray-100 transition-colors gap-2"
          >
            <Globe size={16} className={selectedSources.length > 0 ? "text-indigo-500" : "text-gray-400"} />
            Global Context
            {selectedSources.length > 0 && (
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200">
                    {selectedSources.length}
                </Badge>
            )}
          </Button>

          {/* Export Workspace */}
          <Button 
            variant="ghost" 
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
            className="cursor-pointer hover:bg-gray-100 transition-colors gap-2"
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
            currentDefinitionId={null} 
          />

          <SetPasswordModal 
            isOpen={isPasswordModalOpen} 
            onClose={() => setIsPasswordModalOpen(false)} 
          />

          <APIKeyModal />

          {/* User Menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} />
                    <AvatarFallback>{user.displayName?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsPasswordModalOpen(true)}>
                  <Lock className="mr-2 h-4 w-4" />
                  <span>Set Password</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
