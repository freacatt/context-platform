import { sendMessage, subscribeToChat, createConversation } from './chatService';
import { sendGlobalChatMessage, sendProductDefinitionChatMessage } from './anthropic';
import { agentDirectAgentCall } from './agentPlatformClient';
import { StoredMessage, ChatMessage, ProductDefinition } from '../types';

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
   * Orchestrates a chat interaction for Product Definition context
   */
  async processProductDefinitionChat(
    userId: string,
    apiKey: string,
    conversationId: string,
    userMessage: string,
    productDefinition: ProductDefinition,
    context: string,
    history: StoredMessage[] = [],
    globalContext: string = ""
  ): Promise<string> {
    if (!apiKey) throw new Error("API Key is missing");

    // 1. Save user message
    await sendMessage(
      userId,
      conversationId,
      'user',
      userMessage,
      {},
      'conversations'
    );

    // 2. Prepare history
    const historyForApi: ChatMessage[] = history.map(msg => {
      let contentStr = '';
      if (typeof msg.content === 'string') {
        contentStr = msg.content;
      } else if (Array.isArray(msg.content)) {
        contentStr = (msg.content as any[]).map((c: any) => c.text || '').join('');
      }
      return {
        role: (msg.role === 'conversations' ? 'user' : msg.role) as "user" | "assistant",
        content: contentStr
      };
    });

    // 3. Call AI
    const aiResponse = await sendProductDefinitionChatMessage(
      apiKey,
      productDefinition,
      context,
      historyForApi,
      userMessage,
      globalContext
    );

    // 4. Save AI response
    if (aiResponse) {
      await sendMessage(
        userId,
        conversationId,
        'assistant',
        aiResponse,
        {},
        'conversations'
      );
    }

    return aiResponse;
  }

  /**
   * Orchestrates a full chat interaction:
   * 1. Saves user message
   * 2. Calls AI
   * 3. Saves AI response
   */
  async processGlobalChat(
    userId: string,
    apiKey: string,
    conversationId: string,
    userMessage: string,
    globalContext: string,
    history: StoredMessage[] = [],
    currentPageContext: string = ""
  ): Promise<string> {
    if (!apiKey) throw new Error("API Key is missing");

    await sendMessage(
      userId,
      conversationId,
      'user',
      userMessage,
      {},
      'conversations'
    );

    const historyForApi: ChatMessage[] = history.map(msg => {
      let contentStr = '';
      if (typeof msg.content === 'string') {
        contentStr = msg.content;
      } else if (Array.isArray(msg.content)) {
        contentStr = (msg.content as any[]).map((c: any) => c.text || '').join('');
      }
      return {
        role: (msg.role === 'conversations' ? 'user' : msg.role) as "user" | "assistant",
        content: contentStr
      };
    });

    let aiResponse: string;
    if (globalContext && import.meta.env.VITE_AGENT_SERVER_URL) {
      const workspaceId = history[0]?.metadata?.workspaceId || "";
      if (!workspaceId) {
        aiResponse = await sendGlobalChatMessage(
          apiKey,
          globalContext,
          historyForApi,
          userMessage,
          currentPageContext
        );
      } else {
        const result = await agentDirectAgentCall(workspaceId, userMessage);
        aiResponse = result.output;
      }
    } else {
      aiResponse = await sendGlobalChatMessage(
        apiKey,
        globalContext,
        historyForApi,
        userMessage,
        currentPageContext
      );
    }

    if (aiResponse) {
      await sendMessage(
        userId,
        conversationId,
        'assistant',
        aiResponse,
        {},
        'conversations'
      );
    }

    return aiResponse;
  }
}

export const aiService = AIService.getInstance();
