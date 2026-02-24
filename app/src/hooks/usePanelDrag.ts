import { useState, useRef, useCallback, useEffect } from 'react';

interface UsePanelDragOptions {
  initialX: number;
  initialY: number;
  panelWidth: number;
  panelHeight: number;
}

export function usePanelDrag({ initialX, initialY, panelWidth, panelHeight }: UsePanelDragOptions) {
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [isDragging, setIsDragging] = useState(false);

  const dragRef = useRef({
    offsetX: 0,
    offsetY: 0,
    active: false,
  });

  const savedUserSelect = useRef({ value: '', priority: '' });

  const clampPosition = useCallback(
    (x: number, y: number) => ({
      x: Math.max(0, Math.min(x, window.innerWidth - panelWidth)),
      y: Math.max(0, Math.min(y, window.innerHeight - panelHeight)),
    }),
    [panelWidth, panelHeight]
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragRef.current.active) return;
      const raw = {
        x: e.clientX - dragRef.current.offsetX,
        y: e.clientY - dragRef.current.offsetY,
      };
      setPosition(clampPosition(raw.x, raw.y));
    },
    [clampPosition]
  );

  const onPointerUp = useCallback(() => {
    dragRef.current.active = false;
    setIsDragging(false);
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
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragRef.current.offsetX = e.clientX - position.x;
      dragRef.current.offsetY = e.clientY - position.y;
      dragRef.current.active = true;
      setIsDragging(true);

      savedUserSelect.current.value = document.body.style.getPropertyValue('-webkit-user-select');
      savedUserSelect.current.priority = document.body.style.getPropertyPriority('-webkit-user-select');
      document.body.style.setProperty('-webkit-user-select', 'none', 'important');
      document.body.style.setProperty('cursor', 'grabbing', 'important');

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
    },
    [position.x, position.y, onPointerMove, onPointerUp]
  );

  // Re-clamp on window resize
  useEffect(() => {
    const onResize = () => {
      setPosition((prev) => clampPosition(prev.x, prev.y));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clampPosition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  return {
    position,
    setPosition,
    isDragging,
    handlePointerDown,
  };
}
