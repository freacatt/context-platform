import { BLOCK_SIZE, calculateCoordinates, type CellGeom } from '@shared/pyramid/board';
import type { CellRecord } from '@shared/pyramid/types';

export type BlockState = 'done' | 'pending' | 'working';

interface BlockProps {
  block: CellGeom;
  record?: CellRecord;
  rootQuestion: string;
  state: BlockState;
  isSelected: boolean;
  onPath: boolean;
  onClick: (label: string) => void;
}

/** One rotated square of the pyramid, coloured like a classic wooden chess board. */
export default function Block({ block, record, rootQuestion, state, isSelected, onPath, onClick }: BlockProps) {
  const { x, y } = calculateCoordinates(block.u, block.v);
  const isLight = (block.u + block.v) % 2 === 0;
  const bgColor = isLight ? 'bg-[#f0d9b5]' : 'bg-[#b58863]';
  const textColor = isLight ? 'text-[#8b5a2b]' : 'text-[#fbeedd]';
  const content =
    block.kind === 'root' ? rootQuestion : block.kind === 'final' ? record?.cell.conclusion : record?.cell.nextQuestion;
  const clickable = state === 'done';

  return (
    <button
      type="button"
      onClick={() => clickable && onClick(block.label)}
      onMouseDown={(e) => e.stopPropagation()}
      disabled={!clickable}
      aria-label={`Block ${block.label} (${block.kind})`}
      data-state={state}
      className={`absolute flex items-center justify-center transition-all duration-200 border-2 p-0 ${bgColor}
        ${clickable ? 'cursor-pointer' : 'cursor-default'}
        ${state === 'pending' ? 'opacity-35' : ''}
        ${state === 'working' ? 'opacity-70 animate-pulse' : ''}
        ${isSelected ? 'border-blue-500 scale-110 z-10 shadow-lg' : 'border-black/10 hover:border-black/30 hover:scale-105 hover:z-10'}
        ${onPath ? 'ring-2 ring-orange-500' : ''}`}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${BLOCK_SIZE}px`,
        height: `${BLOCK_SIZE}px`,
        transform: 'translate(-50%, -50%) rotate(45deg)',
      }}
      title={content || `${block.label} (${block.kind})`}
    >
      <span
        className="relative flex flex-col items-center justify-center gap-0.5 p-1 text-center w-full h-full overflow-hidden"
        style={{ transform: 'rotate(-45deg)' }}
      >
        {record?.edited && <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-orange-500" />}
        <span className={`text-[9px] font-extrabold tracking-wide ${textColor}`}>{block.label}</span>
        {content && <span className={`text-[8px] font-bold leading-tight line-clamp-3 ${textColor}`}>{content}</span>}
      </span>
    </button>
  );
}
