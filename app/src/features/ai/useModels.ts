import { useEffect, useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { ModelInfo } from '@shared/ai';
import { errorMessage } from '@/lib/errors';

// One catalog per page load: every picker shares it (the server caches it for a day too).
let shared: Promise<ModelInfo[]> | null = null;

/** The OpenRouter model catalog for pickers and the settings page. */
export function useModels() {
  const listModels = useAction(api.ai.listModels);
  const [models, setModels] = useState<ModelInfo[] | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [refreshes, setRefreshes] = useState(0);

  useEffect(() => {
    let alive = true;
    if (refreshes > 0 || !shared) {
      shared = listModels({ refresh: refreshes > 0 }).catch((e: unknown) => {
        shared = null;
        throw e;
      });
    }
    shared.then(
      (list) => {
        if (!alive) return;
        setModels(list);
        setError(null);
      },
      (e: unknown) => alive && setError(errorMessage(e, 'Could not load the model catalog')),
    );
    return () => {
      alive = false;
    };
  }, [listModels, refreshes]);

  return { models, error, refresh: () => setRefreshes((n) => n + 1) };
}

/** "$0.15" per million tokens. */
export const perMillion = (pricePerToken: string) => `$${(Number(pricePerToken) * 1_000_000).toFixed(2)}`;
