import React, { useState, useEffect } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useGlobalContext } from '@/contexts/GlobalContext';
import { useCurrentPageContext } from '@/hooks/useCurrentPageContext';
import { useAgentChat } from '@/hooks/useAgentChat';
import { useAlert } from '@/contexts/AlertContext';
import { usePanelDrag } from '@/hooks/usePanelDrag';
import { usePanelResize, NORTH, SOUTH, EAST, WEST } from '@/hooks/usePanelResize';
import { cn } from '@/lib/utils';
import type { AgentConfig } from '@/types/agent';
import type { ToolCallTrace } from '@/types/session';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';

import {
  Plus,
  MessageSquare,
  Trash2,
  X,
  Wrench,
  ChevronDown,
  ChevronRight,
  MessageCircle,
  MapPin,
  GripHorizontal,
  PanelLeftOpen,
  PanelLeftClose,
} from 'lucide-react';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';

// ---------- Constants ----------

const DEFAULT_WIDTH = 540;
const DEFAULT_HEIGHT = 600;
const MIN_WIDTH = 460;
const MIN_HEIGHT = 450;
const MAX_WIDTH = 99999;
const MAX_HEIGHT = 99999;
const SIDEBAR_WIDTH = 176; // w-44

// ---------- Tool call display ----------

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
                {JSON.stringify(
                  tc.result?.success !== undefined ? { success: tc.result.success } : tc.result,
                  null,
                  0
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------- Resize handles ----------

const ResizeHandles: React.FC<{
  resizeHandleProps: (dir: number) => {
    onPointerDown: (e: React.PointerEvent) => void;
    style: React.CSSProperties;
  };
}> = ({ resizeHandleProps }) => {
  const edge = 'absolute pointer-events-auto z-10';
  const corner = 'absolute pointer-events-auto z-20';

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Edges */}
      <div className={cn(edge, 'top-0 left-2 right-2 h-1')} {...resizeHandleProps(NORTH)} />
      <div className={cn(edge, 'bottom-0 left-2 right-2 h-1')} {...resizeHandleProps(SOUTH)} />
      <div className={cn(edge, 'right-0 top-2 bottom-2 w-1')} {...resizeHandleProps(EAST)} />
      <div className={cn(edge, 'left-0 top-2 bottom-2 w-1')} {...resizeHandleProps(WEST)} />
      {/* Corners */}
      <div className={cn(corner, '-top-0.5 -right-0.5 w-3 h-3')} {...resizeHandleProps(NORTH | EAST)} />
      <div className={cn(corner, '-top-0.5 -left-0.5 w-3 h-3')} {...resizeHandleProps(NORTH | WEST)} />
      <div className={cn(corner, '-bottom-0.5 -right-0.5 w-3 h-3')} {...resizeHandleProps(SOUTH | EAST)} />
      <div className={cn(corner, '-bottom-0.5 -left-0.5 w-3 h-3')} {...resizeHandleProps(SOUTH | WEST)} />
    </div>
  );
};

// ---------- Main component ----------

interface AgentChatPanelProps {
  agent: AgentConfig;
  onClose: () => void;
}

export const AgentChatPanel: React.FC<AgentChatPanelProps> = ({ agent, onClose }) => {
  const { currentWorkspace } = useWorkspace();
  const { aggregatedContext: globalContext } = useGlobalContext();
  const { context: pageContext, title: pageTitle } = useCurrentPageContext();
  const { showAlert } = useAlert();

  // Sidebar toggle — closed by default
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Drag & resize
  const { position, setPosition, isDragging, handlePointerDown: dragPointerDown } = usePanelDrag({
    initialX: Math.max(0, window.innerWidth - DEFAULT_WIDTH - 24),
    initialY: Math.max(0, window.innerHeight - DEFAULT_HEIGHT - 80),
    panelWidth: DEFAULT_WIDTH,
    panelHeight: DEFAULT_HEIGHT,
  });

  const { size, isResizing, resizeHandleProps } = usePanelResize({
    initialWidth: DEFAULT_WIDTH,
    initialHeight: DEFAULT_HEIGHT,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    maxWidth: MAX_WIDTH,
    maxHeight: MAX_HEIGHT,
    position,
    onPositionChange: setPosition,
  });

  // Chat
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
    agentId: agent.id,
    globalContext: globalContext || undefined,
    pageContext: pageContext || undefined,
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
      showAlert({ type: 'error', title: 'Error', message: 'Failed to delete session' });
    }
  };

  return (
    <div
      className={cn(
        "fixed z-50",
        "bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl",
        "shadow-2xl shadow-black/15",
        "flex flex-col overflow-visible",
        (isDragging || isResizing) && "select-none",
      )}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
      }}
    >
      {/* Resize handles */}
      <ResizeHandles resizeHandleProps={resizeHandleProps} />

      {/* Header — drag handle */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2.5 border-b border-border/50 shrink-0 rounded-t-2xl",
          isDragging ? "cursor-grabbing" : "cursor-grab",
        )}
        onPointerDown={dragPointerDown}
      >
        <GripHorizontal size={14} className="text-muted-foreground/40 shrink-0" />
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: agent.color || '#a855f7' }}
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate">{agent.name}</h3>
          {agent.position && (
            <p className="text-[11px] text-muted-foreground truncate">{agent.position}</p>
          )}
        </div>
        {pageTitle && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground max-w-[140px]">
            <MapPin size={10} className="shrink-0" />
            <span className="truncate">{pageTitle}</span>
          </div>
        )}
        {/* Toggle sidebar */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          title={sidebarOpen ? 'Hide sessions' : 'Show sessions'}
        >
          {sidebarOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
          <span className="text-[10px]">History</span>
        </button>
        <button
          onClick={onClose}
          onPointerDown={(e) => e.stopPropagation()}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden rounded-b-2xl">
        {/* Collapsible session sidebar */}
        {sidebarOpen && (
          <div
            className="border-r border-border/50 flex flex-col shrink-0 bg-muted/20"
            style={{ width: SIDEBAR_WIDTH }}
          >
            <div className="p-2">
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-start gap-1.5 text-xs h-7"
                onClick={handleNewChat}
              >
                <Plus size={12} />
                New Chat
              </Button>
            </div>
            <ScrollArea className="flex-1 px-1.5">
              <div className="flex flex-col gap-0.5 pb-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer text-[11px]",
                      activeSessionId === session.id
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setActiveSessionId(session.id)}
                  >
                    <MessageSquare size={10} className="shrink-0" />
                    <span className="truncate flex-1">{session.title || 'New Session'}</span>
                    <button
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-background rounded text-muted-foreground shrink-0"
                      onClick={(e) => onDeleteClick(e, session.id, session.title || '')}
                    >
                      <Trash2 size={9} />
                    </button>
                  </div>
                ))}
                {sessions.length === 0 && (
                  <p className="py-4 text-center text-[10px] italic text-muted-foreground">
                    No sessions yet
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Conversation className="flex-1 w-full">
            <ConversationContent className="w-full p-3">
              {messages.length === 0 ? (
                <ConversationEmptyState
                  title={`Chat with ${agent.name}`}
                  description={agent.position ? `${agent.position} — ready to help.` : 'Start a conversation.'}
                  icon={
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${agent.color || '#a855f7'}20` }}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: agent.color || '#a855f7' }}
                      />
                    </div>
                  }
                />
              ) : (
                messages.map((msg) => {
                  if (msg.role === 'tool_call' || msg.role === 'tool_result') return null;
                  const textContent = typeof msg.content === 'string' ? msg.content : '';
                  const role = msg.role === 'user' ? 'user' : 'assistant';

                  return (
                    <Message
                      key={msg.id}
                      from={role as 'user' | 'assistant'}
                      className={role === 'user' ? 'items-end' : 'items-start'}
                    >
                      <MessageContent
                        className={cn(
                          'px-3 py-2 rounded-2xl max-w-[90%] text-sm',
                          role === 'user'
                            ? 'bg-primary text-primary-foreground [&_p]:text-primary-foreground'
                            : 'bg-muted border border-border text-foreground [&_p]:text-foreground'
                        )}
                      >
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
                  <MessageContent className="bg-muted border border-border text-foreground px-3 py-2 rounded-2xl">
                    <div className="flex items-center gap-1 h-5">
                      <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" />
                    </div>
                  </MessageContent>
                </Message>
              )}
            </ConversationContent>
          </Conversation>

          {/* Input */}
          <div className="p-2.5 border-t border-border/50 shrink-0">
            <PromptInput
              onSubmit={onSend}
              className="border border-border rounded-xl bg-card/60"
            >
              <PromptInputTextarea
                placeholder={`Ask ${agent.name}...`}
                className="min-h-[36px] max-h-[100px] bg-transparent text-foreground placeholder:text-muted-foreground text-sm"
              />
              <PromptInputFooter>
                <PromptInputTools>
                  {!activeSessionId && (
                    <button
                      type="button"
                      onClick={() => setChatOnly(!chatOnly)}
                      className={cn(
                        'flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium',
                        chatOnly
                          ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                          : 'text-muted-foreground hover:bg-muted'
                      )}
                      title="Chat only — no tools"
                    >
                      <MessageCircle size={10} />
                      Chat only
                    </button>
                  )}
                </PromptInputTools>
                <PromptInputSubmit
                  status={isRunning ? 'streaming' : 'ready'}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-7 w-7"
                />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Session"
        description="This will permanently delete the session and all its messages."
        itemName={deleteTarget?.title || 'Session'}
        onConfirm={confirmDelete}
      />
    </div>
  );
};
