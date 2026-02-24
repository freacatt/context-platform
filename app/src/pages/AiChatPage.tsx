import React, { useState } from 'react';
import { useGlobalContext } from '../contexts/GlobalContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAlert } from '../contexts/AlertContext';
import { useAgentChat } from '../hooks/useAgentChat';
import type { ToolCallTrace } from '../types/session';
import { Plus, MessageSquare, Trash2, Bot, PanelLeftClose, PanelLeftOpen, Wrench, ChevronDown, ChevronRight, MessageCircle } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

// AI Elements Imports
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState
} from '../components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse
} from '../components/ai-elements/message';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTools,
} from '../components/ai-elements/prompt-input';
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

// Tool call display component
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

const AiChatPage: React.FC = () => {
  const { aggregatedContext: globalContext } = useGlobalContext();
  const { currentWorkspace } = useWorkspace();
  const { showAlert } = useAlert();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Delete State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const agentId = currentWorkspace?.aiChatAgentId || currentWorkspace?.gmAgentId || '';

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
    agentId,
    globalContext: globalContext || undefined,
  });

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

  return (
    <div className="flex h-[calc(100vh-64px)] bg-background">
      {/* Sidebar Toggle (Mobile/Collapsed) */}
      {!isSidebarOpen && (
        <div className="absolute left-4 top-4 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
            className="bg-background shadow-md hover:bg-accent"
          >
            <PanelLeftOpen size={20} className="text-muted-foreground" />
          </Button>
        </div>
      )}

      {/* Sidebar */}
      {isSidebarOpen && (
        <div className="w-80 border-r border-border bg-card flex flex-col h-full transition-all duration-300">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h2 className="text-lg font-medium flex items-center gap-2 text-foreground">
              <Bot size={20} className="text-primary" />
              Sessions
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}>
              <PanelLeftClose size={20} className="text-muted-foreground" />
            </Button>
          </div>

          <div className="p-4">
            <Button
              variant="secondary"
              className="w-full justify-start gap-2 cursor-pointer bg-secondary hover:bg-secondary/80 text-secondary-foreground"
              onClick={handleNewChat}
            >
              <Plus size={18} />
              New Chat
            </Button>
          </div>

          <ScrollArea className="flex-1 px-3">
            <div className="flex flex-col gap-2 pb-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    "group flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors text-sm",
                    activeSessionId === session.id
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setActiveSessionId(session.id)}
                >
                  <MessageSquare size={16} className={activeSessionId === session.id ? "text-primary" : "text-muted-foreground"} />
                  <div className="flex-1 min-w-0">
                    <span className="block truncate font-medium">
                      {session.title || 'New Session'}
                    </span>
                    {session.lastMessagePreview && (
                      <span className="block truncate text-xs text-muted-foreground mt-0.5">
                        {session.lastMessagePreview}
                      </span>
                    )}
                  </div>
                  {session.status === 'active' && (
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-background rounded text-muted-foreground transition-opacity flex-shrink-0"
                      onClick={(e) => onDeleteClick(e, session.id, session.title || '')}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              {sessions.length === 0 && (
                <p className="py-8 text-center text-sm italic text-muted-foreground">
                  No sessions yet
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Conversation className="flex-1 w-full bg-background">
          <ConversationContent className="max-w-4xl mx-auto w-full p-4 md:p-8">
            {messages.length === 0 ? (
              <ConversationEmptyState
                title="Welcome to AI Assistant"
                description="Start a new conversation to get help with your project."
                icon={<Bot size={48} className="text-primary/50" />}
              />
            ) : (
              messages.map((msg) => {
                // Skip tool_call and tool_result messages in main display
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
            {/* Tool calls display after last assistant message */}
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

        <div className="p-4 border-t border-border bg-background w-full mt-auto shrink-0 z-10">
          <div className="max-w-4xl mx-auto">
            <PromptInput
              onSubmit={onSend}
              className="border border-border rounded-2xl bg-card shadow-sm hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-ring focus-within:border-primary"
            >
              <PromptInputTextarea
                placeholder="Ask anything about your project context..."
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
