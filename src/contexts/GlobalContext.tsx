import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getPyramid } from '../services/pyramidService';
import { getProductDefinition } from '../services/productDefinitionService';
import { getContextDocument } from '../services/contextDocumentService';

interface ContextSource {
    type: 'pyramid' | 'productDefinition' | 'contextDocument';
    id: string;
    title: string;
}

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
  const { user, loading: authLoading } = useAuth();
  
  // State for selected context sources (array of { type, id, title })
  const [selectedSources, setSelectedSources] = useState<ContextSource[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const [aggregatedContext, setAggregatedContext] = useState("");
  const [isContextLoading, setIsContextLoading] = useState(false);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);

  // Load from local storage when user changes
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setSelectedSources([]);
      setIsInitialized(true);
      return;
    }
    const key = `globalContextSources_${user.uid}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setSelectedSources(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved context sources", e);
        setSelectedSources([]);
      }
    } else {
      setSelectedSources([]);
    }
    setIsInitialized(true);
  }, [user, authLoading]);

  // Save to local storage whenever selectedSources changes
  useEffect(() => {
    if (authLoading || !user || !isInitialized) return;
    const key = `globalContextSources_${user.uid}`;
    localStorage.setItem(key, JSON.stringify(selectedSources));
  }, [selectedSources, user, authLoading, isInitialized]);

  // Fetch and aggregate context data
  const fetchAndAggregateContext = useCallback(async (sources: ContextSource[]) => {
    if (!sources || sources.length === 0) {
      setAggregatedContext("");
      return;
    }

    setIsContextLoading(true);
    let contextText = "";

    try {
      for (const source of sources) {
        try {
          if (source.type === 'pyramid') {
            const p = await getPyramid(source.id);
            if (p) {
                contextText += `\n--- PYRAMID: ${p.title} ---\n`;
                // p.context might be null, check types
                contextText += `Context: ${p.context || 'N/A'}\n`;
                if (p.blocks) {
                    const rootBlock = Object.values(p.blocks).find(b => b.type === 'solution'); // 'solution' type check
                    if (rootBlock) contextText += `Proposed Solution: ${rootBlock.content}\n`;
                }
            }
          } else if (source.type === 'productDefinition') {
            const pd = await getProductDefinition(source.id);
            contextText += `\n--- PRODUCT DEFINITION: ${pd.title} ---\n`;
            
            // Format the product definition tree structure
            if (pd.data && pd.data['root']) {
              const formatNode = (nodeId: string, depth = 0): string => {
                const node = pd.data[nodeId];
                if (!node) return "";
                
                const indent = "  ".repeat(depth);
                let text = `${indent}- ${node.label}`;
                if (node.description) {
                   text += `: ${node.description}`;
                }
                text += "\n";
                
                if (node.children) {
                  node.children.forEach(childId => {
                    text += formatNode(childId, depth + 1);
                  });
                }
                return text;
              };
              
              contextText += formatNode('root');
            }
          } else if (source.type === 'contextDocument') {
             const doc = await getContextDocument(source.id);
             contextText += `\n--- DOCUMENT: ${doc.title} ---\n`;
             contextText += `${doc.content}\n`;
          }
        } catch (err) {
            console.error(`Failed to fetch context from source ${source.title}`, err);
            contextText += `\n[Error fetching content from ${source.title}]\n`;
        }
      }
      setAggregatedContext(contextText);
    } catch (error) {
        console.error("Error aggregating context", error);
    } finally {
        setIsContextLoading(false);
    }
  }, []);

  // Update aggregated context when selectedSources changes
  useEffect(() => {
      if (isInitialized) {
          fetchAndAggregateContext(selectedSources);
      }
  }, [selectedSources, isInitialized, fetchAndAggregateContext]);

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
