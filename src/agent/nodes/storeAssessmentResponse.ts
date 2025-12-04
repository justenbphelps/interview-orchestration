import { RunnableConfig } from "@langchain/core/runnables";
import {
  InterviewState,
  InterviewStateUpdate,
  QuestionResponse,
  ConcernType,
  getCurrentQuestion,
} from "../state.js";

/**
 * Store an assessment question response with all its data.
 * 
 * This node:
 * 1. Creates a QuestionResponse object with categories
 * 2. Includes any follow-up exchanges
 * 3. Adds it to the responses array
 * 4. Increments the question index
 */
export const storeAssessmentResponse = async (
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
    hadConcerns: state.categories?.hasConcerns ?? false,
    concernType: state.categories?.concernType as ConcernType | undefined,
    followups: [...state.currentFollowups],
  };

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
  };
};

