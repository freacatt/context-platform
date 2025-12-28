import React, { useEffect, useState } from 'react';
import { Box, Text, Flex, IconButton, Tooltip } from '@radix-ui/themes';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { subscribeToPyramid, updatePyramidBlocks } from '../../services/pyramidService';
import { calculateCoordinates, BLOCK_SIZE } from '../../utils/pyramidLayout';
import Block from './Block';
import BlockModal from './BlockModal';

const PyramidBoard = ({ pyramidId }) => {
  const [pyramid, setPyramid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Generate connection lines
  // Moved up to avoid conditional hook execution error
  const connections = React.useMemo(() => {
    const lines = [];
    for (let u = 0; u < 8; u++) {
      for (let v = 0; v < 8; v++) {
        const start = calculateCoordinates(u, v);
        
        // Connect to u+1 (Bottom Left visually)
        if (u < 7) {
            const end = calculateCoordinates(u + 1, v);
            lines.push(
                <line 
                    key={`conn-u-${u}-${v}`}
                    x1={start.x} y1={start.y}
                    x2={end.x} y2={end.y}
                    stroke="#94a3b8" 
                    strokeWidth="2"
                    strokeOpacity="0.5"
                />
            );
        }

        // Connect to v+1 (Bottom Right visually)
        if (v < 7) {
            const end = calculateCoordinates(u, v + 1);
            lines.push(
                <line 
                    key={`conn-v-${u}-${v}`}
                    x1={start.x} y1={start.y}
                    x2={end.x} y2={end.y}
                    stroke="#94a3b8" 
                    strokeWidth="2"
                    strokeOpacity="0.5"
                />
            );
        }
      }
    }
    return lines;
  }, []);

  useEffect(() => {
    if (!pyramidId) return;

    const unsubscribe = subscribeToPyramid(pyramidId, (data) => {
        if (data) {
            setPyramid(data);
        } else {
            console.error("Pyramid not found");
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, [pyramidId]);

  const handleBlockClick = (block) => {
    setSelectedBlock(block);
    setIsModalOpen(true);
  };

  const handleSaveBlock = async (updatedBlock) => {
    const newBlocks = { ...pyramid.blocks, [updatedBlock.id]: updatedBlock };
    setPyramid(prev => ({ ...prev, blocks: newBlocks }));
    
    try {
        await updatePyramidBlocks(pyramidId, newBlocks);
    } catch (error) {
        console.error("Failed to save block:", error);
        // Optionally revert state here
    }
  };

  if (loading) return <Text>Loading board...</Text>;
  if (!pyramid) return <Text>Pyramid not found or deleted.</Text>;

  // Get parents for the modal
  const parentBlocks = selectedBlock?.parentIds?.map(id => pyramid.blocks[id]).filter(Boolean) || [];

  return (
    <Box className="relative w-full h-[85vh] min-h-[600px] bg-slate-100 border border-slate-300 rounded-xl shadow-inner overflow-hidden">
      {/* Zoom Controls */}
      <Box className="absolute bottom-4 right-4 z-50 flex gap-2 bg-white p-2 rounded-lg shadow-md">
        <Tooltip content="Zoom Out">
            <IconButton variant="soft" color="gray" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}>
                <ZoomOut size={18} />
            </IconButton>
        </Tooltip>
        <Text className="flex items-center text-xs font-mono w-12 justify-center">
            {Math.round(zoom * 100)}%
        </Text>
        <Tooltip content="Zoom In">
            <IconButton variant="soft" color="gray" onClick={() => setZoom(z => Math.min(2, z + 0.1))}>
                <ZoomIn size={18} />
            </IconButton>
        </Tooltip>
        <Tooltip content="Reset Zoom">
            <IconButton variant="ghost" color="gray" onClick={() => setZoom(1)}>
                <Maximize size={18} />
            </IconButton>
        </Tooltip>
      </Box>

      {/* Scrollable Container */}
      <div className="w-full h-full overflow-auto">
        <div 
            className="relative min-w-[1000px] min-h-[1200px] transition-transform duration-200 origin-top-center"
            style={{ 
                transform: `scale(${zoom})`,
                transformOrigin: '50% 100px' // Pin zoom to top center area
            }}
        >
          {/* Board Center Wrapper */}
          <div className="absolute left-1/2 top-32">
            
            {/* Connection Lines */}
            <svg className="absolute overflow-visible pointer-events-none z-0" style={{ left: 0, top: 0 }}>
                {connections}
            </svg>

            {/* Render Axes Labels */}
            {Array.from({ length: 8 }).map((_, u) => {
                const { x, y } = calculateCoordinates(u, -0.8);
                return (
                    <div 
                        key={`label-u-${u}`}
                        className="absolute text-slate-700 font-bold text-xl flex items-center justify-center z-0"
                        style={{
                            left: x,
                            top: y,
                            width: BLOCK_SIZE,
                            height: BLOCK_SIZE,
                            transform: 'translate(-50%, -50%)',
                        }}
                    >
                        {u + 1}
                    </div>
                );
            })}

            {Array.from({ length: 8 }).map((_, v) => {
                const { x, y } = calculateCoordinates(-0.8, v);
                return (
                    <div 
                        key={`label-v-${v}`}
                        className="absolute text-slate-700 font-bold text-xl flex items-center justify-center z-0"
                        style={{
                            left: x,
                            top: y,
                            width: BLOCK_SIZE,
                            height: BLOCK_SIZE,
                            transform: 'translate(-50%, -50%)',
                        }}
                    >
                        {String.fromCharCode(65 + v)}
                    </div>
                );
            })}

            {/* Render Blocks */}
            {pyramid.blocks && Object.values(pyramid.blocks).map(block => (
              <Block 
                key={block.id} 
                block={block} 
                onClick={handleBlockClick}
                isSelected={selectedBlock?.id === block.id}
              />
            ))}
          </div>
        </div>
      </div>

      <BlockModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        block={selectedBlock}
        parents={parentBlocks}
        allBlocks={pyramid.blocks}
        onSave={handleSaveBlock}
        pyramidContext={pyramid.context}
      />
    </Box>
  );
};

export default PyramidBoard;
