import React, { useState, useMemo, useRef, useCallback, Suspense, lazy } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWorkspacePath } from '@/hooks/useWorkspacePath';
import { useAgentIslandAgents } from './useAgentIslandAgents';
import { useAgentLastSessionStatus } from './useAgentLastSessionStatus';
import { AgentButton } from './AgentButton';
import { AgentChatPanel } from './AgentChatPanel';
import { cn } from '@/lib/utils';
import { MessageSquarePlus, Settings } from 'lucide-react';
import type { AgentConfig } from '@/types/agent';

const AgentCharacter = lazy(() =>
  import('./AgentOrb').then((m) => ({ default: m.AgentOrb as React.ComponentType<{ color: string; isActive: boolean; agentName: string }> }))
);

const MAX_ISLAND_AGENTS = 5;

export function AgentIsland() {
  const { currentWorkspace } = useWorkspace();
  const { agents, loading } = useAgentIslandAgents(currentWorkspace?.id);
  const navigate = useNavigate();
  const wp = useWorkspacePath();
  const location = useLocation();
  const [chatModalAgent, setChatModalAgent] = useState<AgentConfig | null>(null);

  // Track button refs to position 3D model on the clicked button
  const buttonRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const islandRef = useRef<HTMLDivElement>(null);

  const setButtonRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) buttonRefs.current.set(id, el);
    else buttonRefs.current.delete(id);
  }, []);

  // Calculate 3D model position relative to the island bar
  const modelPosition = useMemo(() => {
    if (!chatModalAgent) return null;
    const btnEl = buttonRefs.current.get(chatModalAgent.id);
    const islandEl = islandRef.current;
    if (!btnEl || !islandEl) return null;
    const btnRect = btnEl.getBoundingClientRect();
    const islandRect = islandEl.getBoundingClientRect();
    // Center the model on the button, relative to island
    const centerX = btnRect.left - islandRect.left + btnRect.width / 2;
    return centerX;
  }, [chatModalAgent]);

  // Filter to island agents
  const visibleAgents = useMemo(() => {
    if (agents.length === 0) return [];
    const ids = currentWorkspace?.islandAgentIds;
    if (ids && ids.length > 0) {
      return agents.filter((a) => ids.includes(a.id)).slice(0, MAX_ISLAND_AGENTS);
    }
    return agents.slice(0, MAX_ISLAND_AGENTS);
  }, [agents, currentWorkspace?.islandAgentIds]);

  const agentIds = useMemo(
    () => visibleAgents.map((a) => a.id),
    [visibleAgents]
  );
  const statusMap = useAgentLastSessionStatus(currentWorkspace?.id, agentIds);

  // Hide conditions
  if (!currentWorkspace) return null;
  if (location.pathname.endsWith('/ai-chat')) return null;
  if (location.pathname === '/workspaces' || location.pathname.endsWith('/workspaces')) return null;
  if (loading && agents.length === 0) return null;
  if (!loading && agents.length === 0) return null;

  return (
    <>
      <div
        ref={islandRef}
        className={cn(
          "fixed bottom-4 left-1/2 -translate-x-1/2 z-40",
          "bg-background/60 backdrop-blur-xl border border-border/50",
          "rounded-2xl shadow-2xl shadow-black/10",
          "flex items-center gap-1.5 px-3 py-2",
          "h-14",
          "overflow-visible"
        )}
      >
        {/* 3D character standing on top of the clicked agent button */}
        {chatModalAgent && modelPosition !== null && (
          <div
            className="absolute overflow-visible pointer-events-none z-[60]"
            style={{
              width: 100,
              height: 160,
              bottom: 10,
              left: modelPosition - 50,
            }}
          >
            <Suspense fallback={null}>
              <AgentCharacter
                color={chatModalAgent.color || '#a855f7'}
                isActive={false}
                agentName={chatModalAgent.name}
              />
            </Suspense>
          </div>
        )}

        {/* Agent buttons */}
        {visibleAgents.map((agent) => (
          <div key={agent.id} ref={(el) => setButtonRef(agent.id, el)}>
            <AgentButton
              agent={agent}
              lastSessionStatus={statusMap[agent.id]}
              isOpen={chatModalAgent?.id === agent.id}
              onClick={() => setChatModalAgent(agent)}
            />
          </div>
        ))}

        {/* Divider */}
        <div className="w-px h-8 bg-border/50 mx-1.5" />

        {/* Talk to other agents */}
        <button
          onClick={() => navigate(wp('/ai-chat'))}
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-xl",
            "text-muted-foreground hover:text-foreground",
            "hover:bg-muted/60 transition-colors"
          )}
          title="All agents"
        >
          <MessageSquarePlus size={18} />
        </button>

        {/* AI Settings */}
        <button
          onClick={() => navigate(wp('/ai-settings'))}
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-xl",
            "text-muted-foreground hover:text-foreground",
            "hover:bg-muted/60 transition-colors"
          )}
          title="AI Settings"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Chat Panel */}
      {chatModalAgent && (
        <AgentChatPanel
          agent={chatModalAgent}
          onClose={() => setChatModalAgent(null)}
        />
      )}
    </>
  );
}
