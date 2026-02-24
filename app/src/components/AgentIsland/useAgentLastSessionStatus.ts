import { useState, useEffect, useRef } from 'react';
import { listSessions } from '@/services/agentPlatformClient';

/**
 * For each agent ID, fetches the most recent session to determine status.
 * Returns a map of agentId → 'active' | 'paused' | 'completed' | null.
 */
export function useAgentLastSessionStatus(
  workspaceId: string | undefined,
  agentIds: string[]
): Record<string, string | null> {
  const [statusMap, setStatusMap] = useState<Record<string, string | null>>({});
  const prevKeyRef = useRef('');

  useEffect(() => {
    if (!workspaceId || agentIds.length === 0) {
      setStatusMap({});
      return;
    }

    const key = `${workspaceId}:${agentIds.join(',')}`;
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;

    let cancelled = false;

    const fetchStatuses = async () => {
      const results: Record<string, string | null> = {};
      await Promise.all(
        agentIds.map(async (agentId) => {
          try {
            const sessions = await listSessions(workspaceId, agentId);
            if (sessions.length > 0) {
              results[agentId] = sessions[0].status;
            } else {
              results[agentId] = null;
            }
          } catch {
            results[agentId] = null;
          }
        })
      );
      if (!cancelled) {
        setStatusMap(results);
      }
    };

    fetchStatuses();
    return () => { cancelled = true; };
  }, [workspaceId, agentIds]);

  return statusMap;
}
