import { RunnableConfig } from "@langchain/core/runnables";
import { ChatAnthropic } from "@langchain/anthropic";
import {
  InterviewState,
  InterviewStateUpdate,
  InterviewConfig,
} from "../state.js";
import { validateInterviewConfig } from "../validation/validators.js";
import { getWelcomePrompt } from "../prompts/templates.js";
import { getWelcomeMessage } from "../constants/cannedMessages.js";

/**
 * Initialize the interview from the input configuration.
 * 
 * This node:
 * 1. Validates the input configuration
 * 2. Sets up initial state
 * 3. Generates a welcome message
 * 
 * Input can come from:
 * - State fields directly (interviewType, questions) - for LangGraph Studio
 * - config.configurable.interviewConfig - for programmatic use
 */
export const initialize = async (
  state: InterviewState,
  config: RunnableConfig
): Promise<InterviewStateUpdate> => {
  // If we already have questions AND they're initialized, we're already done
  if (state.questions && state.questions.length > 0 && state.startedAt) {
    return {};
  }

  // Try to get config from configurable first, then fall back to state fields
  const configurableConfig = config.configurable?.interviewConfig as InterviewConfig | undefined;
  
  // Build the input config from either source
  const inputConfig: InterviewConfig | undefined = configurableConfig || (
    state.interviewType && state.questions && state.questions.length > 0
      ? {
          interview_type: state.interviewType,
          questions: state.questions,
          llm_fallback: state.llmFallback,
        }
      : undefined
  );

  if (!inputConfig) {
    throw new Error(
      "Interview configuration is required. Please provide interviewType and questions in the input."
    );
  }

  // Validate the input
  const validation = validateInterviewConfig(inputConfig);
  if (!validation.isValid) {
    throw new Error(`Invalid interview configuration: ${validation.error}`);
  }

  const { interview_type, questions, llm_fallback = false } = inputConfig;

  // Generate welcome message
  let welcomeMessage: string;

  if (llm_fallback) {
    // Use canned welcome message
    welcomeMessage = getWelcomeMessage(interview_type);
  } else {
    // Use LLM to generate welcome
    try {
      const model = new ChatAnthropic({
        model: "claude-3-5-haiku-latest",
        temperature: 0.7,
      });

      const prompt = getWelcomePrompt(interview_type);
      const response = await model.invoke(prompt);
      welcomeMessage = response.content as string;
    } catch (error) {
      // Fallback to canned message on error
      console.warn("LLM call failed, using canned welcome message:", error);
      welcomeMessage = getWelcomeMessage(interview_type);
    }
  }

  return {
    interviewType: interview_type,
    questions: questions,
    llmFallback: llm_fallback,
    currentQuestionIndex: 0,
    currentFollowupCount: 0,
    responses: [],
    currentFollowups: [],
    startedAt: new Date().toISOString(),
    isComplete: false,
    messages: [
      {
        role: "assistant",
        content: welcomeMessage,
      },
    ],
  };
};

