import React from 'react';
import { Text } from '@radix-ui/themes';
import { calculateCoordinates, BLOCK_SIZE } from '../../utils/pyramidLayout';
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

  // Determine border color based on type
  let typeColorClass = '';
  const hasQuestion = block.question && block.question.trim().length > 0;
  const hasAnswer = block.answer && block.answer.trim().length > 0;
  const parentCount = block.parentIds ? block.parentIds.length : 0;

  if (hasQuestion && !hasAnswer) {
    typeColorClass = 'border-blue-400 border-2'; // Question only
  } else if (hasQuestion && hasAnswer) {
    typeColorClass = 'border-green-400 border-2'; // Answer-Question
  } else if (parentCount > 1) {
    typeColorClass = 'border-orange-500 border-2'; // Combined
  } else {
      // Default / Empty state
      typeColorClass = 'border-black/20 border';
  }
  
  // Selection style overrides type border
  const selectionStyle = isSelected 
    ? 'ring-4 ring-white ring-offset-2 ring-offset-black z-20' 
    : `${typeColorClass} hover:scale-105 hover:shadow-lg z-10`;

  // Content Truncation
  // Prioritize showing Question, then Content, then Answer as fallback
  const displayContent = block.question || block.content || block.answer || '';
  const hasContent = displayContent.length > 0;
  
  // Truncate logic: Show first 25 chars if content exists
  const truncatedContent = displayContent.length > 25 
    ? displayContent.substring(0, 25) + '...' 
    : displayContent;

  // Chess Label (e.g., 1-A)
  const getChessLabel = (u: number, v: number) => {
    const rank = u + 1;
    const file = String.fromCharCode(65 + v);
    return `${rank}-${file}`;
  };

  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        onClick(block);
      }}
      className={`absolute flex items-center justify-center shadow-sm cursor-pointer transition-all duration-200 ease-in-out block-enter ${bgColor} ${selectionStyle}`}
      style={{
        width: BLOCK_SIZE,
        height: BLOCK_SIZE,
        left: x,
        top: y,
        transform: 'translate(-50%, -50%) rotate(45deg)', // Default for when animation finishes or if overwritten
      }}
    >
      {/* Counter-rotated content container */}
      <div 
        style={{ transform: 'rotate(-45deg)' }} 
        className="flex flex-col items-center justify-center w-full h-full p-1 relative"
      >
        {/* Type Indicator Dot (Optional additional cue) */}
         <div 
            className={`absolute top-0 right-0 w-2 h-2 rounded-full m-1 ${
               hasQuestion && !hasAnswer ? 'bg-blue-500' : 
               hasQuestion && hasAnswer ? 'bg-green-500' :
               parentCount > 1 ? 'bg-orange-500' : 'bg-transparent'
            }`}
        />

        {/* AI Indicator */}
        {block.isAiGenerated && (
            <Bot size={12} className={`absolute top-0 left-0 m-1 ${textColor}`} />
        )}

        {/* Coordinate Label OR Content */}
        {!hasContent ? (
            <Text size="3" weight="bold" className={`${textColor} opacity-80`}>
                {getChessLabel(block.u, block.v)}
            </Text>
        ) : (
            <Text 
                size="1" 
                weight="medium"
                className={`${textColor} text-[10px] leading-tight text-center break-words w-full max-h-[60px] overflow-hidden px-1`}
            >
                {truncatedContent}
            </Text>
        )}
      </div>
    </div>
  );
};

export default Block;
