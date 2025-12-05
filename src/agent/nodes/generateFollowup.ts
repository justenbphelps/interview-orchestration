import { RunnableConfig } from "@langchain/core/runnables";
import { ChatAnthropic } from "@langchain/anthropic";
import {
  InterviewState,
  InterviewStateUpdate,
  FollowupExchange,
  getCurrentQuestion,
} from "../state.js";
import { getGenerateFollowupPrompt } from "../prompts/templates.js";

/**
 * Generate a contextual follow-up question.
 * 
 * This node:
 * 1. Uses LLM to generate a follow-up based on the response
 * 2. Increments the follow-up count
 * 3. Stores the follow-up question for later pairing with answer
 */
export const generateFollowup = async (
  state: InterviewState,
  _config: RunnableConfig
): Promise<InterviewStateUpdate> => {
  const question = getCurrentQuestion(state);
  const response = state.translatedResponse;

  if (!question || !response) {
    throw new Error("Cannot generate follow-up without question and response");
  }

  // In fallback mode, we shouldn't reach here, but handle gracefully
  if (state.llmFallback) {
    // Skip follow-up in fallback mode
    return {};
  }

  try {
    const model = new ChatAnthropic({
      model: "claude-3-5-haiku-latest",
      temperature: 0.7,
    });

    const prompt = getGenerateFollowupPrompt(
      state.interviewType,
      question.text,
      response,
      question.group
    );
    const llmResponse = await model.invoke(prompt);
    const followupQuestion = (llmResponse.content as string).trim();

    // Store the current answer before asking follow-up
    // We'll pair this with the follow-up answer when it comes
    const currentFollowup: FollowupExchange = {
      question: followupQuestion,
      answer: "", // Will be filled when user responds
    };

    // Update the current followups - store the main answer first if this is first followup
    const updatedFollowups = [...state.currentFollowups];
    
    // If this is the first followup, we need to track the original answer
    // The followup exchange will be completed when user responds

    return {
      currentFollowupCount: state.currentFollowupCount + 1,
      // Store partial followup (question only, answer will be added after user responds)
      currentFollowups: [...updatedFollowups, currentFollowup],
      messages: [
        {
          role: "assistant",
          content: followupQuestion,
        },
      ],
    };
  } catch (error) {
    console.warn("Follow-up generation failed:", error);
    // On error, skip the follow-up
    return {};
  }
};

