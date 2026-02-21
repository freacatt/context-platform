import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase auth
vi.mock('../../services/firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue('mock-token'),
    },
  },
}));

// Mock chatService
vi.mock('../../services/chatService', () => ({
  sendMessage: vi.fn().mockResolvedValue(undefined),
}));

// Mock agentPlatformClient
vi.mock('../../services/agentPlatformClient', () => ({
  chat: vi.fn().mockResolvedValue({
    response: 'AI response text',
    agent_id: 'agent-1',
    model: 'claude-3-5-sonnet',
  }),
  AgentPlatformError: class AgentPlatformError extends Error {
    code: string;
    statusCode: number;
    constructor(code: string, message: string, statusCode: number) {
      super(message);
      this.code = code;
      this.statusCode = statusCode;
    }
  },
}));

import { aiService } from '../../services/aiService';
import { sendMessage } from '../../services/chatService';
import { chat as agentChat } from '../../services/agentPlatformClient';
import { StoredMessage } from '../../types';

describe('AIService.processChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseParams = {
    userId: 'user-1',
    conversationId: 'conv-1',
    message: 'Hello AI',
    workspaceId: 'ws-1',
    agentId: 'agent-1',
  };

  it('saves user message, calls agent-platform, saves response', async () => {
    const result = await aiService.processChat(baseParams);

    // User message saved first
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(sendMessage).toHaveBeenNthCalledWith(
      1,
      'user-1',
      'conv-1',
      'user',
      'Hello AI',
      { workspaceId: 'ws-1' },
      'conversations'
    );

    // Agent-platform called
    expect(agentChat).toHaveBeenCalledWith(
      'ws-1',
      'agent-1',
      'Hello AI',
      [], // empty history
      undefined // no global context
    );

    // Assistant response saved
    expect(sendMessage).toHaveBeenNthCalledWith(
      2,
      'user-1',
      'conv-1',
      'assistant',
      'AI response text',
      { workspaceId: 'ws-1' },
      'conversations'
    );

    expect(result).toBe('AI response text');
  });

  it('passes global context to agent-platform', async () => {
    await aiService.processChat({
      ...baseParams,
      globalContext: 'Project context info',
    });

    expect(agentChat).toHaveBeenCalledWith(
      'ws-1',
      'agent-1',
      'Hello AI',
      [],
      'Project context info'
    );
  });

  it('converts history with string content', async () => {
    const history: StoredMessage[] = [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Previous message',
        timestamp: Date.now(),
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Previous response',
        timestamp: Date.now(),
      },
    ];

    await aiService.processChat({ ...baseParams, history });

    expect(agentChat).toHaveBeenCalledWith(
      'ws-1',
      'agent-1',
      'Hello AI',
      [
        { role: 'user', content: 'Previous message' },
        { role: 'assistant', content: 'Previous response' },
      ],
      undefined
    );
  });

  it('converts legacy "conversations" role to "user"', async () => {
    const history: StoredMessage[] = [
      {
        id: 'msg-1',
        role: 'conversations',
        content: 'Legacy message',
        timestamp: Date.now(),
      },
    ];

    await aiService.processChat({ ...baseParams, history });

    const [, , , historyArg] = (agentChat as any).mock.calls[0];
    expect(historyArg[0].role).toBe('user');
  });

  it('converts array content to string', async () => {
    const history: StoredMessage[] = [
      {
        id: 'msg-1',
        role: 'user',
        content: [{ type: 'text', text: 'Part 1 ' }, { type: 'text', text: 'Part 2' }] as any,
        timestamp: Date.now(),
      },
    ];

    await aiService.processChat({ ...baseParams, history });

    const [, , , historyArg] = (agentChat as any).mock.calls[0];
    expect(historyArg[0].content).toBe('Part 1 Part 2');
  });

  it('propagates errors from agent-platform', async () => {
    (agentChat as any).mockRejectedValueOnce(new Error('Network error'));

    await expect(aiService.processChat(baseParams)).rejects.toThrow('Network error');

    // User message was still saved before the error
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });
});
