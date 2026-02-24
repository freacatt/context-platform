import { useState, useEffect, useCallback } from 'react';
import {
  listSessions,
  getSession,
  createSession,
  sendSessionMessage,
  deleteSession,
} from '@/services/agentPlatformClient';
import type { SessionListItem, SessionMessage, ToolCallTrace } from '@/types/session';

interface UseAgentChatOptions {
  workspaceId: string | undefined;
  agentId: string;
  globalContext?: string;
  pageContext?: string;
}

export function useAgentChat({
  workspaceId,
  agentId,
  globalContext,
  pageContext,
}: UseAgentChatOptions) {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [lastToolCalls, setLastToolCalls] = useState<ToolCallTrace[]>([]);
  const [chatOnly, setChatOnly] = useState(false);

  // Load sessions
  const loadSessions = useCallback(async () => {
    if (!workspaceId || !agentId) return;
    try {
      const result = await listSessions(workspaceId, agentId, 'active');
      setSessions(result);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }, [workspaceId, agentId]);

  useEffect(() => {
    if (!workspaceId || !agentId) return;
    loadSessions();
  }, [workspaceId, agentId, loadSessions]);

  // Load messages when active session changes
  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      setLastToolCalls([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const session = await getSession(activeSessionId);
        if (!cancelled) setMessages(session.messages);
      } catch {
        if (!cancelled) setMessages([]);
      }
    })();
    return () => { cancelled = true; };
  }, [activeSessionId]);

  const handleNewChat = useCallback(() => {
    setActiveSessionId(null);
    setMessages([]);
    setLastToolCalls([]);
    setChatOnly(false);
  }, []);

  const handleSendMessage = useCallback(
    async (text: string): Promise<{ error?: string }> => {
      if (!text.trim()) return {};

      setIsRunning(true);
      setLastToolCalls([]);
      try {
        let sessionId = activeSessionId;

        if (!sessionId) {
          if (!workspaceId || !agentId) {
            setIsRunning(false);
            return { error: 'No AI agent configured for this workspace.' };
          }
          const newSession = await createSession(
            workspaceId,
            agentId,
            undefined,
            chatOnly
          );
          sessionId = newSession.id;
          setActiveSessionId(newSession.id);
        }

        // Optimistic user message
        const optimisticMsg: SessionMessage = {
          id: `temp-${Date.now()}`,
          role: 'user',
          content: text,
          timestamp: new Date().toISOString(),
          metadata: {},
        };
        setMessages((prev) => [...prev, optimisticMsg]);

        // Build context
        const contextParts: string[] = [];
        if (pageContext) contextParts.push(pageContext);
        if (globalContext) contextParts.push(globalContext);
        const mergedContext = contextParts.length > 0 ? contextParts.join('\n\n') : undefined;

        const result = await sendSessionMessage(sessionId, text, mergedContext);

        setMessages((prev) => {
          const withoutOptimistic = prev.filter((m) => m.id !== optimisticMsg.id);
          return [...withoutOptimistic, result.userMessage, result.assistantMessage];
        });

        if (result.toolCalls.length > 0) {
          setLastToolCalls(result.toolCalls);
        }

        await loadSessions();
        return {};
      } catch (error: any) {
        setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')));
        return { error: error?.message || 'Failed to send message.' };
      } finally {
        setIsRunning(false);
      }
    },
    [activeSessionId, workspaceId, agentId, chatOnly, globalContext, pageContext, loadSessions]
  );

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      try {
        await deleteSession(sessionId);
        if (activeSessionId === sessionId) {
          setActiveSessionId(null);
          setMessages([]);
        }
        await loadSessions();
      } catch (error) {
        console.error('Failed to delete session:', error);
        throw error;
      }
    },
    [activeSessionId, loadSessions]
  );

  return {
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
    loadSessions,
  };
}
