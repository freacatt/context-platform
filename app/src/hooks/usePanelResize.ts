import { useState, useRef, useCallback, useEffect } from 'react';

// Direction bitmask (same pattern as image-resizer.tsx)
export const EAST = 1 << 0;
export const SOUTH = 1 << 1;
export const WEST = 1 << 2;
export const NORTH = 1 << 3;

interface UsePanelResizeOptions {
  initialWidth: number;
  initialHeight: number;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  position: { x: number; y: number };
  onPositionChange: (pos: { x: number; y: number }) => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getCursor(direction: number): string {
  const ew = direction === EAST || direction === WEST;
  const ns = direction === NORTH || direction === SOUTH;
  const nwse =
    (direction & NORTH && direction & WEST) ||
    (direction & SOUTH && direction & EAST);
  const dir = ew ? 'ew' : ns ? 'ns' : nwse ? 'nwse' : 'nesw';
  return `${dir}-resize`;
}

export function usePanelResize({
  initialWidth,
  initialHeight,
  minWidth,
  minHeight,
  maxWidth,
  maxHeight,
  position,
  onPositionChange,
}: UsePanelResizeOptions) {
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
  const [isResizing, setIsResizing] = useState(false);

  const ref = useRef({
    active: false,
    direction: 0,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    startPosX: 0,
    startPosY: 0,
  });

  const savedUserSelect = useRef({ value: '', priority: '' });

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const r = ref.current;
      if (!r.active) return;

      const dx = e.clientX - r.startX;
      const dy = e.clientY - r.startY;

      let newWidth = r.startWidth;
      let newHeight = r.startHeight;
      let newX = r.startPosX;
      let newY = r.startPosY;

      if (r.direction & EAST) {
        newWidth = clamp(r.startWidth + dx, minWidth, maxWidth);
      }
      if (r.direction & WEST) {
        const clamped = clamp(r.startWidth - dx, minWidth, maxWidth);
        const actualDx = r.startWidth - clamped;
        newWidth = clamped;
        newX = r.startPosX + actualDx;
      }
      if (r.direction & SOUTH) {
        newHeight = clamp(r.startHeight + dy, minHeight, maxHeight);
      }
      if (r.direction & NORTH) {
        const clamped = clamp(r.startHeight - dy, minHeight, maxHeight);
        const actualDy = r.startHeight - clamped;
        newHeight = clamped;
        newY = r.startPosY + actualDy;
      }

      setSize({ width: newWidth, height: newHeight });
      onPositionChange({ x: newX, y: newY });
    },
    [minWidth, maxWidth, minHeight, maxHeight, onPositionChange]
  );

  const onPointerUp = useCallback(() => {
    ref.current.active = false;
    setIsResizing(false);
    document.body.style.setProperty('cursor', 'default');
    document.body.style.setProperty(
      '-webkit-user-select',
      savedUserSelect.current.value,
      savedUserSelect.current.priority
    );
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
  }, [onPointerMove]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, direction: number) => {
      e.preventDefault();
      e.stopPropagation();

      const r = ref.current;
      r.active = true;
      r.direction = direction;
      r.startX = e.clientX;
      r.startY = e.clientY;
      r.startWidth = size.width;
      r.startHeight = size.height;
      r.startPosX = position.x;
      r.startPosY = position.y;

      setIsResizing(true);

      savedUserSelect.current.value = document.body.style.getPropertyValue('-webkit-user-select');
      savedUserSelect.current.priority = document.body.style.getPropertyPriority('-webkit-user-select');
      document.body.style.setProperty('-webkit-user-select', 'none', 'important');
      document.body.style.setProperty('cursor', getCursor(direction), 'important');

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
    },
    [size.width, size.height, position.x, position.y, onPointerMove, onPointerUp]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  const resizeHandleProps = useCallback(
    (direction: number) => ({
      onPointerDown: (e: React.PointerEvent) => handlePointerDown(e, direction),
      style: { cursor: getCursor(direction) } as React.CSSProperties,
    }),
    [handlePointerDown]
  );

  return {
    size,
    setSize,
    isResizing,
    resizeHandleProps,
  };
}
