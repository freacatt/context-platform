import Anthropic from '@anthropic-ai/sdk';
import { QuestionGenerationData, BlockType, Pyramid, ProductDefinitionNode, ProductDefinition, ChatMessage } from '../types';

/**
 * Generate question suggestions using Claude AI
 */
export const generateQuestions = async (apiKey: string, pyramidContext: string, blockType: BlockType, data: QuestionGenerationData, globalContext: string = ""): Promise<string[]> => {
  if (!apiKey) throw new Error("API Key is missing");

  const anthropic = new Anthropic({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // Required for client-side usage
  });

  const historyContext = data.historyContext || "";
  let prompt = "";
  
  const globalContextSection = globalContext ? `
GLOBAL PROJECT CONTEXT:
${globalContext}

GLOBAL CONTEXT INSTRUCTIONS:
1. The global context is provided in JSON format. **DO NOT output this JSON to the user**.
2. Read and understand the JSON structure and content to answer questions.
` : "";

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
${globalContextSection}

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
${globalContextSection}

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
export const generateAnswers = async (apiKey: string, pyramidContext: string, question: string, data: QuestionGenerationData, globalContext: string = ""): Promise<string[]> => {
  if (!apiKey) throw new Error("API Key is missing");

  const anthropic = new Anthropic({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });

  const historyContext = data.historyContext || "";

  const globalContextSection = globalContext ? `
GLOBAL PROJECT CONTEXT:
${globalContext}

GLOBAL CONTEXT INSTRUCTIONS:
1. The global context is provided in JSON format. **DO NOT output this JSON to the user**.
2. Read and understand the JSON structure and content to answer questions.
` : "";

  const prompt = `
You are an expert brainstorming assistant helping to solve a complex problem using a pyramid structure.

CONTEXT:
"${pyramidContext}"
${globalContextSection}

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
export const generateProductDefinitionSuggestion = async (apiKey: string, node: ProductDefinitionNode, productTitle: string, contextData: string, globalContext: string = ""): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");

  const anthropic = new Anthropic({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });

  const globalContextSection = globalContext ? `
GLOBAL PROJECT CONTEXT:
${globalContext}

GLOBAL CONTEXT INSTRUCTIONS:
1. The global context is provided in JSON format. **DO NOT output this JSON to the user**.
2. Read and understand the JSON structure and content to answer questions.
` : "";

  const prompt = `
You are an expert product manager assistant helping to define a product using a structured methodology.

PRODUCT TITLE: "${productTitle}"

CURRENT TOPIC: "${node.label}"
QUESTION TO ANSWER: "${node.question || "Describe this aspect of the product"}"

CONTEXT INFORMATION:
${contextData}
${globalContextSection}

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
    fieldPath: string,
    globalContext: string = ""
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");

  const anthropic = new Anthropic({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });

  const globalContextSection = globalContext ? `
GLOBAL PROJECT CONTEXT:
${globalContext}
` : "";

  const prompt = `
You are an expert software architect assistant.

ARCHITECTURE TITLE: "${architectureTitle}"

CURRENT FIELD: "${fieldTitle}"
PATH: ${fieldPath}
DESCRIPTION/CONTEXT: "${fieldDescription}"

${globalContextSection}

TASK:
Suggest a professional, detailed, and best-practice value for this field.
- If the field expects a list, provide a bulleted list or newline-separated items. Include brief explanations for key items if beneficial.
- If it expects a key-value map, provide "Key: Value" format.
- If it expects a description, provide a comprehensive paragraph or two, explaining the reasoning and specific technologies or patterns recommended.
- Do NOT provide single-word answers unless the field is strictly a simple property (like a version number).
- Provide industry-standard recommendations that fit the context of the architecture title.

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
 * Generate a suggestion for a Technical Task field
 */
export const generateTechnicalTaskSuggestion = async (
  apiKey: string,
  taskTitle: string,
  taskType: string,
  fieldLabel: string,
  fieldDescription: string,
  currentTaskContext: string,
  globalContext: string
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");

  const anthropic = new Anthropic({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });

  const prompt = `
You are an expert software engineer and technical lead.

TASK TITLE: "${taskTitle}"
TASK TYPE: "${taskType}"
FIELD: "${fieldLabel}"
DESCRIPTION: "${fieldDescription}"

CURRENT TASK CONTEXT:
${currentTaskContext}

GLOBAL PROJECT CONTEXT:
${globalContext}

TASK:
Suggest a content for the field "${fieldLabel}".
Provide a professional, concise, and technical suggestion.
Return ONLY the suggestion text.
`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    return (msg.content[0] as any).text.trim();
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
};

/**
 * Generate a suggestion for a Diagram Block description
 */
export const generateDiagramBlockDescription = async (apiKey: string, blockTitle: string, diagramTitle: string, globalContext: string = ""): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");

  const anthropic = new Anthropic({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });

  const globalContextSection = globalContext ? `
GLOBAL PROJECT CONTEXT:
${globalContext}

GLOBAL CONTEXT INSTRUCTIONS:
1. The global context is provided in JSON format. **DO NOT output this JSON to the user**.
2. Read and understand the JSON structure and content to answer questions.
` : "";

  const prompt = `
You are an expert system architect and visual thinker helping to create a diagram.

DIAGRAM TITLE: "${diagramTitle}"

CURRENT BLOCK TITLE: "${blockTitle}"

${globalContextSection}

TASK:
Suggest a concise description for this block in the diagram.
The description should explain what this block represents or does in the context of the diagram.
Keep it under 3 sentences.
`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    return (msg.content[0] as any).text.trim();
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
};

/**
 * Generate a suggestion for UI/UX Architecture fields (theme/component/page)
 */
export const generateUiUxSuggestion = async (
  apiKey: string,
  architectureTitle: string,
  subjectType: string,
  subjectName: string,
  contextDescription: string,
  globalContext: string = "",
  targetField: string = "description"
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");

  const anthropic = new Anthropic({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });

  const globalContextSection = globalContext ? `
GLOBAL PROJECT CONTEXT:
${globalContext}

GLOBAL CONTEXT INSTRUCTIONS:
1. The global context is provided in JSON format. **DO NOT output this JSON to the user**.
2. Read and understand the JSON structure and content to answer questions.
` : "";

  const prompt = `
You are a senior UI/UX designer optimizing a design system.

ARCHITECTURE TITLE: "${architectureTitle}"
SUBJECT TYPE: "${subjectType}"
SUBJECT NAME: "${subjectName}"

CURRENT CONTEXT:
${contextDescription}

${globalContextSection}

TASK:
Suggest a professional, concise value for the "${targetField}" field.
- Focus on practical guidance fit for a modern web app.
- If "${targetField}" is descriptive, provide 2–4 sentences.
- Avoid filler; return ONLY the suggestion content.
`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });
    return (msg.content[0] as any).text.trim();
  } catch (error) {
    console.error("AI Suggestion Error:", error);
    throw error;
  }
};

export const sendChatMessage = async (
  apiKey: string,
  pyramid: Pyramid,
  history: ChatMessage[],
  userMessage: string,
  context: string = "",
  globalContext: string = ""
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");
  const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const historyText = history.map(h => `${h.role.toUpperCase()}: ${h.content}`).join("\n");
  const globalContextSection = globalContext ? `\nGLOBAL PROJECT CONTEXT:\n${globalContext}\n` : "";
  const prompt = `
You are an assistant helping with a problem-solving pyramid.
PYRAMID TITLE: "${pyramid.title}"
PYRAMID CONTEXT:
${context}
${globalContextSection}
CHAT HISTORY:
${historyText}
USER MESSAGE:
${userMessage}
Respond concisely and helpfully. Return ONLY the assistant reply.
`;
  const msg = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });
  return (msg.content[0] as any).text.trim();
};

export const sendProductDefinitionChatMessage = async (
  apiKey: string,
  productDefinition: ProductDefinition,
  context: string = "",
  history: ChatMessage[],
  userMessage: string,
  globalContext: string = ""
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");
  const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const historyText = history.map(h => `${h.role.toUpperCase()}: ${h.content}`).join("\n");
  const globalContextSection = globalContext ? `\nGLOBAL PROJECT CONTEXT:\n${globalContext}\n` : "";
  const prompt = `
You are an assistant helping with a product definition structured graph.
PRODUCT TITLE: "${productDefinition.title}"
PRODUCT CONTEXT:
${context}
${globalContextSection}
CHAT HISTORY:
${historyText}
USER MESSAGE:
${userMessage}
Respond concisely and helpfully. Return ONLY the assistant reply.
`;
  const msg = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });
  return (msg.content[0] as any).text.trim();
};

export const sendGlobalChatMessage = async (
  apiKey: string,
  globalContext: string,
  history: ChatMessage[],
  userMessage: string,
  currentPageContext: string = ""
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");
  const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const historyText = history.map(h => `${h.role.toUpperCase()}: ${h.content}`).join("\n");
  
  const currentPageSection = currentPageContext ? `\nCURRENT PAGE CONTEXT (The user is currently looking at this):\n${currentPageContext}\n` : "";

  const prompt = `
You are an assistant responding with awareness of the provided global context and the current page the user is viewing.

GLOBAL PROJECT CONTEXT:
${globalContext}
${currentPageSection}
CHAT HISTORY:
${historyText}
USER MESSAGE:
${userMessage}
Respond concisely and helpfully. Return ONLY the assistant reply.
`;
  const msg = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });
  return (msg.content[0] as any).text.trim();
};
