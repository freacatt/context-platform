import React, { useState, useEffect, useMemo } from 'react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAlert } from '../contexts/AlertContext';
import { useAgentChat } from '../hooks/useAgentChat';
import { useAgentIslandAgents } from '../components/AgentIsland/useAgentIslandAgents';
import type { ToolCallTrace } from '../types/session';
import type { AgentConfig } from '../types/agent';
import {
  Plus, Trash2, Bot, Wrench, ChevronDown, ChevronRight,
  MessageCircle, MessageSquare, History, X,
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from '../components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '../components/ai-elements/message';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTools,
} from '../components/ai-elements/prompt-input';
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

// --------------- Tool Call Block ---------------
const ToolCallBlock: React.FC<{ toolCalls: ToolCallTrace[] }> = ({ toolCalls }) => {
  const [expanded, setExpanded] = useState(false);
  if (toolCalls.length === 0) return null;

  return (
    <div className="my-2 mx-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Wrench size={12} />
        <span>{toolCalls.length} tool call{toolCalls.length > 1 ? 's' : ''}</span>
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {expanded && (
        <div className="mt-1.5 space-y-1.5">
          {toolCalls.map((tc, i) => (
            <div key={i} className="text-xs bg-muted/50 border border-border rounded-lg p-2 font-mono">
              <div className="text-muted-foreground mb-1">{tc.toolId}</div>
              <div className="text-foreground/70">
                {JSON.stringify(tc.result?.success !== undefined ? { success: tc.result.success } : tc.result, null, 0)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --------------- Agent Chip ---------------
const AgentChip: React.FC<{
  agent: AgentConfig;
  selected: boolean;
  onClick: () => void;
}> = ({ agent, selected, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "relative flex items-center gap-2 px-3 py-1.5 rounded-xl shrink-0",
      "cursor-pointer border transition-all duration-150",
      selected
        ? "border-primary/40 bg-primary/10 shadow-sm"
        : "border-transparent hover:bg-muted/60"
    )}
    title={`${agent.name}${agent.position ? ` — ${agent.position}` : ''}`}
  >
    <div
      className="w-2.5 h-2.5 rounded-full shrink-0"
      style={{ backgroundColor: agent.color || '#6366f1' }}
    />
    <div className="flex flex-col items-start min-w-0 leading-tight">
      <span className="text-[12px] font-semibold text-foreground truncate max-w-[100px]">
        {agent.name}
      </span>
      {agent.position && (
        <span className="text-[9px] text-muted-foreground truncate max-w-[100px]">
          {agent.position}
        </span>
      )}
    </div>
  </button>
);

// --------------- Main Page ---------------
const AiChatPage: React.FC = () => {
  const { aggregatedContext: globalContext } = useGlobalContext();
  const { currentWorkspace } = useWorkspace();
  const { showAlert } = useAlert();

  // Agents
  const { agents, loading: agentsLoading } = useAgentIslandAgents(currentWorkspace?.id);

  const defaultAgentId = currentWorkspace?.aiChatAgentId || currentWorkspace?.gmAgentId || '';
  const [selectedAgentId, setSelectedAgentId] = useState(defaultAgentId);

  // Sync default when workspace changes
  useEffect(() => {
    if (defaultAgentId) setSelectedAgentId(defaultAgentId);
  }, [defaultAgentId]);

  // If selected agent is not in the list, pick first available
  const effectiveAgentId = useMemo(() => {
    if (agents.length === 0) return selectedAgentId || defaultAgentId;
    if (agents.find((a) => a.id === selectedAgentId)) return selectedAgentId;
    return agents[0].id;
  }, [agents, selectedAgentId, defaultAgentId]);

  // Session panel
  const [showSessions, setShowSessions] = useState(false);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const {
    sessions,
    messages,
    activeSessionId,
    setActiveSessionId,
    isRunning,
    lastToolCalls,
    chatOnly,
    setChatOnly,
    handleNewChat,
    handleSendMessage,
    handleDeleteSession,
  } = useAgentChat({
    workspaceId: currentWorkspace?.id,
    agentId: effectiveAgentId,
    globalContext: globalContext || undefined,
  });

  // Switch agent → reset chat
  const onSelectAgent = (agentId: string) => {
    if (agentId === selectedAgentId) return;
    setSelectedAgentId(agentId);
    // useAgentChat will auto-reload sessions because agentId dependency changed
  };

  const onSend = async ({ text }: { text: string }) => {
    const result = await handleSendMessage(text);
    if (result.error) {
      showAlert({ type: 'error', title: 'Chat Error', message: result.error });
    }
  };

  const onDeleteClick = (e: React.MouseEvent, sessionId: string, title: string) => {
    e.stopPropagation();
    setDeleteTarget({ id: sessionId, title: title || 'Untitled Session' });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await handleDeleteSession(deleteTarget.id);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch {
      showAlert({ type: "error", title: "Error", message: "Failed to delete session" });
    }
  };

  const selectedAgent = agents.find((a) => a.id === effectiveAgentId);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-background -m-4">
      {/* ── Agent Selector Bar ── */}
      <div className="shrink-0 border-b border-border bg-card/80 backdrop-blur px-4 py-2">
        <div className="flex items-center gap-2">
          {/* Agent chips */}
          <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0 scrollbar-none">
            {agentsLoading ? (
              <span className="text-xs text-muted-foreground px-2">Loading agents...</span>
            ) : agents.length === 0 ? (
              <span className="text-xs text-muted-foreground px-2">No agents configured</span>
            ) : (
              agents.map((agent) => (
                <AgentChip
                  key={agent.id}
                  agent={agent}
                  selected={agent.id === effectiveAgentId}
                  onClick={() => onSelectAgent(agent.id)}
                />
              ))
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs h-8"
              onClick={() => setShowSessions(!showSessions)}
            >
              <History size={14} />
              Sessions
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5 text-xs h-8"
              onClick={handleNewChat}
            >
              <Plus size={14} />
              New Chat
            </Button>
          </div>
        </div>
      </div>

      {/* ── Main content area ── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Session Panel (slide-in from left) */}
        {showSessions && (
          <div className="w-72 border-r border-border bg-card flex flex-col shrink-0 h-full">
            <div className="p-3 border-b border-border flex justify-between items-center">
              <h3 className="text-sm font-medium flex items-center gap-2 text-foreground">
                <MessageSquare size={14} className="text-primary" />
                {selectedAgent?.name || 'Agent'} Sessions
              </h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowSessions(false)}>
                <X size={14} />
              </Button>
            </div>
            <ScrollArea className="flex-1 px-2 py-2">
              <div className="flex flex-col gap-1">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "group flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors text-sm",
                      activeSessionId === session.id
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setActiveSessionId(session.id)}
                  >
                    <MessageSquare size={13} className={activeSessionId === session.id ? "text-primary" : "text-muted-foreground"} />
                    <div className="flex-1 min-w-0">
                      <span className="block truncate text-xs font-medium">
                        {session.title || 'New Session'}
                      </span>
                      {session.lastMessagePreview && (
                        <span className="block truncate text-[10px] text-muted-foreground mt-0.5">
                          {session.lastMessagePreview}
                        </span>
                      )}
                    </div>
                    {session.status === 'active' && (
                      <button
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-background rounded text-muted-foreground transition-opacity flex-shrink-0"
                        onClick={(e) => onDeleteClick(e, session.id, session.title || '')}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
                {sessions.length === 0 && (
                  <p className="py-6 text-center text-xs italic text-muted-foreground">
                    No sessions yet
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Conversation className="flex-1 w-full bg-background">
            <ConversationContent className="max-w-4xl mx-auto w-full p-4 md:p-8">
              {messages.length === 0 ? (
                <ConversationEmptyState
                  title={selectedAgent ? `Chat with ${selectedAgent.name}` : "Welcome to AI Assistant"}
                  description={selectedAgent?.position || "Select an agent above to start chatting."}
                  icon={<Bot size={48} className="text-primary/50" />}
                />
              ) : (
                messages.map((msg) => {
                  if (msg.role === 'tool_call' || msg.role === 'tool_result') return null;
                  const textContent = typeof msg.content === 'string' ? msg.content : '';
                  const role = msg.role === 'user' ? 'user' : 'assistant';

                  return (
                    <Message
                      key={msg.id}
                      from={role as "user" | "assistant"}
                      className={role === 'user' ? "items-end" : "items-start"}
                    >
                      <MessageContent className={cn(
                        "px-4 py-3 rounded-2xl shadow-sm max-w-[85%] text-sm",
                        role === 'user'
                          ? "bg-primary text-primary-foreground [&_p]:text-primary-foreground [&_pre]:bg-primary-foreground/10 [&_code]:bg-primary-foreground/10 [&_code]:text-primary-foreground"
                          : "bg-muted border border-border text-foreground [&_p]:text-foreground [&_li]:text-foreground [&_strong]:text-foreground [&_pre]:bg-background [&_code]:bg-background [&_code]:text-foreground"
                      )}>
                        <MessageResponse>{textContent}</MessageResponse>
                      </MessageContent>
                    </Message>
                  );
                })
              )}
              {lastToolCalls.length > 0 && !isRunning && (
                <ToolCallBlock toolCalls={lastToolCalls} />
              )}
              {isRunning && (
                <Message from="assistant" className="items-start">
                  <MessageContent className="bg-muted border border-border text-foreground px-4 py-3 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-1 h-6">
                      <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"></div>
                    </div>
                  </MessageContent>
                </Message>
              )}
            </ConversationContent>
          </Conversation>

          {/* Input */}
          <div className="p-4 border-t border-border bg-background w-full shrink-0">
            <div className="max-w-4xl mx-auto">
              <PromptInput
                onSubmit={onSend}
                className="border border-border rounded-2xl bg-card shadow-sm hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-ring focus-within:border-primary"
              >
                <PromptInputTextarea
                  placeholder={selectedAgent ? `Message ${selectedAgent.name}...` : "Ask anything about your project context..."}
                  className="min-h-[60px] max-h-[200px] bg-transparent text-foreground placeholder:text-muted-foreground"
                />
                <PromptInputFooter>
                  <PromptInputTools>
                    {!activeSessionId && (
                      <button
                        type="button"
                        onClick={() => setChatOnly(!chatOnly)}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                          chatOnly
                            ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                            : "text-muted-foreground hover:bg-muted"
                        )}
                        title="Chat only — no tools will be used, the agent will only talk"
                      >
                        <MessageCircle size={13} />
                        Chat only
                      </button>
                    )}
                  </PromptInputTools>
                  <PromptInputSubmit
                    status={isRunning ? 'streaming' : 'idle'}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                  />
                </PromptInputFooter>
              </PromptInput>
              <p className="mt-2 text-center text-xs text-gray-400 opacity-60">
                AI can make mistakes. Please verify important information.
              </p>
            </div>
          </div>
        </div>
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Session"
        description="This will permanently delete the session and all its messages. This cannot be undone."
        itemName={deleteTarget?.title || 'Session'}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default AiChatPage;
