import { useCallback, useEffect, useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { OpenRouterKeyStatus } from '@shared/ai';
import { errorMessage } from '@/lib/errors';

const REFRESH_MS = 60_000;

export interface OpenRouterStatusState {
  /** undefined while loading; null when no key is configured. */
  status: OpenRouterKeyStatus | null | undefined;
  error: string | null;
  updatedAt: number | null;
  refreshing: boolean;
  refresh: () => void;
}

/**
 * Usage, limit and credits of the user's OpenRouter key. Refreshes every minute while the
 * tab is visible, and right away when the key changes in Settings.
 */
export function useOpenRouterStatus(): OpenRouterStatusState {
  const settings = useQuery(api.aiSettings.get, {});
  const fetchStatus = useAction(api.ai.accountStatus);
  const [status, setStatus] = useState<OpenRouterKeyStatus | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);

  const keySource = settings?.keySource;
  const keyHint = settings?.keyHint;
  const hasKey = keySource === 'user' || keySource === 'deployment';

  useEffect(() => {
    if (!hasKey) return;
    let alive = true;
    fetchStatus({})
      .then(
        (next) => {
          if (!alive) return;
          setStatus(next);
          setError(null);
          setUpdatedAt(Date.now());
        },
        (e: unknown) => alive && setError(errorMessage(e, 'Could not reach OpenRouter')),
      )
      .finally(() => alive && setRefreshing(false));
    return () => {
      alive = false;
    };
    // keyHint: a new key means new numbers.
  }, [fetchStatus, hasKey, keyHint, tick]);

  useEffect(() => {
    if (!hasKey) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') setTick((t) => t + 1);
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [hasKey]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setTick((t) => t + 1);
  }, []);

  if (settings === undefined) return { status: undefined, error: null, updatedAt: null, refreshing, refresh };
  if (!hasKey) return { status: null, error: null, updatedAt: null, refreshing, refresh };
  return { status, error, updatedAt, refreshing, refresh };
}
