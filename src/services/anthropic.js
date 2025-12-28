import Anthropic from '@anthropic-ai/sdk';

/**
 * Generate question suggestions using Claude AI
 * 
 * @param {string} apiKey - The user's Anthropic API Key
 * @param {string} pyramidContext - The overall context of the pyramid problem
 * @param {string} blockType - 'regular' or 'combined'
 * @param {Object} data - Input data depending on block type
 * @returns {Promise<string[]>} - Array of 3 suggested questions
 */
export const generateQuestions = async (apiKey, pyramidContext, blockType, data) => {
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

    const text = msg.content[0].text;
    
    // Parse the numbered list
    const questions = text.split('\n')
      .filter(line => /^\d+\./.test(line.trim()))
      .map(line => line.replace(/^\d+\.\s*/, '').replace(/^"|"$/g, '').trim())
      .slice(0, 3);

    return questions;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
};

/**
 * Generate answer suggestions using Claude AI
 * 
 * @param {string} apiKey - The user's Anthropic API Key
 * @param {string} pyramidContext - The overall context of the pyramid problem
 * @param {string} question - The question to answer (combined or parent)
 * @param {string} historyContext - Context from ancestor blocks
 * @returns {Promise<string[]>} - Array of 3 suggested answers
 */
export const generateAnswers = async (apiKey, pyramidContext, question, historyContext = "") => {
  if (!apiKey) throw new Error("API Key is missing");

  const anthropic = new Anthropic({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true 
  });

  const prompt = `
You are an expert brainstorming assistant helping to solve a complex problem using a pyramid structure.

CONTEXT:
"${pyramidContext}"

HISTORY OF THOUGHT (Previous blocks leading to this point):
${historyContext}

CURRENT QUESTION TO ANSWER:
"${question}"

TASK:
Provide 3 distinct, thoughtful, and concise answers to this question. 
Each answer should represent a slightly different angle or perspective (e.g., optimistic, analytical, or practical).
Return ONLY the 3 answers, numbered 1, 2, 3.
  `;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content[0].text;
    
    // Parse the numbered list
    const answers = text.split('\n')
      .filter(line => /^\d+\./.test(line.trim()))
      .map(line => line.replace(/^\d+\.\s*/, '').replace(/^"|"$/g, '').trim())
      .slice(0, 3);

    return answers;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
};
