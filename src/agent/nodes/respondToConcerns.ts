import { RunnableConfig } from "@langchain/core/runnables";
import {
  InterviewState,
  InterviewStateUpdate,
  ConcernType,
} from "../state.js";
import { getConcernResponse } from "../constants/cannedMessages.js";

/**
 * Respond to detected concerns with appropriate message.
 * 
 * This node:
 * 1. Gets the concern type from state
 * 2. Returns the appropriate canned response
 * 3. Logs the concern for review
 */
export const respondToConcerns = async (
  state: InterviewState,
  _config: RunnableConfig
): Promise<InterviewStateUpdate> => {
  const concernType = state.categories?.concernType as ConcernType | undefined;

  if (!concernType) {
    // No concern type, use generic outside_scope response
    const response = getConcernResponse("outside_scope");
    return {
      messages: [
        {
          role: "assistant",
          content: response,
        },
      ],
    };
  }

  // Get the appropriate response
  const response = getConcernResponse(concernType);

  // Log the concern (in production, this would go to a proper logging system)
  console.log(
    `[CONCERN DETECTED] Type: ${concernType}, Details: ${state.categories?.concernDetails}`
  );

  return {
    messages: [
      {
        role: "assistant",
        content: response,
      },
    ],
  };
};

