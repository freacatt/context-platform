import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Container, Heading, Text, Button, Flex, DropdownMenu } from '@radix-ui/themes';
import PyramidBoard from '../components/Board/PyramidBoard';
import { ArrowLeft, Download, ChevronDown } from 'lucide-react';
import { getPyramid, updatePyramidContextSources } from '../services/pyramidService';
import { getContextDocument } from '../services/contextDocumentService';
import { getProductDefinition } from '../services/productDefinitionService';
import { exportPyramidToExcel, exportPyramidToMarkdown } from '../services/exportService';
import { Pyramid, ContextSource } from '../types';

const PyramidEditor: React.FC = () => {
  const { pyramidId } = useParams<{ pyramidId: string }>();
  const navigate = useNavigate();
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
    return <Box>Error: Pyramid ID is missing.</Box>;
  }

  return (
    <Box className="h-full bg-gray-50">
      <Container size="4" className="p-4 pb-2">
        <Flex justify="between" align="center" className="mb-4">
            <Button variant="ghost" color="gray" onClick={() => navigate('/dashboard')} className="hover:bg-gray-200">
                <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
            </Button>
            {/* Global Context is now in Navbar */}
        </Flex>
        
        <Flex justify="between" align="center" className="mb-6">
          <Box>
            <Heading size="6">Pyramid Editor</Heading>
            <Text color="gray" size="2">ID: {pyramidId}</Text>
          </Box>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <Button disabled={!currentPyramid} className="cursor-pointer">
                <Download size={16} className="mr-2" /> Export <ChevronDown size={14} className="ml-1" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item onClick={() => currentPyramid && exportPyramidToExcel(currentPyramid)}>
                Excel (.xlsx)
              </DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => currentPyramid && exportPyramidToMarkdown(currentPyramid)}>
                Markdown (.md)
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </Flex>
      </Container>
      
      <Box className="px-4 w-full relative">
        <PyramidBoard 
            pyramidId={pyramidId} 
            onPyramidLoaded={setCurrentPyramid} 
        />
      </Box>
    </Box>
  );
};

export default PyramidEditor;
