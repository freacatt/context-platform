import { sendMessage } from './chatService';
import { chat as agentChat, AgentPlatformError } from './agentPlatformClient';
import { StoredMessage } from '../types';

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
   * Unified chat: saves user message, calls agent-platform, saves response.
   */
  async processChat(params: {
    userId: string;
    conversationId: string;
    message: string;
    workspaceId: string;
    agentId: string;
    globalContext?: string;
    history?: StoredMessage[];
  }): Promise<string> {
    const {
      userId,
      conversationId,
      message,
      workspaceId,
      agentId,
      globalContext,
      history = [],
    } = params;

    // 1. Save user message locally
    await sendMessage(
      userId,
      conversationId,
      "user",
      message,
      { workspaceId },
      "conversations"
    );

    // 2. Build history array for agent-platform
    const historyEntries = history.map((msg) => {
      let content = "";
      if (typeof msg.content === "string") {
        content = msg.content;
      } else if (Array.isArray(msg.content)) {
        content = (msg.content as any[]).map((c: any) => c.text || "").join("");
      }
      const role = msg.role === "conversations" ? "user" : msg.role;
      return { role, content };
    });

    // 3. Call agent-platform chat endpoint
    const result = await agentChat(
      workspaceId,
      agentId,
      message,
      historyEntries,
      globalContext
    );
    const aiResponse = result.response;

    // 4. Save assistant response locally
    if (aiResponse) {
      await sendMessage(
        userId,
        conversationId,
        "assistant",
        aiResponse,
        { workspaceId },
        "conversations"
      );
    }

    return aiResponse;
  }
}

export { AgentPlatformError };
export const aiService = AIService.getInstance();
