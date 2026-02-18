import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { Workspace } from '../types';
import { getUserWorkspaces, createWorkspace, deleteWorkspace, updateWorkspace } from '../services/workspaceService';

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  loading: boolean;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  createNewWorkspace: (name: string) => Promise<string>;
  removeWorkspace: (workspaceId: string) => Promise<void>;
  renameWorkspace: (workspaceId: string, name: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(() => {
    const saved = localStorage.getItem('currentWorkspaceId');
    return saved ? null : null; // We can't fully restore object here, will do in effect
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Persist current workspace
  useEffect(() => {
    if (currentWorkspace) {
      localStorage.setItem('currentWorkspaceId', currentWorkspace.id);
    }
  }, [currentWorkspace]);

  const refreshWorkspaces = async () => {
    if (!user) {
        setWorkspaces([]);
        setLoading(false);
        return;
    }
    try {
        setLoading(true);
        const userWorkspaces = await getUserWorkspaces(user.uid);
        
        setWorkspaces(userWorkspaces);

        // Restore current workspace from localStorage
        const savedId = localStorage.getItem('currentWorkspaceId');
        if (savedId) {
            const found = userWorkspaces.find(w => w.id === savedId);
            if (found) {
                setCurrentWorkspace(found);
            } else if (userWorkspaces.length > 0) {
                setCurrentWorkspace(userWorkspaces[0]);
            } else {
                setCurrentWorkspace(null);
            }
        } else if (userWorkspaces.length > 0 && !currentWorkspace) {
            setCurrentWorkspace(userWorkspaces[0]);
        } else if (userWorkspaces.length === 0) {
            setCurrentWorkspace(null);
        }

    } catch (error) {
        console.error("Error refreshing workspaces:", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    refreshWorkspaces();
  }, [user]);

  const createNewWorkspace = async (name: string) => {
    if (!user) throw new Error("No user");
    const id = await createWorkspace(user.uid, name);
    await refreshWorkspaces();
    return id;
  };

  const removeWorkspace = async (workspaceId: string) => {
    if (!user) throw new Error("No user");
    await deleteWorkspace(workspaceId, user.uid);
    await refreshWorkspaces();
    if (currentWorkspace?.id === workspaceId) {
        setCurrentWorkspace(null);
    }
  };

  const renameWorkspace = async (workspaceId: string, name: string) => {
    await updateWorkspace(workspaceId, { name });
    await refreshWorkspaces();
    if (currentWorkspace?.id === workspaceId) {
        setCurrentWorkspace(prev => prev ? { ...prev, name } : null);
    }
  };

  return (
    <WorkspaceContext.Provider value={{
        workspaces,
        currentWorkspace,
        loading,
        setCurrentWorkspace,
        createNewWorkspace,
        removeWorkspace,
        renameWorkspace,
        refreshWorkspaces
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
};
