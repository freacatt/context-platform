import React, { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useAlert } from './AlertContext';
import { Workspace } from '../types';
import {
  getUserWorkspaces,
  createWorkspace,
  deleteWorkspace,
  updateWorkspace,
  setupWorkspaceAgentPlatform,
} from '../services/workspaceService';
import { storage } from '../services/storage';

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
  const { user, isGuest } = useAuth();
  const { showAlert } = useAlert();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
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

  // Auto-setup agent-platform for existing workspaces that haven't been configured yet
  const setupInProgressRef = useRef<Set<string>>(new Set());

  const ensureWorkspaceSetup = useCallback(async (workspace: Workspace) => {
    // Skip if: already configured, guest user, or setup already in progress for this workspace
    if (workspace.gmAgentId || isGuest || !user) return;
    if (setupInProgressRef.current.has(workspace.id)) return;

    setupInProgressRef.current.add(workspace.id);
    try {
      const result = await setupWorkspaceAgentPlatform(workspace.id, workspace.name);
      // Update the local state with the new agent IDs
      setCurrentWorkspace(prev =>
        prev?.id === workspace.id
          ? { ...prev, gmAgentId: result.gmAgentId, aiRecommendationAgentId: result.gmAgentId, aiChatAgentId: result.gmAgentId }
          : prev
      );
      setWorkspaces(prev =>
        prev.map(w =>
          w.id === workspace.id
            ? { ...w, gmAgentId: result.gmAgentId, aiRecommendationAgentId: result.gmAgentId, aiChatAgentId: result.gmAgentId }
            : w
        )
      );
    } catch (error: any) {
      console.error(`Auto-setup failed for workspace ${workspace.id}:`, error);
      showAlert({
        type: "warning",
        title: "AI Setup Pending",
        message: "Could not configure AI for this workspace. AI features may be unavailable. You can retry from AI Settings.",
      });
    } finally {
      setupInProgressRef.current.delete(workspace.id);
    }
  }, [user, isGuest, showAlert]);

  useEffect(() => {
    if (currentWorkspace && !currentWorkspace.gmAgentId && user && !isGuest) {
      ensureWorkspaceSetup(currentWorkspace);
    }
  }, [currentWorkspace?.id, currentWorkspace?.gmAgentId, user, isGuest, ensureWorkspaceSetup]);

  const createNewWorkspace = async (name: string) => {
    if (!user) throw new Error("No user");

    // 1. Create workspace locally (Dexie + Firestore)
    const id = await createWorkspace(user.uid, name);

    // 2. If authenticated (not guest), set up agent-platform infrastructure
    if (!isGuest) {
      try {
        await setupWorkspaceAgentPlatform(id, name);
      } catch (error: any) {
        // Rollback: delete the locally created workspace
        try {
          await storage.delete('workspaces', id);
        } catch {
          // Rollback failed — best effort
        }
        const message = error?.message || "Failed to set up AI workspace. Please try again.";
        showAlert({ type: "error", title: "Workspace Setup Failed", message });
        throw error;
      }
    }

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
