import { useState, useEffect } from 'react';
import type { AgentConfig } from '@/types/agent';
import { getAgents } from '@/services/agentPlatformClient';

interface UseAgentIslandAgentsReturn {
  agents: AgentConfig[];
  loading: boolean;
}

export function useAgentIslandAgents(workspaceId: string | undefined): UseAgentIslandAgentsReturn {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!workspaceId) {
      setAgents([]);
      return;
    }
    let cancelled = false;
    setLoading(true);

    getAgents(workspaceId)
      .then((result) => {
        if (!cancelled) setAgents(result);
      })
      .catch(() => {
        if (!cancelled) setAgents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [workspaceId]);

  return { agents, loading };
}
