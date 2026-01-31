import React, { useEffect, useState, useMemo } from 'react';
import { ZoomIn, ZoomOut, Maximize, AlertTriangle } from 'lucide-react';
import { subscribeToPyramid, updatePyramidBlocks } from '../../services/pyramidService';
import { calculateCoordinates, BLOCK_SIZE } from '../../utils/pyramidLayout';
import Block from './Block';
import BlockModal from './BlockModal';
import { Pyramid, Block as BlockType } from '../../types';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  
  // Viewport State
  const [scale, setScale] = useState<number>(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const unsubscribe = subscribeToPyramid(pyramidId, (data) => {
      setPyramid(data);
      setLoading(false);
      if (onPyramidLoaded && data) {
        onPyramidLoaded(data);
      }
    });
    return () => unsubscribe();
  }, [pyramidId, onPyramidLoaded]);

  const handleBlockClick = (block: BlockType) => {
    setSelectedBlock(block);
    setIsModalOpen(true);
  };

  const handleBlockModalSave = async (updatedBlock: BlockType) => {
      if (!pyramid) return;

      const updatedBlocks = { ...pyramid.blocks };
      updatedBlocks[updatedBlock.id] = updatedBlock;

      try {
        await updatePyramidBlocks(pyramidId, updatedBlocks);
        // Optimistic update
        setPyramid({ ...pyramid, blocks: updatedBlocks });
        setIsModalOpen(false);
      } catch (err) {
        console.error("Failed to update block", err);
        // Use a more user-friendly error notification in a real app
        alert("Failed to save block content.");
      }
  };

  // --- Zoom & Pan Controls ---
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));
  const handleResetView = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const onMouseUp = () => setIsDragging(false);

  // Calculate board dimensions based on blocks
  const boardBounds = useMemo(() => {
      if (!pyramid?.blocks) return { width: 800, height: 600 };
      
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      
      Object.values(pyramid.blocks).forEach(b => {
          const { x, y } = calculateCoordinates(b.u, b.v);
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
      });

      // Add padding
      const padding = 200;
      return {
          width: Math.max(800, (maxX - minX) + padding * 2),
          height: Math.max(600, (maxY - minY) + padding * 2),
          centerX: (minX + maxX) / 2,
          centerY: (minY + maxY) / 2
      };
  }, [pyramid]);


  if (loading) return <div className="flex justify-center items-center h-full">Loading Board...</div>;
  if (error) return (
    <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
  if (!pyramid) return <div className="flex justify-center items-center h-full">Pyramid not found.</div>;

  const getParentBlocks = (block: BlockType): BlockType[] => {
      if (!block.parentIds) return [];
      return block.parentIds.map(id => pyramid.blocks[id]).filter(Boolean);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-50 dark:bg-slate-900 select-none">
      {/* Toolbar */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-background/80 backdrop-blur-sm p-2 rounded-lg shadow-md border">
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={handleZoomIn}>
                        <ZoomIn size={20} />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Zoom In</TooltipContent>
            </Tooltip>
            
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={handleZoomOut}>
                        <ZoomOut size={20} />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Zoom Out</TooltipContent>
            </Tooltip>

             <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={handleResetView}>
                        <Maximize size={20} />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Reset View</TooltipContent>
            </Tooltip>
        </TooltipProvider>
      </div>

      {/* Canvas */}
      <div 
        className="w-full h-full cursor-move"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div 
            style={{
                transform: `translate(${offset.x + window.innerWidth/2}px, ${offset.y + window.innerHeight/2}px) scale(${scale})`,
                transformOrigin: '0 0',
                transition: isDragging ? 'none' : 'transform 0.2s ease-out'
            }}
            className="absolute top-0 left-0 w-0 h-0" // Centering trick
        >
            {/* Pyramid Container - Centered relative to the transform origin */}
             <div className="relative">
                {Object.values(pyramid.blocks).map((block) => (
                    <Block 
                        key={`${block.u}-${block.v}`} 
                        block={block} 
                        onClick={handleBlockClick}
                        isSelected={selectedBlock?.u === block.u && selectedBlock?.v === block.v}
                    />
                ))}
             </div>
        </div>
      </div>

      {/* Block Editor Modal */}
      {selectedBlock && (
        <BlockModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          block={selectedBlock}
          parents={getParentBlocks(selectedBlock)}
          onSave={handleBlockModalSave}
          pyramidContext={pyramid.context}
          allBlocks={pyramid.blocks}
        />
      )}
    </div>
  );
};

export default PyramidBoard;