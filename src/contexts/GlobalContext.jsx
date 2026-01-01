import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getPyramid } from '../services/pyramidService';
import { getProductDefinition } from '../services/productDefinitionService';
import { getContextDocument } from '../services/contextDocumentService';

const GlobalContext = createContext();

export const useGlobalContext = () => useContext(GlobalContext);

export const GlobalProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  
  // State for selected context sources (array of { type, id, title })
  const [selectedSources, setSelectedSources] = useState([]);
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
  const fetchAndAggregateContext = useCallback(async (sources) => {
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
            contextText += `\n--- PYRAMID: ${p.title} ---\n`;
            contextText += `Problem: ${p.problemStatement}\n`;
            contextText += `Context: ${p.context || 'N/A'}\n`;
            if (p.blocks) {
                const rootBlock = Object.values(p.blocks).find(b => b.type === 'solution');
                if (rootBlock) contextText += `Proposed Solution: ${rootBlock.content}\n`;
            }
          } else if (source.type === 'productDefinition') {
            const pd = await getProductDefinition(source.id);
            contextText += `\n--- PRODUCT DEFINITION: ${pd.title} ---\n`;
            
            // Format the product definition tree structure
            if (pd.data && pd.data['root']) {
              const formatNode = (nodeId, depth = 0) => {
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
        } catch (e) {
          console.error(`Failed to fetch source ${source.id}`, e);
        }
      }
      setAggregatedContext(contextText);
    } catch (error) {
      console.error("Context aggregation error", error);
    } finally {
      setIsContextLoading(false);
    }
  }, []);

  // Refresh context when selected sources change or user loads
  useEffect(() => {
    fetchAndAggregateContext(selectedSources);
  }, [selectedSources, fetchAndAggregateContext]);

  // Public API
  const updateContextSources = (newSources) => {
    setSelectedSources(newSources);
  };

  const openContextModal = () => setIsContextModalOpen(true);
  const closeContextModal = () => setIsContextModalOpen(false);

  const value = {
    selectedSources,
    aggregatedContext,
    isContextLoading,
    isContextModalOpen,
    openContextModal,
    closeContextModal,
    updateContextSources
  };

  return (
    <GlobalContext.Provider value={value}>
      {children}
    </GlobalContext.Provider>
  );
};

export default GlobalContext;
