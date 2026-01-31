import React from 'react';
import { calculateCoordinates } from '../../utils/pyramidLayout';
import { Bot } from 'lucide-react';
import { Block as BlockType } from '../../types';

interface BlockProps {
  block: BlockType;
  onClick: (block: BlockType) => void;
  isSelected: boolean;
}

const Block: React.FC<BlockProps> = ({ block, onClick, isSelected }) => {
  const { x, y } = calculateCoordinates(block.u, block.v);
  const isWhite = (block.u + block.v) % 2 === 0;
  
  // Base Colors (Classic Wood Chess Board)
  const bgColor = isWhite ? 'bg-[#f0d9b5]' : 'bg-[#b58863]';
  const textColor = isWhite ? 'text-[#b58863]' : 'text-[#f0d9b5]';

  return (
    <div
      onClick={() => onClick(block)}
      className={`absolute w-12 h-12 flex items-center justify-center cursor-pointer transition-all duration-200 border-2
        ${bgColor}
        ${isSelected ? 'border-blue-500 scale-110 z-10 shadow-lg' : 'border-black/10 hover:border-black/30 hover:scale-105 hover:z-10'}
        ${block.isAI ? 'ring-2 ring-purple-400' : ''}
      `}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translate(-50%, -50%)',
      }}
      title={block.content || `Block ${block.u},${block.v}`}
    >
      <div className="flex flex-col items-center justify-center p-1 text-center w-full h-full overflow-hidden">
        {block.isAI && (
           <Bot size={10} className="text-purple-600 absolute top-0.5 right-0.5" />
        )}
        <span className={`text-[10px] font-bold leading-tight line-clamp-3 select-none ${textColor}`}>
            {block.content ? block.content : `${block.u},${block.v}`}
        </span>
      </div>
    </div>
  );
};

export default Block;
