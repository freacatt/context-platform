import React, { useEffect, useState, useMemo } from 'react';
import { Box, Text, IconButton, Tooltip, Callout } from '@radix-ui/themes';
import { ZoomIn, ZoomOut, Maximize, AlertTriangle } from 'lucide-react';
import { subscribeToPyramid, updatePyramidBlocks } from '../../services/pyramidService';
import { calculateCoordinates, BLOCK_SIZE } from '../../utils/pyramidLayout';
import Block from './Block';
import BlockModal from './BlockModal';
import { Pyramid, Block as BlockType } from '../../types';

interface PyramidBoardProps {
  pyramidId: string;
  onPyramidLoaded?: (pyramid: Pyramid) => void;
}

const PyramidBoard: React.FC<PyramidBoardProps> = ({ pyramidId, onPyramidLoaded }) => {
  const [pyramid, setPyramid] = useState<Pyramid | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<BlockType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);

  // Generate connection lines
  const connections = useMemo(() => {
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
                    className="connection-line"
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
                    className="connection-line"
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
            if (onPyramidLoaded) onPyramidLoaded(data);
        } else {
            console.error("Pyramid not found");
        }
        setLoading(false);
    });

    return () => {
        if (unsubscribe) unsubscribe();
    };
  }, [pyramidId, onPyramidLoaded]);

  const handleBlockClick = (block: BlockType) => {
    setSelectedBlock(block);
    setIsModalOpen(true);
  };

  const handleSaveBlock = async (updatedBlock: BlockType) => {
    if (!pyramid) return;
    const newBlocks = { ...pyramid.blocks, [updatedBlock.id]: updatedBlock };
    setPyramid(prev => prev ? ({ ...prev, blocks: newBlocks }) : null);
    setError(null);
    
    try {
        await updatePyramidBlocks(pyramidId, newBlocks);
    } catch (err) {
        console.error("Failed to save block:", err);
        setError("Failed to save changes. Please check your connection and try again.");
    }
  };

  if (loading) return (
    <Box className="w-full h-[85vh] min-h-[600px] flex items-center justify-center bg-surface border border-border rounded-xl">
       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground"></div>
       <Text className="ml-3 text-foreground-muted">Loading Pyramid...</Text>
    </Box>
  );

  if (!pyramid) return <Text>Pyramid not found or deleted.</Text>;

  // Get parents for the modal
  const parentBlocks = selectedBlock?.parentIds?.map(id => pyramid.blocks[id]).filter(Boolean) as BlockType[] || [];

  return (
    <Box className="relative w-full h-[85vh] min-h-[600px] bg-surface border border-border rounded-xl shadow-inner overflow-hidden">
      {/* Error Toast/Callout */}
      {error && (
        <Box className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
            <Callout.Root color="red" role="alert">
                <Callout.Icon>
                    <AlertTriangle />
                </Callout.Icon>
                <Callout.Text>
                    {error}
                </Callout.Text>
                <IconButton variant="ghost" color="gray" size="1" onClick={() => setError(null)} className="ml-auto">
                    <Text size="5">×</Text>
                </IconButton>
            </Callout.Root>
        </Box>
      )}

      {/* Zoom Controls */}
      <Box className="absolute bottom-4 right-4 z-50 flex gap-2 bg-background p-2 rounded-lg shadow-md border border-border">
        <Tooltip content="Zoom Out">
            <IconButton variant="soft" color="gray" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}>
                <ZoomOut size={18} />
            </IconButton>
        </Tooltip>
        <Text className="flex items-center text-xs font-mono w-12 justify-center text-foreground">
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
                        className="absolute text-foreground-muted font-bold text-xl flex items-center justify-center z-0"
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
                        className="absolute text-foreground-muted font-bold text-xl flex items-center justify-center z-0"
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
