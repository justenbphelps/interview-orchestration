import { RunnableConfig } from "@langchain/core/runnables";
import {
  InterviewState,
  InterviewStateUpdate,
  getCurrentQuestion,
} from "../state.js";
import { validateResponse } from "../validation/validators.js";

/**
 * Validate the format of the user's response based on question type.
 * 
 * This node:
 * 1. Gets the current question
 * 2. Validates the response format
 * 3. Sets needsReprompt if invalid
 */
export const validateFormat = async (
  state: InterviewState,
  _config: RunnableConfig
): Promise<InterviewStateUpdate> => {
  const question = getCurrentQuestion(state);
  const response = state.translatedResponse;

  if (!question) {
    throw new Error("No current question for validation");
  }

  if (!response) {
    return {
      needsReprompt: true,
      repromptReason: "No response provided.",
    };
  }

  const validationResult = validateResponse(response, question);

  if (!validationResult.isValid) {
    return {
      needsReprompt: true,
      repromptReason: validationResult.errorMessage || "Invalid response format.",
    };
  }

  // Update the translated response with normalized value if available
  return {
    needsReprompt: false,
    repromptReason: null,
    translatedResponse: validationResult.normalizedValue || response,
  };
};

