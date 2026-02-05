import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';
import { getMcpSettings, initMcpSettings } from '../../services/mcpSettingsService';
import { WorkspaceMcpSettings } from '../../types';
import { ConnectTab } from './ConnectTab';
import { ConfigureTab } from './ConfigureTab';
import { Loader2 } from 'lucide-react';

interface McpAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const McpAccessModal: React.FC<McpAccessModalProps> = ({ isOpen, onClose }) => {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [settings, setSettings] = useState<WorkspaceMcpSettings | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && currentWorkspace && user) {
      setLoading(true);
      // Initialize or fetch settings
      initMcpSettings(currentWorkspace.id, user.uid)
        .then(setSettings)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, currentWorkspace, user]);

  if (!currentWorkspace) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Workspace MCP Access</DialogTitle>
          <DialogDescription>
            Configure external AI access for <strong>{currentWorkspace.name}</strong> via Model Context Protocol.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : settings ? (
          <Tabs defaultValue="connect" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="connect">Connect</TabsTrigger>
              <TabsTrigger value="configure">Configure</TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-y-auto mt-4 pr-2">
                <TabsContent value="connect" className="mt-0">
                <ConnectTab settings={settings} onUpdate={setSettings} />
                </TabsContent>
                <TabsContent value="configure" className="mt-0">
                <ConfigureTab settings={settings} onUpdate={setSettings} />
                </TabsContent>
            </div>
          </Tabs>
        ) : (
          <div className="flex-1 flex items-center justify-center text-red-500">
            Failed to load settings.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
