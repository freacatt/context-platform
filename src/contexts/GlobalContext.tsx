import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useWorkspace } from './WorkspaceContext';
import { fetchContextData, formatContextDataForAI } from '../services/contextAdapter';
import { getWorkspaceGlobalContext, saveWorkspaceGlobalContext } from '../services/workspaceSettingsService';
import { ContextSource } from '../types';

interface GlobalContextType {
    selectedSources: ContextSource[];
    setSelectedSources: React.Dispatch<React.SetStateAction<ContextSource[]>>;
    aggregatedContext: string;
    isContextLoading: boolean;
    isContextModalOpen: boolean;
    setIsContextModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    refreshAggregatedContext: () => Promise<void>;
}

export const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const useGlobalContext = () => {
    const context = useContext(GlobalContext);
    if (context === undefined) {
        throw new Error('useGlobalContext must be used within a GlobalProvider');
    }
    return context;
};

export const GlobalProvider = ({ children }: { children: ReactNode }) => {
  const { loading: authLoading } = useAuth();
  const { currentWorkspace } = useWorkspace();
  
  // State for selected context sources (array of { type, id, title })
  const [selectedSources, setSelectedSources] = useState<ContextSource[]>([]);
  // We use initializedWorkspaceId to track which workspace the current selectedSources belongs to.
  // This prevents saving one workspace's data to another workspace's profile during switching.
  const [initializedWorkspaceId, setInitializedWorkspaceId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);

  const [aggregatedContext, setAggregatedContext] = useState("");
  const [isContextLoading, setIsContextLoading] = useState(false);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);

  // Load from Firebase when workspace changes
  useEffect(() => {
    if (authLoading) return;

    if (!currentWorkspace) {
      setSelectedSources([]);
      setInitializedWorkspaceId(null);
      return;
    }

    // Don't reload if already initialized for this workspace
    if (initializedWorkspaceId === currentWorkspace.id) return;

    // Fetch from Firebase
    console.log("GlobalContext: Fetching from Firebase for workspace", currentWorkspace.id);
    setInitializedWorkspaceId(null); // Reset initialization state when workspace changes
    setLoadError(null);
    
    getWorkspaceGlobalContext(currentWorkspace.id)
        .then(sources => {
            console.log("GlobalContext: Fetched sources:", sources);
            if (sources) {
                setSelectedSources(sources);
            } else {
                setSelectedSources([]);
            }
        })
        .catch(err => {
            console.error("Failed to load global context sources", err);
            setLoadError(err as Error);
            // We keep selectedSources as [] (default) but loadError prevents saving
        })
        .finally(() => {
            setInitializedWorkspaceId(currentWorkspace.id);
        });
  }, [currentWorkspace, authLoading, initializedWorkspaceId]);

  // Save to Firebase whenever selectedSources changes
  useEffect(() => {
    // Don't save if:
    // 1. Auth is loading
    // 2. No workspace
    // 3. Not initialized for THIS workspace (prevents cross-workspace data leak or overwriting)
    // 4. Load error occurred (prevent overwriting with empty)
    if (authLoading || !currentWorkspace || initializedWorkspaceId !== currentWorkspace.id || loadError) return;
    
    console.log("GlobalContext: Saving sources to Firebase:", selectedSources);
    // Save to Firebase (fire and forget)
    saveWorkspaceGlobalContext(currentWorkspace.id, selectedSources)
        .catch(err => console.error("Failed to save global context sources", err));
  }, [selectedSources, currentWorkspace, authLoading, initializedWorkspaceId, loadError]);

  // Fetch and aggregate context data
  const fetchAndAggregateContext = useCallback(async (sources: ContextSource[]) => {
    if (!sources || sources.length === 0) {
      setAggregatedContext("");
      return;
    }

    setIsContextLoading(true);
    
    try {
        // Fetch all data in parallel
        // Note: fetchContextData likely needs workspaceId if it fetches data dependent on workspace.
        // Let's check fetchContextData later.
        const results = await Promise.all(sources.map(s => fetchContextData(s)));

        let contextText = "### GLOBAL CONTEXT SUMMARY\nThe following items are included in this context:\n";
        
        // Add Table of Contents with REAL titles from the fetch result
        results.forEach((r, index) => {
            contextText += `${index + 1}. [${r.type}] ${r.title}`;
            if (r.error) contextText += " (Error Loading)";
            contextText += "\n";
        });
        
        contextText += "\n### DETAILED CONTENT\n\n";

        // Add formatted content
        for (const result of results) {
            contextText += formatContextDataForAI(result);
            contextText += "\n";
        }

        setAggregatedContext(contextText);
    } catch (error) {
        console.error("Error aggregating context", error);
        setAggregatedContext("Error loading global context data.");
    } finally {
        setIsContextLoading(false);
    }
  }, []);

  // Update aggregated context when selectedSources changes
  useEffect(() => {
      if (initializedWorkspaceId) {
          fetchAndAggregateContext(selectedSources);
      }
  }, [selectedSources, initializedWorkspaceId, fetchAndAggregateContext]);

  const refreshAggregatedContext = async () => {
      await fetchAndAggregateContext(selectedSources);
  };

  const value = {
      selectedSources,
      setSelectedSources,
      aggregatedContext,
      isContextLoading,
      isContextModalOpen,
      setIsContextModalOpen,
      refreshAggregatedContext
  };

  return <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>;
};
