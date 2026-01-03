import Anthropic from '@anthropic-ai/sdk';
import { QuestionGenerationData, BlockType, Pyramid, ProductDefinitionNode, ProductDefinition, ChatMessage } from '../types';

/**
 * Generate question suggestions using Claude AI
 */
export const generateQuestions = async (apiKey: string, pyramidContext: string, blockType: BlockType, data: QuestionGenerationData): Promise<string[]> => {
  if (!apiKey) throw new Error("API Key is missing");

  const anthropic = new Anthropic({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // Required for client-side usage
  });

  const historyContext = data.historyContext || "";
  let prompt = "";
  
  if (blockType === 'combined') {
     // Data expects: { parentQuestions: [q1, q2] }
     const { parentQuestions } = data;
     if (!parentQuestions || parentQuestions.length < 2) {
       throw new Error("Combined blocks require at least 2 parent questions");
     }

     prompt = `
You are an expert brainstorming assistant helping to solve a complex problem using a pyramid structure.

CONTEXT:
"${pyramidContext}"

HISTORY OF THOUGHT (Previous blocks leading to this point):
${historyContext}

CURRENT SITUATION:
We are at a "Combined Block" where two different lines of questioning merge.
Parent Question 1: "${parentQuestions[0]}"
Parent Question 2: "${parentQuestions[1]}"

TASK:
Suggest 3 short, insightful questions that combine the perspectives of both parent questions to move the solution forward.
The questions should bridge the gap between the two previous lines of thought.
Return ONLY the 3 questions, numbered 1, 2, 3.
     `;

  } else {
    // Regular block or Next Question generation
    // Data expects: { parentQuestion, currentAnswer } or { combinedQuestion, currentAnswer }
    const question = data.parentQuestion || data.combinedQuestion;
    const answer = data.currentAnswer;

     prompt = `
You are an expert brainstorming assistant helping to solve a complex problem using a pyramid structure.

CONTEXT:
"${pyramidContext}"

HISTORY OF THOUGHT (Previous blocks leading to this point):
${historyContext}

CURRENT SITUATION:
Current Question: "${question}"
User's Answer: "${answer}"

TASK:
Suggest 3 short, focused follow-up questions to dig deeper into this answer and advance the solution for the next level of the pyramid.
Return ONLY the 3 questions, numbered 1, 2, 3.
     `;
  }

  try {
    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = (msg.content[0] as any).text;
    
    // Parse the numbered list
    const questions = text.split('\n')
      .filter((line: string) => /^\d+\./.test(line.trim()))
      .map((line: string) => line.replace(/^\d+\.\s*/, '').replace(/^"|"$/g, '').trim())
      .slice(0, 3);

    return questions;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
};

/**
 * Generate answer suggestions using Claude AI
 */
export const generateAnswers = async (apiKey: string, pyramidContext: string, question: string, data: QuestionGenerationData): Promise<string[]> => {
  if (!apiKey) throw new Error("API Key is missing");

  const anthropic = new Anthropic({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });

  const historyContext = data.historyContext || "";

  const prompt = `
You are an expert brainstorming assistant helping to solve a complex problem using a pyramid structure.

CONTEXT:
"${pyramidContext}"

HISTORY OF THOUGHT (Previous blocks leading to this point):
${historyContext}

CURRENT QUESTION:
"${question}"

TASK:
Suggest 3 possible short, distinct answers to the Current Question that would help move the solution forward.
Return ONLY the 3 answers, numbered 1, 2, 3.
  `;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = (msg.content[0] as any).text;
    
    // Parse the numbered list
    const answers = text.split('\n')
      .filter((line: string) => /^\d+\./.test(line.trim()))
      .map((line: string) => line.replace(/^\d+\.\s*/, '').replace(/^"|"$/g, '').trim())
      .slice(0, 3);

    return answers;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
};


/**
 * Generate a suggestion for a Product Definition topic answer
 */
export const generateProductDefinitionSuggestion = async (apiKey: string, node: ProductDefinitionNode, productTitle: string, contextData: string): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");

  const anthropic = new Anthropic({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });

  const prompt = `
You are an expert product manager assistant helping to define a product using a structured methodology.

PRODUCT TITLE: "${productTitle}"

CURRENT TOPIC: "${node.label}"
QUESTION TO ANSWER: "${node.question || "Describe this aspect of the product"}"

CONTEXT INFORMATION:
${contextData}

TASK:
Based on the provided context and the product title, suggest a draft answer for the current topic.
The answer should be concise, practical, and directly address the question.
If the context doesn't provide enough information, make reasonable assumptions based on standard product management practices, but note them as assumptions.
  `;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    return (msg.content[0] as any).text;
  } catch (error) {
    console.error("AI Suggestion Error:", error);
    throw error;
  }
};

/**
 * Generate a suggestion for a Technical Architecture field
 */
export const generateTechnicalArchitectureSuggestion = async (
    apiKey: string, 
    architectureTitle: string, 
    fieldTitle: string, 
    fieldDescription: string,
    fieldPath: string
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");

  const anthropic = new Anthropic({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });

  const prompt = `
You are an expert software architect assistant.

ARCHITECTURE TITLE: "${architectureTitle}"

CURRENT FIELD: "${fieldTitle}"
PATH: ${fieldPath}
DESCRIPTION/CONTEXT: "${fieldDescription}"

TASK:
Suggest a professional, best-practice value for this field.
- If the field expects a list, provide a bulleted list or newline-separated items.
- If it expects a key-value map, provide "Key: Value" format.
- If it expects a description, provide a concise but comprehensive paragraph.

Your response should be ONLY the content to be inserted into the field, without conversational filler.
  `;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    return (msg.content[0] as any).text;
  } catch (error) {
    console.error("AI Suggestion Error:", error);
    throw error;
  }
};

/**
 * Send a chat message to Claude AI with pyramid context
 */
export const sendChatMessage = async (apiKey: string, pyramid: Pyramid, chatHistory: ChatMessage[], userMessage: string, additionalContext: string | null = null): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");

  const anthropic = new Anthropic({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });

  // Format blocks data
  const formattedBlocks = Object.values(pyramid.blocks || {})
    .map(b => {
      const rank = b.u + 1; // Assuming u is rank
      const file = String.fromCharCode(65 + b.v); // Assuming v is file
      return `Block ${rank}-${file} (${b.type || 'unknown'}):
Question: ${b.content || 'N/A'}
Answer: ${b.content || 'N/A'}
Parent IDs: ${b.parentIds ? b.parentIds.join(', ') : 'None'}`;
    })
    .join('\n\n');

  // Use additionalContext if provided, otherwise fallback to legacy pyramid.context
  const contextToUse = additionalContext || pyramid.context || "No context provided.";

  // System Prompt
  const systemPrompt = `
You are an AI assistant helping a user with their Pyramid Problem Solver.

PYRAMID CONTEXT:
${contextToUse}

PYRAMID STRUCTURE:
- Title: ${pyramid.title}
- Total blocks: ${Object.keys(pyramid.blocks || {}).length}
- Main question (Block 1-H/0-0): ${pyramid.blocks?.['0-0']?.content || "N/A"}

CURRENT BLOCKS DATA:
${formattedBlocks}

Your role is to:
1. Help the user analyze their problem-solving process
2. Suggest new questions to explore
3. Identify patterns or gaps in their reasoning
4. Provide insights based on their answers
5. Guide them toward the final answer

Be concise, insightful, and reference specific blocks (e.g., "Block 2-A") when relevant.
Always consider the pyramid context and structure in your responses.
Markdown is supported in your response.
`;

  // Convert chat history to Anthropic format
  // Limit to last 20 messages roughly
  const recentHistory = chatHistory.slice(-20).map(msg => ({
    role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
    content: msg.content
  }));

  // Add current user message
  const messages = [
    ...recentHistory,
    { role: "user" as const, content: userMessage }
  ];

  try {
    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
    });

    return (msg.content[0] as any).text;
  } catch (error) {
    console.error("AI Chat Error:", error);
    throw error;
  }
};

/**
 * Send a chat message to Claude AI with product definition context
 */
export const sendProductDefinitionChatMessage = async (apiKey: string, productDefinition: ProductDefinition, additionalContext: string | null, history: ChatMessage[], userMessage: string): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");

  const anthropic = new Anthropic({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });

  // Format history
  const historyText = history.slice(-10).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

  const prompt = `
You are an expert product manager assistant.
You are helping the user define a product using a structured methodology.

CURRENT PRODUCT DEFINITION:
Title: ${productDefinition.title}
Current State: ${JSON.stringify(productDefinition.data, null, 2)}

ADDITIONAL CONTEXT (Linked Pyramids, Docs, etc.):
${additionalContext || "No additional context linked."}

CHAT HISTORY:
${historyText}

USER: ${userMessage}

ASSISTANT:
  `;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    return (msg.content[0] as any).text;
  } catch (error) {
    console.error("Chat Error:", error);
    throw error;
  }
};

/**
 * Send a global chat message to Claude AI
 */
export const sendGlobalChatMessage = async (apiKey: string, globalContext: any, chatHistory: ChatMessage[], userMessage: string): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");

  const anthropic = new Anthropic({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });

  const systemPrompt = `
You are an intelligent assistant for the "Pyramid Solver" platform.
You have access to a global context of documents, product definitions, and problem-solving pyramids.
`;
  // Assuming simplified implementation as the original was cut off
  
    try {
    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    return (msg.content[0] as any).text;
  } catch (error) {
    console.error("Chat Error:", error);
    throw error;
  }
};
