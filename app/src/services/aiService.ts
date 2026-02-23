import {
  sendSessionMessage,
  createSession,
  AgentPlatformError,
} from './agentPlatformClient';
import type { SessionMessageResponse } from '../types/session';

export class AIService {
  private static instance: AIService;

  private constructor() {}

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Session-based chat: sends message to server-side session, returns full response.
   * Server manages all message persistence and history.
   */
  async sendMessage(params: {
    sessionId: string;
    message: string;
    context?: string;
  }): Promise<SessionMessageResponse> {
    const { sessionId, message, context } = params;
    return sendSessionMessage(sessionId, message, context);
  }

  /**
   * Create a new session on the server.
   */
  async createSession(workspaceId: string, agentId: string) {
    return createSession(workspaceId, agentId);
  }
}

export { AgentPlatformError };
export const aiService = AIService.getInstance();
