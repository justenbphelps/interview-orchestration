import { RunnableConfig } from "@langchain/core/runnables";
import { ChatAnthropic } from "@langchain/anthropic";
import {
  InterviewState,
  InterviewStateUpdate,
  getCurrentQuestion,
} from "../state.js";
import { getCheckProperResponsePrompt } from "../prompts/templates.js";

/**
 * Check if the response properly addresses the question.
 * 
 * This node:
 * 1. Uses LLM to analyze if the response is complete
 * 2. Updates the categories in state
 */
export const checkProperResponse = async (
  state: InterviewState,
  _config: RunnableConfig
): Promise<InterviewStateUpdate> => {
  const question = getCurrentQuestion(state);
  const response = state.translatedResponse;

  if (!question || !response) {
    return {};
  }

  // In fallback mode, assume response is proper
  if (state.llmFallback) {
    return {
      categories: {
        ...state.categories,
        hasConcerns: state.categories?.hasConcerns ?? false,
        concernType: state.categories?.concernType ?? null,
        concernDetails: state.categories?.concernDetails ?? null,
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

    const prompt = getCheckProperResponsePrompt(question.text, response);
    const llmResponse = await model.invoke(prompt);
    const content = llmResponse.content as string;

    // Parse the JSON response
    const parsed = JSON.parse(content);

    return {
      categories: {
        ...state.categories,
        hasConcerns: state.categories?.hasConcerns ?? false,
        concernType: state.categories?.concernType ?? null,
        concernDetails: state.categories?.concernDetails ?? null,
        isProperResponse: parsed.isProperResponse === true,
        needsMoreContext: parsed.needsMoreContext === true,
      },
    };
  } catch (error) {
    console.warn("Proper response check failed:", error);
    // On error, assume response is proper
    return {
      categories: {
        ...state.categories,
        hasConcerns: state.categories?.hasConcerns ?? false,
        concernType: state.categories?.concernType ?? null,
        concernDetails: state.categories?.concernDetails ?? null,
        isProperResponse: true,
        needsMoreContext: false,
      },
    };
  }
};

