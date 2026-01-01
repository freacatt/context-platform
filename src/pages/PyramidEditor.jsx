import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Container, Heading, Text, Button, Flex, Badge } from '@radix-ui/themes';
import PyramidBoard from '../components/Board/PyramidBoard';
import { ArrowLeft, Link as LinkIcon, Download } from 'lucide-react';
import { getPyramid } from '../services/pyramidService';
import { exportToExcel } from '../services/exportService';

const PyramidEditor = () => {
  const { pyramidId } = useParams();
  const navigate = useNavigate();
  const [currentPyramid, setCurrentPyramid] = useState(null);
  
  // Context Management
  const [contextSources, setContextSources] = useState([]);
  const [aggregatedContext, setAggregatedContext] = useState('');
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);

  // Load and aggregate context when pyramid loads
  useEffect(() => {
    if (currentPyramid?.contextSources) {
      setContextSources(currentPyramid.contextSources);
      fetchAndAggregateContext(currentPyramid.contextSources);
    }
  }, [currentPyramid]);

  const fetchAndAggregateContext = async (sources) => {
    let contextText = "";
    for (const source of sources) {
      try {
        if (source.type === 'contextDocument') {
          const doc = await getContextDocument(source.id);
          contextText += `Document: ${doc.title}\n${doc.content || 'No content'}\n\n`;
        } else if (source.type === 'productDefinition') {
          const def = await getProductDefinition(source.id);
          contextText += `Product Definition: ${def.title}\n${JSON.stringify(def.data, null, 2)}\n\n`;
        } else if (source.type === 'pyramid') {
          // Avoid self-reference loop if possible, but basic fetch is safe
          if (source.id === pyramidId) continue;
          const p = await getPyramid(source.id);
          contextText += `Pyramid: ${p.title}\nContext: ${p.context || 'N/A'}\n\n`;
        }
      } catch (err) {
        console.error(`Failed to load context source ${source.id}`, err);
      }
    }
    setAggregatedContext(contextText);
  };

  const handleContextUpdate = async (newSources) => {
    setContextSources(newSources);
    try {
      await updatePyramidContextSources(pyramidId, newSources);
      await fetchAndAggregateContext(newSources);
      // Update local pyramid state to reflect change
      setCurrentPyramid(prev => ({ ...prev, contextSources: newSources }));
    } catch (error) {
      console.error("Failed to update context sources:", error);
    }
  };

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
          <Button onClick={() => exportToExcel(currentPyramid)} disabled={!currentPyramid} className="cursor-pointer">
            <Download size={16} className="mr-2" /> Export to Excel
          </Button>
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
