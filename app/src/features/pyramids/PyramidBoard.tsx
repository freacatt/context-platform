import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Maximize, ZoomIn, ZoomOut, type LucideIcon } from 'lucide-react';
import { BLOCK_SIZE, SPACING, cells as boardCells, criticalPath } from '@shared/pyramid/board';
import type { CellRecord } from '@shared/pyramid/types';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Block, { type BlockState } from './Block';

interface PyramidBoardProps {
  size: number;
  records: Record<string, CellRecord>;
  rootQuestion: string;
  /** Last committed row. */
  currentRow: number;
  running: boolean;
  selected: string | null;
  onSelect: (label: string) => void;
}

const PADDING = 48;
const MIN_SCALE = 0.3;
const MAX_SCALE = 2;

function ToolButton({ label, icon: Icon, onClick }: { label: string; icon: LucideIcon; onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={onClick} aria-label={label}>
          <Icon size={20} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
  );
}

/** Pan/zoom canvas holding the diamond of blocks; fits the board to the view. */
export default function PyramidBoard({ size, records, rootQuestion, currentRow, running, selected, onSelect }: PyramidBoardProps) {
  const geometry = useMemo(() => boardCells(size), [size]);
  const path = useMemo(
    () => new Set(criticalPath(size, (l) => records[l]?.cell.primaryParent, (l) => l in records)),
    [size, records],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  // Board extent: (2n-2) half-diagonals wide and tall, plus one block.
  const extent = (2 * size - 2) * (SPACING / 2) + BLOCK_SIZE * Math.SQRT2;

  const fitToView = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const w = el.clientWidth || 800;
    const h = el.clientHeight || 600;
    setWidth(w);
    setScale(Math.max(MIN_SCALE, Math.min(1.2, (w - PADDING) / extent, (h - PADDING) / extent)));
    setOffset({ x: 0, y: 0 });
  }, [extent]);

  // ResizeObserver reports the initial size too, so this also fits on mount and on a new board size.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => fitToView());
    observer.observe(el);
    return () => observer.disconnect();
  }, [fitToView]);

  const stateOf = (label: string, row: number, kind: string): BlockState => {
    if (kind === 'root' || label in records) return 'done';
    if (running && row === currentRow + 1) return 'working';
    return 'pending';
  };

  const top = PADDING / 2 + (BLOCK_SIZE * Math.SQRT2 * scale) / 2;

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-slate-50 dark:bg-slate-900 select-none rounded-lg border">
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-background/80 backdrop-blur-sm p-2 rounded-lg shadow-md border">
        <TooltipProvider>
          <ToolButton label="Zoom In" icon={ZoomIn} onClick={() => setScale((s) => Math.min(s + 0.1, MAX_SCALE))} />
          <ToolButton label="Zoom Out" icon={ZoomOut} onClick={() => setScale((s) => Math.max(s - 0.1, MIN_SCALE))} />
          <ToolButton label="Reset View" icon={Maximize} onClick={fitToView} />
        </TooltipProvider>
      </div>

      <div
        className="w-full h-full cursor-move"
        onMouseDown={(e) => setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })}
        onMouseMove={(e) => dragStart && setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })}
        onMouseUp={() => setDragStart(null)}
        onMouseLeave={() => setDragStart(null)}
      >
        <div
          style={{
            transform: `translate(${offset.x + width / 2}px, ${offset.y + top}px) scale(${scale})`,
            transformOrigin: '0 0',
            transition: dragStart ? 'none' : 'transform 0.2s ease-out',
          }}
          className="absolute top-0 left-0 w-0 h-0"
        >
          <div className="relative">
            {geometry.map((g) => (
              <Block
                key={g.label}
                block={g}
                record={records[g.label]}
                rootQuestion={rootQuestion}
                state={stateOf(g.label, g.row, g.kind)}
                isSelected={selected === g.label}
                onPath={path.has(g.label)}
                onClick={onSelect}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
