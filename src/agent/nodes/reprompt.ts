import { RunnableConfig } from "@langchain/core/runnables";
import { ChatAnthropic } from "@langchain/anthropic";
import {
  InterviewState,
  InterviewStateUpdate,
  getCurrentQuestion,
} from "../state.js";
import { getRepromptPrompt } from "../prompts/templates.js";
import { getRepromptMessage } from "../constants/cannedMessages.js";

/**
 * Generate a friendly re-prompt for invalid responses.
 * 
 * This node:
 * 1. Gets the current question and error reason
 * 2. Generates a friendly re-prompt message
 * 3. Resets the reprompt flag
 */
export const reprompt = async (
  state: InterviewState,
  _config: RunnableConfig
): Promise<InterviewStateUpdate> => {
  const question = getCurrentQuestion(state);

  if (!question) {
    throw new Error("No current question for reprompt");
  }

  const errorMessage = state.repromptReason || "Please try again.";
  let repromptMessage: string;

  if (state.llmFallback) {
    // Use canned reprompt message
    repromptMessage = getRepromptMessage(question.type, question.options);
  } else {
    // Use LLM to generate friendly reprompt
    try {
      const model = new ChatAnthropic({
        model: "claude-3-5-haiku-latest",
        temperature: 0.7,
      });

      const prompt = getRepromptPrompt(
        question.text,
        question.type,
        errorMessage,
        question.options
      );
      const response = await model.invoke(prompt);
      repromptMessage = response.content as string;
    } catch (error) {
      // Fallback to canned message on error
      console.warn("LLM call failed, using canned reprompt:", error);
      repromptMessage = getRepromptMessage(question.type, question.options);
    }
  }

  return {
    needsReprompt: false,
    repromptReason: null,
    messages: [
      {
        role: "assistant",
        content: repromptMessage,
      },
    ],
  };
};

