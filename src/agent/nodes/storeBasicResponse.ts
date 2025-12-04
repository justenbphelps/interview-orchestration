import { RunnableConfig } from "@langchain/core/runnables";
import {
  InterviewState,
  InterviewStateUpdate,
  QuestionResponse,
  getCurrentQuestion,
} from "../state.js";
import { getBasicAcknowledgement } from "../constants/cannedMessages.js";

/**
 * Store a basic question response and provide canned acknowledgement.
 * 
 * This node:
 * 1. Creates a QuestionResponse object
 * 2. Adds it to the responses array
 * 3. Returns a canned acknowledgement
 * 4. Increments the question index
 */
export const storeBasicResponse = async (
  state: InterviewState,
  _config: RunnableConfig
): Promise<InterviewStateUpdate> => {
  const question = getCurrentQuestion(state);

  if (!question) {
    throw new Error("No current question to store response for");
  }

  // Create the response object
  const questionResponse: QuestionResponse = {
    questionIndex: state.currentQuestionIndex,
    questionText: question.text,
    questionType: question.type,
    group: question.group,
    rawAnswer: state.rawResponse || "",
    translatedAnswer: state.wasTranslated ? state.translatedResponse || undefined : undefined,
    wasTranslated: state.wasTranslated,
    wasSkipped: false,
    hadConcerns: false,
    followups: [],
  };

  // Get canned acknowledgement
  const acknowledgement = getBasicAcknowledgement(question.type);

  // Add to responses and move to next question
  const updatedResponses = [...state.responses, questionResponse];

  return {
    responses: updatedResponses,
    currentQuestionIndex: state.currentQuestionIndex + 1,
    // Clear current turn state
    rawResponse: null,
    translatedResponse: null,
    wasTranslated: false,
    categories: null,
    currentFollowups: [],
    currentFollowupCount: 0,
    // Add acknowledgement message
    messages: [
      {
        role: "assistant",
        content: acknowledgement,
      },
    ],
  };
};

