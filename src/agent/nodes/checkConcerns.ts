import { RunnableConfig } from "@langchain/core/runnables";
import { ChatAnthropic } from "@langchain/anthropic";
import {
  InterviewState,
  InterviewStateUpdate,
  ResponseCategories,
  getCurrentQuestion,
} from "../state.js";
import { getCheckConcernsPrompt } from "../prompts/templates.js";

/**
 * Check the response for concerning content (EEOC, outside scope, incidents).
 * 
 * This node:
 * 1. Uses LLM to analyze the response for concerns
 * 2. Stores the categorization in state
 */
export const checkConcerns = async (
  state: InterviewState,
  _config: RunnableConfig
): Promise<InterviewStateUpdate> => {
  const question = getCurrentQuestion(state);
  const response = state.translatedResponse;

  if (!question || !response) {
    // No concerns if no question/response
    return {
      categories: {
        hasConcerns: false,
        concernType: null,
        concernDetails: null,
        isProperResponse: true,
        needsMoreContext: false,
      },
    };
  }

  // In fallback mode, skip concern checking
  if (state.llmFallback) {
    return {
      categories: {
        hasConcerns: false,
        concernType: null,
        concernDetails: null,
        isProperResponse: true,
        needsMoreContext: false,
      },
    };
  }

  try {
    const model = new ChatAnthropic({
      model: "claude-3-5-haiku-latest",
      temperature: 0,
    });

    const prompt = getCheckConcernsPrompt(question.text, response);
    const llmResponse = await model.invoke(prompt);
    const content = llmResponse.content as string;

    // Parse the JSON response
    const parsed = JSON.parse(content);

    const categories: ResponseCategories = {
      hasConcerns: parsed.hasConcerns === true,
      concernType: parsed.concernType || null,
      concernDetails: parsed.concernDetails || null,
      // These will be set by checkProperResponse node
      isProperResponse: true,
      needsMoreContext: false,
    };

    return { categories };
  } catch (error) {
    console.warn("Concern check failed:", error);
    // On error, assume no concerns
    return {
      categories: {
        hasConcerns: false,
        concernType: null,
        concernDetails: null,
        isProperResponse: true,
        needsMoreContext: false,
      },
    };
  }
};

