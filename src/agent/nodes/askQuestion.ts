import { RunnableConfig } from "@langchain/core/runnables";
import { ChatAnthropic } from "@langchain/anthropic";
import {
  InterviewState,
  InterviewStateUpdate,
  getCurrentQuestion,
} from "../state.js";
import { getAskQuestionPrompt } from "../prompts/templates.js";
import { formatQuestionVerbatim } from "../constants/cannedMessages.js";

/**
 * Ask the current question to the user.
 * 
 * This node:
 * 1. Gets the current question from the questions array
 * 2. Formats it appropriately based on type
 * 3. Uses LLM to phrase it naturally (or verbatim in fallback mode)
 * 4. Resets follow-up count for new question
 */
export const askQuestion = async (
  state: InterviewState,
  _config: RunnableConfig
): Promise<InterviewStateUpdate> => {
  const question = getCurrentQuestion(state);

  if (!question) {
    // No more questions - should not reach here normally
    throw new Error("No current question to ask");
  }

  let questionMessage: string;

  if (state.llmFallback) {
    // Use verbatim question formatting
    questionMessage = formatQuestionVerbatim(
      question.text,
      question.type,
      question.options
    );
  } else {
    // Use LLM to phrase the question naturally
    try {
      const model = new ChatAnthropic({
        model: "claude-3-5-haiku-latest",
        temperature: 0.7,
      });

      const prompt = getAskQuestionPrompt(
        question.text,
        question.type,
        question.options
      );
      const response = await model.invoke(prompt);
      questionMessage = response.content as string;
    } catch (error) {
      // Fallback to verbatim on error
      console.warn("LLM call failed, using verbatim question:", error);
      questionMessage = formatQuestionVerbatim(
        question.text,
        question.type,
        question.options
      );
    }
  }

  return {
    // Reset for new question
    currentFollowupCount: 0,
    currentFollowups: [],
    rawResponse: null,
    translatedResponse: null,
    wasTranslated: false,
    categories: null,
    needsReprompt: false,
    repromptReason: null,
    // Add the question message
    messages: [
      {
        role: "assistant",
        content: questionMessage,
      },
    ],
  };
};

