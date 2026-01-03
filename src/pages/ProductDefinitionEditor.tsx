import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, { 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState,
  ReactFlowProvider,
  Node,
  Edge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box, Flex, Heading, Text, IconButton, Button, DropdownMenu } from '@radix-ui/themes';
import { ArrowLeft, Download, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getProductDefinition, updateNodeDescription } from '../services/productDefinitionService';
import { exportProductDefinitionToExcel, exportProductDefinitionToMarkdown } from '../services/exportService';
import TopicEditModal from '../components/ProductDefinition/TopicEditModal';
import { ProductDefinition, ProductDefinitionNode } from '../types';

// Layout configuration
const LEVEL_1_RADIUS = 300;

// Define nodeTypes and edgeTypes outside the component
const nodeTypes = {};
const edgeTypes = {};

const ProductDefinitionEditorContent: React.FC = () => {
  const { definitionId } = useParams<{ definitionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [definition, setDefinition] = useState<ProductDefinition | null>(null);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const [selectedNode, setSelectedNode] = useState<ProductDefinitionNode | null>(null);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState<boolean>(false);

  // Generate Graph Layout
  const generateGraph = useCallback((dataNodes: Record<string, ProductDefinitionNode>) => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const root = dataNodes['root'];
    if (!root) return;

    // Define radial layout parameters
    const LEVEL_RADIUS_STEP = 350; // Distance between concentric circles

    // Function to calculate subtree size (number of leaves)
    const getLeafCount = (nodeId: string): number => {
        const node = dataNodes[nodeId];
        if (!node || !node.children || node.children.length === 0) return 1;
        return node.children.reduce((sum, childId) => sum + getLeafCount(childId), 0);
    };

    // Recursive layout function
    const processNode = (nodeId: string, radius: number, startAngle: number, endAngle: number) => {
        const node = dataNodes[nodeId];
        if (!node) return;

        // Calculate position
        // Place node in the middle of its assigned sector
        const midAngle = (startAngle + endAngle) / 2;
        const rad = (midAngle * Math.PI) / 180;
        
        const x = radius * Math.cos(rad);
        const y = radius * Math.sin(rad);

        // Styling Logic
        const isAnswered = node.description && node.description.trim().length > 0;
        const isRoot = nodeId === 'root';
        
        let style: React.CSSProperties = { 
            width: 180,
            padding: '10px',
            borderRadius: '8px',
            fontSize: '12px',
            textAlign: 'center',
            background: 'white',
            border: isAnswered ? '2px solid #10b981' : '1px solid #94a3b8',
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '50px'
        };

        if (isRoot) {
            style = {
                ...style,
                background: '#3E63DD',
                color: 'white',
                border: 'none',
                fontWeight: 'bold',
                fontSize: '14px',
                width: 200,
                height: 60,
                borderRadius: '50%' // Circular root
            };
        } else if (isAnswered) {
             style.background = '#F0FDF4';
             style.color = '#064e3b';
        }

        const label = (isAnswered && !isRoot) ? `✅ ${node.label}` : node.label;

        newNodes.push({
            id: nodeId,
            type: isRoot ? 'input' : 'default',
            position: { x, y },
            data: { label },
            style
        });

        // Process Children
        if (node.children && node.children.length > 0) {
            const totalLeaves = getLeafCount(nodeId);
            let currentStartAngle = startAngle;
            
            node.children.forEach(childId => {
                const childLeaves = getLeafCount(childId);
                // Allocate angle proportional to subtree size (leaf count)
                const angleSector = ((endAngle - startAngle) * childLeaves) / totalLeaves;
                const childEndAngle = currentStartAngle + angleSector;
                
                // Add Edge
                newEdges.push({
                    id: `${nodeId}-${childId}`,
                    source: nodeId,
                    target: childId,
                    type: 'smoothstep', // or 'straight'
                    style: { stroke: '#cbd5e1', strokeWidth: 1.5 },
                });

                // Recurse for children
                processNode(childId, radius + LEVEL_RADIUS_STEP, currentStartAngle, childEndAngle);
                
                currentStartAngle = childEndAngle;
            });
        }
    };

    // Start Layout
    // Explicitly handle Root first to avoid trig issues at r=0
    const rootNode = dataNodes['root'];
    
    newNodes.push({
        id: 'root',
        type: 'input',
        position: { x: 0, y: 0 },
        data: { label: rootNode.label },
        style: {
            background: '#3E63DD',
            color: 'white',
            border: 'none',
            fontWeight: 'bold',
            fontSize: '14px',
            width: 120,
            height: 120,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(62, 99, 221, 0.3)'
        }
    });

    if (rootNode.children) {
        const totalLeaves = getLeafCount('root');
        let currentStartAngle = 0;
        
        rootNode.children.forEach(childId => {
            const childLeaves = getLeafCount(childId);
            const angleSector = (360 * childLeaves) / totalLeaves;
            const childEndAngle = currentStartAngle + angleSector;
            
             // Add Edge from Root
             newEdges.push({
                id: `root-${childId}`,
                source: 'root',
                target: childId,
                type: 'default',
                style: { stroke: '#cbd5e1', strokeWidth: 2 },
            });

            processNode(childId, LEVEL_1_RADIUS, currentStartAngle, childEndAngle);
            currentStartAngle = childEndAngle;
        });
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [setNodes, setEdges]);

  // Fetch Definition
  useEffect(() => {
    if (!user || !definitionId) return;

    const loadData = async () => {
      try {
        const defData = await getProductDefinition(definitionId);
        if (defData) {
          setDefinition(defData);
          generateGraph(defData.data);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    loadData();
  }, [user, definitionId, generateGraph]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (definition && definition.data && definition.data[node.id]) {
        setSelectedNode(definition.data[node.id]);
        setIsTopicModalOpen(true);
    }
  }, [definition]);

  const handleSaveDescription = async (nodeId: string, newDescription: string) => {
    if (!definition || !definitionId) return;

    // Update local state
    const updatedData = { ...definition.data };
    if (updatedData[nodeId]) {
        updatedData[nodeId].description = newDescription;
        const newDef = { ...definition, data: updatedData };
        setDefinition(newDef);
        
        // Re-generate graph to update styles
        generateGraph(updatedData);
        
        // Update Database
        await updateNodeDescription(definitionId, nodeId, newDescription);
    }
  };

  if (!definition) {
    return <Flex align="center" justify="center" height="100vh"><Text>Loading...</Text></Flex>;
  }

  return (
    <Flex direction="column" className="h-full">
      {/* Header */}
      <Flex 
        justify="between" 
        align="center" 
        className="px-6 py-3 border-b border-gray-200 bg-white shadow-sm z-10"
      >
        <Flex align="center" gap="4">
          <IconButton variant="ghost" onClick={() => navigate('/product-definitions')}>
            <ArrowLeft size={20} />
          </IconButton>
          <Box>
            <Heading size="4">{definition.title}</Heading>
            <Text size="1" color="gray">Product Definition</Text>
          </Box>
        </Flex>

        <Flex align="center" gap="4">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <Button variant="surface" className="cursor-pointer">
                <Download size={16} className="mr-2" /> Export <ChevronDown size={14} className="ml-1" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item onClick={() => definition && exportProductDefinitionToExcel(definition)}>
                Excel (.xlsx)
              </DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => definition && exportProductDefinitionToMarkdown(definition)}>
                Markdown (.md)
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </Flex>
      </Flex>

      {/* Main Content: Graph */}
      <Box className="flex-grow relative bg-gray-50 h-[calc(100vh-140px)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls />
          <Background color="#aaa" gap={16} />
        </ReactFlow>
      </Box>

      {/* Modals & Overlays */}
      <TopicEditModal 
        isOpen={isTopicModalOpen}
        onClose={() => setIsTopicModalOpen(false)}
        node={selectedNode}
        onSave={handleSaveDescription}
        productTitle={definition.title}
      />
    </Flex>
  );
};

// Wrapper for ReactFlow Provider
const ProductDefinitionEditor: React.FC = () => (
  <ReactFlowProvider>
    <ProductDefinitionEditorContent />
  </ReactFlowProvider>
);

export default ProductDefinitionEditor;
