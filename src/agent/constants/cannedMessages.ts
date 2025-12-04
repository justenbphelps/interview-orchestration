import { QuestionType, ConcernType, InterviewType } from "../state.js";

// =============================================================================
// BASIC QUESTION ACKNOWLEDGEMENTS
// =============================================================================

/**
 * Canned acknowledgements for basic questions (max_followups = 0).
 * These are used when LLM is not needed for response.
 */
export const BASIC_ACKNOWLEDGEMENTS: Record<QuestionType, string[]> = {
  phone_number: [
    "Thanks for that!",
    "Got it, thank you!",
    "Perfect, thanks!",
  ],
  yes_no: [
    "Got it.",
    "Understood.",
    "Noted, thanks.",
  ],
  single_select: [
    "Thanks for that.",
    "Noted, thank you.",
    "Got it.",
  ],
  short_answer: [
    "Thanks!",
    "Got it, thanks!",
    "Thank you.",
  ],
  long_answer: [
    "Thank you for sharing that.",
    "I appreciate you sharing that.",
    "Thanks for the detail.",
  ],
  number_scale: [
    "Got it, thanks.",
    "Noted.",
    "Thank you.",
  ],
};

/**
 * Gets a random acknowledgement for a question type.
 */
export const getBasicAcknowledgement = (questionType: QuestionType): string => {
  const acks = BASIC_ACKNOWLEDGEMENTS[questionType] || BASIC_ACKNOWLEDGEMENTS.short_answer;
  return acks[Math.floor(Math.random() * acks.length)];
};

// =============================================================================
// CONCERN RESPONSES
// =============================================================================

/**
 * Canned responses for different types of concerns.
 */
export const CONCERN_RESPONSES: Record<ConcernType, string> = {
  eeoc: `Thank you for sharing that with me. What you've described sounds important, and I want you to know that concerns like this are taken seriously. If you'd like to formally report this, you can contact HR directly or use the company's anonymous reporting system. For now, I'll make a note of this, and we can continue when you're ready.`,

  outside_scope: `I appreciate you sharing that. Let me bring us back to the interview questions so we can make sure to cover everything. We can continue with the next question.`,

  incident: `I'm sorry to hear that. What you've described sounds serious and should be properly documented. If you'd like to report this, please contact HR or use the company's safety and incident reporting system. Your wellbeing is important, and these matters are handled confidentially. Let's continue when you're ready.`,
};

/**
 * Gets the response for a specific concern type.
 */
export const getConcernResponse = (concernType: ConcernType): string => {
  return CONCERN_RESPONSES[concernType] || CONCERN_RESPONSES.outside_scope;
};

// =============================================================================
// REPROMPT MESSAGES
// =============================================================================

/**
 * Canned reprompt messages for invalid responses.
 * Used when LLM fallback mode is enabled.
 */
export const REPROMPT_MESSAGES: Record<QuestionType, string> = {
  number_scale: "I need a number between 1 and 10. What would you say?",
  yes_no: "Could you answer with yes or no?",
  single_select: "Please choose one of the options I mentioned.",
  phone_number: "I need a valid phone number. Could you provide that?",
  short_answer: "Could you provide an answer to that question?",
  long_answer: "Could you share a bit more on that?",
};

/**
 * Gets the reprompt message for a question type.
 */
export const getRepromptMessage = (
  questionType: QuestionType,
  options?: string[]
): string => {
  if (questionType === "single_select" && options) {
    return `Please choose one of these options: ${options.join(", ")}`;
  }
  return REPROMPT_MESSAGES[questionType] || REPROMPT_MESSAGES.short_answer;
};

// =============================================================================
// WELCOME MESSAGES (FALLBACK)
// =============================================================================

/**
 * Fallback welcome messages when LLM is not available.
 */
export const WELCOME_MESSAGES: Record<InterviewType, string> = {
  screener: "Hi! Thanks for taking the time to speak with me today. I'll be asking you some questions to learn more about your background and qualifications. Let's get started!",
  
  exit: "Thank you for meeting with me today. I'd like to ask you some questions about your experience here. Your feedback is valuable and will help us improve. Let's begin.",
};

/**
 * Gets the fallback welcome message.
 */
export const getWelcomeMessage = (interviewType: InterviewType): string => {
  return WELCOME_MESSAGES[interviewType];
};

// =============================================================================
// CLOSING MESSAGES (FALLBACK)
// =============================================================================

/**
 * Fallback closing messages when LLM is not available.
 */
export const CLOSING_MESSAGES: Record<InterviewType, string> = {
  screener: "Thank you for completing this interview! We appreciate your time and will be in touch about next steps.",
  
  exit: "Thank you for your time and for sharing your feedback. Your insights are valuable and will help us improve. We wish you all the best in your future endeavors!",
};

/**
 * Gets the fallback closing message.
 */
export const getClosingMessage = (interviewType: InterviewType): string => {
  return CLOSING_MESSAGES[interviewType];
};

// =============================================================================
// QUESTION FORMATTING (FALLBACK)
// =============================================================================

/**
 * Formats a question for display when LLM is not available.
 */
export const formatQuestionVerbatim = (
  questionText: string,
  questionType: QuestionType,
  options?: string[]
): string => {
  switch (questionType) {
    case "number_scale":
      return `${questionText} (Please answer on a scale of 1 to 10)`;
    
    case "single_select":
      if (options && options.length > 0) {
        return `${questionText}\n\nOptions:\n${options.map((opt, i) => `${i + 1}. ${opt}`).join("\n")}`;
      }
      return questionText;
    
    case "yes_no":
      return `${questionText} (Yes or No)`;
    
    default:
      return questionText;
  }
};

// =============================================================================
// SKIP ACKNOWLEDGEMENT
// =============================================================================

export const SKIP_ACKNOWLEDGEMENT = "No problem, we'll skip that one and move on.";

// =============================================================================
// SIMPLE EMPATHY (FALLBACK)
// =============================================================================

export const SIMPLE_EMPATHY = "Thank you for sharing that.";

