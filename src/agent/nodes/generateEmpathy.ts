import { RunnableConfig } from "@langchain/core/runnables";
import { ChatAnthropic } from "@langchain/anthropic";
import {
  InterviewState,
  InterviewStateUpdate,
  getCurrentQuestion,
} from "../state.js";
import { getGenerateEmpathyPrompt } from "../prompts/templates.js";
import { SIMPLE_EMPATHY } from "../constants/cannedMessages.js";

/**
 * Generate an empathetic acknowledgement of the user's response.
 * 
 * This node:
 * 1. Uses LLM to generate a warm acknowledgement
 * 2. Shows understanding of their response
 */
export const generateEmpathy = async (
  state: InterviewState,
  _config: RunnableConfig
): Promise<InterviewStateUpdate> => {
  const question = getCurrentQuestion(state);
  const response = state.translatedResponse;

  if (!question || !response) {
    return {};
  }

  // In fallback mode, use simple acknowledgement
  if (state.llmFallback) {
    return {
      messages: [
        {
          role: "assistant",
          content: SIMPLE_EMPATHY,
        },
      ],
    };
  }

  try {
    const model = new ChatAnthropic({
      model: "claude-3-5-haiku-latest",
      temperature: 0.7,
    });

    const prompt = getGenerateEmpathyPrompt(
      state.interviewType,
      question.text,
      response
    );
    const llmResponse = await model.invoke(prompt);
    const empathyMessage = (llmResponse.content as string).trim();

    return {
      messages: [
        {
          role: "assistant",
          content: empathyMessage,
        },
      ],
    };
  } catch (error) {
    console.warn("Empathy generation failed:", error);
    // Fallback to simple acknowledgement
    return {
      messages: [
        {
          role: "assistant",
          content: SIMPLE_EMPATHY,
        },
      ],
    };
  }
};

