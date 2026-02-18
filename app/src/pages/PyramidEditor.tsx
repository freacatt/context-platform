import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PyramidBoard from '../components/Board/PyramidBoard';
import { ArrowLeft, Download } from 'lucide-react';
import { getPyramid, updatePyramidContextSources } from '../services/pyramidService';
import { getContextDocument } from '../services/contextDocumentService';
import { getProductDefinition } from '../services/productDefinitionService';
import { exportPyramidToExcel, exportPyramidToMarkdown } from '../services/exportService';
import { Pyramid, ContextSource } from '../types';
import { useWorkspace } from '../contexts/WorkspaceContext';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PyramidEditor: React.FC = () => {
  const { pyramidId } = useParams<{ pyramidId: string }>();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [currentPyramid, setCurrentPyramid] = useState<Pyramid | null>(null);
  
  // Context Management
  const [contextSources, setContextSources] = useState<ContextSource[]>([]);
  const [aggregatedContext, setAggregatedContext] = useState<string>('');

  // Load and aggregate context when pyramid loads
  useEffect(() => {
    if (currentPyramid?.contextSources) {
      setContextSources(currentPyramid.contextSources);
      fetchAndAggregateContext(currentPyramid.contextSources);
    }
  }, [currentPyramid]);

  const fetchAndAggregateContext = async (sources: ContextSource[]) => {
    let contextText = "";
    for (const source of sources) {
      try {
        if (source.type === 'contextDocument') {
          const doc = await getContextDocument(source.id);
          if (doc) {
             contextText += `Document: ${doc.title}\n${doc.content || 'No content'}\n\n`;
          }
        } else if (source.type === 'productDefinition') {
          const def = await getProductDefinition(source.id);
          if (def) {
             contextText += `Product Definition: ${def.title}\n${JSON.stringify(def.data, null, 2)}\n\n`;
          }
        } else if (source.type === 'pyramid') {
          // Avoid self-reference loop if possible, but basic fetch is safe
          if (source.id === pyramidId) continue;
          const p = await getPyramid(source.id);
          if (p) {
            contextText += `Pyramid: ${p.title}\nContext: ${p.context || 'N/A'}\n\n`;
          }
        }
      } catch (err) {
        console.error(`Failed to load context source ${source.id}`, err);
      }
    }
    setAggregatedContext(contextText);
  };

  const handleContextUpdate = async (newSources: ContextSource[]) => {
    if (!pyramidId) return;
    
    setContextSources(newSources);
    try {
      await updatePyramidContextSources(pyramidId, newSources);
      await fetchAndAggregateContext(newSources);
      // Update local pyramid state to reflect change
      setCurrentPyramid(prev => prev ? ({ ...prev, contextSources: newSources }) : null);
    } catch (error) {
      console.error("Failed to update context sources:", error);
    }
  };

  if (!pyramidId) {
    return <div>Error: Pyramid ID is missing.</div>;
  }

  return (
    <div className="h-full bg-muted/20 flex flex-col">
      <div className="container mx-auto p-4 pb-2">
        <div className="flex justify-between items-center mb-4">
            <Button variant="ghost" onClick={() => navigate(currentWorkspace ? `/workspace/${currentWorkspace.id}/dashboard` : '/workspaces')} className="hover:bg-muted">
                <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
            </Button>
            {/* Global Context is now in Navbar */}
        </div>
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pyramid Editor</h1>
            <p className="text-sm text-muted-foreground">ID: {pyramidId}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={!currentPyramid} className="cursor-pointer">
                <Download size={16} className="mr-2" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => currentPyramid && exportPyramidToExcel(currentPyramid)}>
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => currentPyramid && exportPyramidToMarkdown(currentPyramid)}>
                Markdown (.md)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="px-4 w-full relative flex-grow">
        <PyramidBoard 
            pyramidId={pyramidId} 
            onPyramidLoaded={setCurrentPyramid} 
        />
      </div>
    </div>
  );
};

export default PyramidEditor;
