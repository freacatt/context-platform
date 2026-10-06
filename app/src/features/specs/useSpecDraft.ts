import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useDebouncedSave } from '@/hooks/useDebouncedSave';

/**
 * The local draft of a spec, autosaved shortly after each change. Mount the editor with
 * `key={doc._id}`: the draft never resets from its own server echo.
 */
export function useSpecDraft<S>(initial: S, save: (spec: S) => Promise<unknown>) {
  const [spec, setSpec] = useState(initial);
  const latest = useRef(spec);
  useLayoutEffect(() => {
    latest.current = spec;
  });
  const { status, schedule, flush } = useDebouncedSave(() => save(latest.current));

  const change = useCallback(
    (patch: Partial<S> | ((current: S) => S)) => {
      setSpec((current) => {
        const next = typeof patch === 'function' ? patch(current) : { ...current, ...patch };
        latest.current = next;
        return next;
      });
      schedule();
    },
    [schedule],
  );

  return { spec, change, status, flush };
}
