import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export type SaveStatus = 'saved' | 'pending' | 'saving' | 'error';

/**
 * Debounces saves: `schedule()` (re)starts a timer and `save()` runs once the
 * user pauses. Pending saves are flushed on unmount so nothing is lost when
 * navigating away.
 */
export function useDebouncedSave(save: () => Promise<unknown>, delayMs = 800) {
  const [status, setStatus] = useState<SaveStatus>('saved');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  useLayoutEffect(() => {
    saveRef.current = save;
  });

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setStatus('saving');
    try {
      await saveRef.current();
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }, []);

  const schedule = useCallback(() => {
    setStatus('pending');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), delayMs);
  }, [delayMs, flush]);

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        void saveRef.current();
      }
    },
    [],
  );

  return { status, schedule, flush };
}
