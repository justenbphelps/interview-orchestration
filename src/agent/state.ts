import { BaseMessage, BaseMessageLike } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";

// =============================================================================
// INPUT TYPES
// =============================================================================

/**
 * Supported interview types.
 */
export type InterviewType = "screener" | "exit";

/**
 * Supported question types.
 * - Basic questions (max_followups = 0): phone_number, short_answer, yes_no, single_select
 * - Assessment questions (max_followups > 0): Can be any type, uses LLM analysis
 */
export type QuestionType =
  | "number_scale"
  | "long_answer"
  | "short_answer"
  | "yes_no"
  | "single_select"
  | "phone_number";

/**
 * A single question in the interview.
 */
export interface Question {
  /** The type of question - determines validation and formatting */
  type: QuestionType;
  /** The question text to ask */
  text: string;
  /** Maximum follow-up questions allowed. 0 = basic question (canned response) */
  max_followups: number;
  /** Optional grouping/category for the question */
  group?: string;
  /** Options for single_select questions */
  options?: string[];
}

/**
 * Input configuration to start an interview.
 */
export interface InterviewConfig {
  /** Type of interview being conducted */
  interview_type: InterviewType;
  /** Array of questions to ask */
  questions: Question[];
  /** If true, skip LLM and use verbatim questions only */
  llm_fallback?: boolean;
}

// =============================================================================
// RESPONSE CATEGORIZATION
// =============================================================================

/**
 * Types of concerns that can be detected in responses.
 */
export type ConcernType = "eeoc" | "outside_scope" | "incident";

/**
 * Categories determined by LLM analysis of a response.
 */
export interface ResponseCategories {
  /** Whether any concerns were detected */
  hasConcerns: boolean;
  /** Type of concern if detected */
  concernType?: ConcernType | null;
  /** Details about the concern */
  concernDetails?: string | null;
  /** Whether the response properly addresses the question */
  isProperResponse: boolean;
  /** Whether the response needs more context/detail */
  needsMoreContext: boolean;
}

// =============================================================================
// COLLECTED DATA
// =============================================================================

/**
 * A follow-up question and answer exchange.
 */
export interface FollowupExchange {
  /** The follow-up question that was asked */
  question: string;
  /** The user's response to the follow-up */
  answer: string;
  /** Translated answer if translation was needed */
  translatedAnswer?: string;
}

/**
 * Complete response data for a single question.
 */
export interface QuestionResponse {
  /** Index of the question in the questions array */
  questionIndex: number;
  /** The original question text */
  questionText: string;
  /** The question type */
  questionType: QuestionType;
  /** Optional group/category */
  group?: string;
  /** The raw answer as provided by the user */
  rawAnswer: string;
  /** Translated answer if translation was needed */
  translatedAnswer?: string;
  /** Whether translation was performed */
  wasTranslated: boolean;
  /** Whether the user skipped this question */
  wasSkipped: boolean;
  /** Whether concerns were detected in the response */
  hadConcerns: boolean;
  /** Type of concern if any */
  concernType?: ConcernType;
  /** All follow-up exchanges for this question */
  followups: FollowupExchange[];
}

// =============================================================================
// OUTPUT TYPES
// =============================================================================

/**
 * A single message in the transcript.
 */
export interface TranscriptMessage {
  /** Who sent the message */
  role: "assistant" | "user";
  /** The message content */
  content: string;
  /** When the message was sent */
  timestamp: string;
}

/**
 * Final output of a completed interview.
 */
export interface TranscriptOutput {
  /** Type of interview conducted */
  interviewType: InterviewType;
  /** When the interview started */
  startedAt: string;
  /** When the interview completed */
  completedAt: string;
  /** Total number of questions */
  questionCount: number;
  /** Number of questions that were answered */
  questionsAnswered: number;
  /** Number of questions with concerns detected */
  concernsDetected: number;
  /** Detailed response data for each question */
  responses: QuestionResponse[];
  /** Full conversation transcript */
  fullTranscript: TranscriptMessage[];
}

// =============================================================================
// STATE ANNOTATION
// =============================================================================

/**
 * The primary state schema for the interview orchestration graph.
 */
export const InterviewStateAnnotation = Annotation.Root({
  // ===========================================================================
  // Configuration (set once at initialization)
  // ===========================================================================

  /**
   * The type of interview being conducted.
   */
  interviewType: Annotation<InterviewType>,

  /**
   * Array of questions to ask.
   */
  questions: Annotation<Question[]>,

  /**
   * If true, skip LLM calls and use verbatim questions.
   */
  llmFallback: Annotation<boolean>({
    reducer: (_, b) => b,
    default: () => false,
  }),

  // ===========================================================================
  // Progress Tracking
  // ===========================================================================

  /**
   * Index of the current question (0-based).
   */
  currentQuestionIndex: Annotation<number>({
    reducer: (_, b) => b,
    default: () => 0,
  }),

  /**
   * Number of follow-ups asked for the current question.
   */
  currentFollowupCount: Annotation<number>({
    reducer: (_, b) => b,
    default: () => 0,
  }),

  // ===========================================================================
  // Current Turn Data
  // ===========================================================================

  /**
   * The raw response from the user (before translation).
   */
  rawResponse: Annotation<string | null>({
    reducer: (_, b) => b,
    default: () => null,
  }),

  /**
   * The translated response (or same as raw if no translation needed).
   */
  translatedResponse: Annotation<string | null>({
    reducer: (_, b) => b,
    default: () => null,
  }),

  /**
   * Whether the current response was translated.
   */
  wasTranslated: Annotation<boolean>({
    reducer: (_, b) => b,
    default: () => false,
  }),

  /**
   * Categories from LLM analysis of current response.
   */
  categories: Annotation<ResponseCategories | null>({
    reducer: (_, b) => b,
    default: () => null,
  }),

  // ===========================================================================
  // Validation State
  // ===========================================================================

  /**
   * Whether the current response needs a re-prompt.
   */
  needsReprompt: Annotation<boolean>({
    reducer: (_, b) => b,
    default: () => false,
  }),

  /**
   * Reason for the re-prompt if needed.
   */
  repromptReason: Annotation<string | null>({
    reducer: (_, b) => b,
    default: () => null,
  }),

  // ===========================================================================
  // Collected Data
  // ===========================================================================

  /**
   * All completed question responses.
   */
  responses: Annotation<QuestionResponse[]>({
    reducer: (existing, update) => {
      // Allow full replacement or append
      if (Array.isArray(update)) {
        return update;
      }
      return existing;
    },
    default: () => [],
  }),

  /**
   * Current question's follow-up exchanges (before storing).
   */
  currentFollowups: Annotation<FollowupExchange[]>({
    reducer: (_, b) => b,
    default: () => [],
  }),

  // ===========================================================================
  // Conversation
  // ===========================================================================

  /**
   * Full conversation message history.
   */
  messages: Annotation<BaseMessage[], BaseMessageLike[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),

  // ===========================================================================
  // Timing
  // ===========================================================================

  /**
   * When the interview started.
   */
  startedAt: Annotation<string | null>({
    reducer: (_, b) => b,
    default: () => null,
  }),

  // ===========================================================================
  // Completion
  // ===========================================================================

  /**
   * Whether the interview is complete.
   */
  isComplete: Annotation<boolean>({
    reducer: (_, b) => b,
    default: () => false,
  }),

  /**
   * Final transcript output.
   */
  transcript: Annotation<TranscriptOutput | null>({
    reducer: (_, b) => b,
    default: () => null,
  }),
});

/**
 * Type alias for the interview state.
 */
export type InterviewState = typeof InterviewStateAnnotation.State;

/**
 * Type alias for state updates.
 */
export type InterviewStateUpdate = typeof InterviewStateAnnotation.Update;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Checks if a question is a "basic" question (no LLM analysis needed).
 */
export const isBasicQuestion = (question: Question): boolean => {
  return question.max_followups === 0;
};

/**
 * Gets the current question from state.
 */
export const getCurrentQuestion = (state: InterviewState): Question | null => {
  if (state.currentQuestionIndex >= state.questions.length) {
    return null;
  }
  return state.questions[state.currentQuestionIndex];
};

/**
 * Checks if there are more questions remaining.
 */
export const hasMoreQuestions = (state: InterviewState): boolean => {
  return state.currentQuestionIndex < state.questions.length;
};

/**
 * Checks if more follow-ups are allowed for current question.
 */
export const canAskFollowup = (state: InterviewState): boolean => {
  const question = getCurrentQuestion(state);
  if (!question) return false;
  return state.currentFollowupCount < question.max_followups;
};
