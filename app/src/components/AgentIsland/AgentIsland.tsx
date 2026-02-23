import React, { Suspense, lazy } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAgentIslandAgents } from './useAgentIslandAgents';
import { cn } from '@/lib/utils';

const AgentCharacter = lazy(() =>
  import('./AgentCharacter').then((m) => ({ default: m.AgentCharacter }))
);

const MAX_VISIBLE_AGENTS = 6;

export function AgentIsland() {
  const { currentWorkspace } = useWorkspace();
  const { agents, loading } = useAgentIslandAgents(currentWorkspace?.id);
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname === '/ai-chat') return null;
  if (!currentWorkspace || (loading && agents.length === 0)) return null;
  if (!loading && agents.length === 0) return null;

  const visibleAgents = agents.slice(0, MAX_VISIBLE_AGENTS);
  const overflowCount = agents.length - MAX_VISIBLE_AGENTS;

  const handleAgentClick = () => {
    navigate('/ai-chat');
  };

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-40",
        "min-w-[40vw]",
        "bg-background/60 backdrop-blur-xl border border-border/50",
        "rounded-2xl shadow-2xl shadow-black/10",
        "flex items-end justify-start gap-2 px-6 py-2",
        "h-12",
        "overflow-visible"
      )}
    >
      <Suspense
        fallback={
          <div className="flex items-center gap-4 px-4 py-3">
            {visibleAgents.map((_, i) => (
              <div key={i} className="w-20 h-16 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        }
      >
        {visibleAgents.map((agent, index) => (
          <AgentCharacter
            key={agent.id}
            agentName={agent.name}
            index={index}
            onClick={handleAgentClick}
          />
        ))}
      </Suspense>
      {overflowCount > 0 && (
        <div
          className="flex items-center justify-center w-10 h-10 rounded-full bg-muted/80 text-xs font-medium text-muted-foreground mb-1 cursor-pointer hover:bg-muted"
          onClick={handleAgentClick}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  );
}
