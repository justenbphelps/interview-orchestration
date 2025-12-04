import { StateGraph, START, END } from "@langchain/langgraph";
import {
  InterviewStateAnnotation,
  InterviewState,
  isBasicQuestion,
  getCurrentQuestion,
  hasMoreQuestions,
  canAskFollowup,
} from "./state.js";

// Import all nodes
import {
  initialize,
  askQuestion,
  translateIfNeeded,
  validateFormat,
  reprompt,
  storeBasicResponse,
  respondToConcerns,
  storeAssessmentResponse,
  generateEmpathy,
  generateFollowup,
  complete,
  analyzeResponseParallel,
} from "./nodes/index.js";

// =============================================================================
// ROUTING FUNCTIONS
// =============================================================================

/**
 * Check if a message is from a human/user.
 */
const isHumanMessage = (msg: unknown): boolean => {
  if (!msg || typeof msg !== "object") return false;
  
  const message = msg as Record<string, unknown>;
  
  // Try _getType() method first (BaseMessage)
  if (typeof message._getType === "function") {
    return (message._getType as () => string)() === "human";
  }
  // Check for HumanMessage class name
  if (message.constructor?.name === "HumanMessage") {
    return true;
  }
  // Check for role property (plain object)
  if (message.role === "human" || message.role === "user") {
    return true;
  }
  // Check for type property
  if (message.type === "human") {
    return true;
  }
  
  return false;
};

/**
 * Entry router - determines if we're starting fresh or processing a response.
 */
const routeEntry = (
  state: InterviewState
): "initialize" | "translateIfNeeded" => {
  // If we haven't started yet (no startedAt timestamp), initialize
  if (!state.startedAt) {
    return "initialize";
  }
  
  // If interview is complete, we shouldn't be here
  if (state.isComplete) {
    return "initialize"; // This would be an error case
  }
  
  // Check if there's a new user message to process
  // by looking at the last message in the conversation
  const messages = state.messages;
  if (messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (isHumanMessage(lastMessage)) {
      // We have a user message to process
      return "translateIfNeeded";
    }
  }
  
  // Default to initialize (first invocation)
  return "initialize";
};

/**
 * Routes after validateFormat - either reprompt or continue processing.
 */
const routeAfterValidate = (
  state: InterviewState
): "reprompt" | "routeByQuestionType" => {
  if (state.needsReprompt) {
    return "reprompt";
  }
  return "routeByQuestionType";
};

/**
 * Routes based on whether current question is basic or assessment.
 */
const routeByQuestionType = (
  state: InterviewState
): "storeBasicResponse" | "analyzeResponse" => {
  const question = getCurrentQuestion(state);
  if (!question) {
    return "storeBasicResponse";
  }

  if (isBasicQuestion(question)) {
    return "storeBasicResponse";
  }
  return "analyzeResponse";
};

/**
 * Routes after parallel analysis - either respond to concerns or check proper response result.
 */
const routeAfterAnalysis = (
  state: InterviewState
): "respondToConcerns" | "generateEmpathyForFollowup" | "generateEmpathyForStore" => {
  // First check if there are concerns
  if (state.categories?.hasConcerns) {
    return "respondToConcerns";
  }
  // Then route based on proper response check
  if (state.categories?.isProperResponse || !canAskFollowup(state)) {
    return "generateEmpathyForStore";
  }
  return "generateEmpathyForFollowup";
};

/**
 * Routes after respondToConcerns - store and move on.
 */
const routeAfterConcernResponse = (
  _state: InterviewState
): "storeAssessmentResponse" => {
  // After responding to concerns, store the response and move on
  return "storeAssessmentResponse";
};


/**
 * Routes after storing - either ask next question or complete.
 */
const routeAfterStore = (
  state: InterviewState
): "askQuestion" | "complete" => {
  if (hasMoreQuestions(state)) {
    return "askQuestion";
  }
  return "complete";
};

// =============================================================================
// GRAPH DEFINITION
// =============================================================================

const builder = new StateGraph(InterviewStateAnnotation)
  // ─────────────────────────────────────────────────────────────────────────
  // Add all nodes
  // ─────────────────────────────────────────────────────────────────────────
  .addNode("initialize", initialize)
  .addNode("askQuestion", askQuestion)
  .addNode("translateIfNeeded", translateIfNeeded)
  .addNode("validateFormat", validateFormat)
  .addNode("reprompt", reprompt)
  .addNode("storeBasicResponse", storeBasicResponse)
  .addNode("analyzeResponse", analyzeResponseParallel)
  .addNode("respondToConcerns", respondToConcerns)
  .addNode("storeAssessmentResponse", storeAssessmentResponse)
  .addNode("generateEmpathyForFollowup", generateEmpathy)
  .addNode("generateEmpathyForStore", generateEmpathy)
  .addNode("generateFollowup", generateFollowup)
  .addNode("complete", complete)
  // Routing helper node (passthrough)
  .addNode("routeByQuestionType", async (_state: InterviewState) => ({}))
  
  // ─────────────────────────────────────────────────────────────────────────
  // Entry point - routes based on state
  // ─────────────────────────────────────────────────────────────────────────
  .addConditionalEdges(START, routeEntry, [
    "initialize",
    "translateIfNeeded",
  ])
  
  // ─────────────────────────────────────────────────────────────────────────
  // Initialization flow
  // ─────────────────────────────────────────────────────────────────────────
  .addEdge("initialize", "askQuestion")
  
  // ─────────────────────────────────────────────────────────────────────────
  // Ask question → wait for response (END)
  // ─────────────────────────────────────────────────────────────────────────
  .addEdge("askQuestion", END)
  
  // ─────────────────────────────────────────────────────────────────────────
  // Process response flow
  // ─────────────────────────────────────────────────────────────────────────
  
  // Translation → Validation
  .addEdge("translateIfNeeded", "validateFormat")
  
  // Validation routing
  .addConditionalEdges("validateFormat", routeAfterValidate, [
    "reprompt",
    "routeByQuestionType",
  ])
  
  // Reprompt → END (wait for user)
  .addEdge("reprompt", END)
  
  // Route by question type
  .addConditionalEdges("routeByQuestionType", routeByQuestionType, [
    "storeBasicResponse",
    "analyzeResponse",
  ])
  
  // ─────────────────────────────────────────────────────────────────────────
  // Basic question path
  // ─────────────────────────────────────────────────────────────────────────
  .addConditionalEdges("storeBasicResponse", routeAfterStore, [
    "askQuestion",
    "complete",
  ])
  
  // ─────────────────────────────────────────────────────────────────────────
  // Assessment question path (PARALLELIZED)
  // ─────────────────────────────────────────────────────────────────────────
  
  // Parallel analysis → route based on results
  .addConditionalEdges("analyzeResponse", routeAfterAnalysis, [
    "respondToConcerns",
    "generateEmpathyForFollowup",
    "generateEmpathyForStore",
  ])
  
  // After responding to concerns → store and move on
  .addConditionalEdges("respondToConcerns", routeAfterConcernResponse, [
    "storeAssessmentResponse",
  ])
  
  // Empathy for followup → generate followup → END (wait for user)
  .addEdge("generateEmpathyForFollowup", "generateFollowup")
  .addEdge("generateFollowup", END)
  
  // Empathy for store → store assessment → route to next or complete
  .addEdge("generateEmpathyForStore", "storeAssessmentResponse")
  .addConditionalEdges("storeAssessmentResponse", routeAfterStore, [
    "askQuestion",
    "complete",
  ])
  
  // ─────────────────────────────────────────────────────────────────────────
  // Complete → END
  // ─────────────────────────────────────────────────────────────────────────
  .addEdge("complete", END);

// =============================================================================
// COMPILE GRAPH
// =============================================================================

export const graph = builder.compile();

graph.name = "Interview Orchestration";

// =============================================================================
// EXPORTS
// =============================================================================

export { InterviewStateAnnotation } from "./state.js";

export type {
  InterviewState,
  InterviewConfig,
  Question,
  QuestionType,
  InterviewType,
  TranscriptOutput,
} from "./state.js";
