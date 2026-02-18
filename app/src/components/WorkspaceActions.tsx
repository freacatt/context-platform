import React, { useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useGlobalContext } from '../contexts/GlobalContext';
import { Button } from '@/components/ui/button';
import { Globe, Download, Upload, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { exportWorkspaceToJson, importWorkspaceFromJson } from '../services/exportService';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';

export const WorkspaceActions: React.FC = () => {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { setIsContextModalOpen, selectedSources } = useGlobalContext();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Determine if we are in "workspace mode"
  const isWorkspaceMode = !!currentWorkspace && !location.pathname.endsWith('/workspaces') && location.pathname !== '/workspaces';

  const handleExport = async () => {
    if (!user || !currentWorkspace) return;
    try {
      setIsExporting(true);
      await exportWorkspaceToJson(user.uid, currentWorkspace.id, { 
        displayName: user.displayName, 
        email: user.email 
      });
      toast.success("Workspace exported successfully");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export workspace");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setIsImporting(true);
      const newWorkspaceId = await importWorkspaceFromJson(file, user.uid);
      toast.success("Workspace imported successfully");
      
      // Navigate to the new workspace dashboard
      navigate(`/workspace/${newWorkspaceId}/dashboard`);
      
    } catch (error) {
      console.error("Import failed:", error);
      toast.error("Failed to import workspace");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {/* Export - Only if workspace selected and in workspace mode */}
      {isWorkspaceMode && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 h-8"
          onClick={handleExport}
          disabled={isExporting}
          title="Export Workspace"
        >
          {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
          <span className="hidden md:inline text-sm">Export</span>
        </Button>
      )}

      {/* Import - Always available */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 h-8"
        onClick={handleImportClick}
        disabled={isImporting}
        title="Import Workspace"
      >
        {isImporting ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
        <span className="hidden md:inline text-sm">Import</span>
      </Button>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept=".json"
      />
    </div>
  );
};
