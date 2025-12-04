// =============================================================================
// INTERVIEW TYPES
// =============================================================================

export type InterviewType = "screener" | "exit";

export type QuestionType =
  | "number_scale"
  | "long_answer"
  | "short_answer"
  | "yes_no"
  | "single_select"
  | "phone_number";

export interface Question {
  type: QuestionType;
  text: string;
  max_followups: number;
  group?: string;
  options?: string[];
}

export interface InterviewSetup {
  companyName: string;
  jobTitle: string;
  interviewerName?: string;
  candidateName?: string;
}

export interface InterviewConfig {
  interview_type: InterviewType;
  questions: Question[];
  llm_fallback?: boolean;
  setup?: InterviewSetup;
}

// =============================================================================
// MESSAGE TYPES
// =============================================================================

export interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: Date;
}

// =============================================================================
// STATE TYPES
// =============================================================================

export interface InterviewState {
  threadId: string | null;
  messages: Message[];
  currentQuestion: Question | null;
  currentQuestionIndex: number;
  questionsTotal: number;
  isComplete: boolean;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface QuestionResponse {
  questionIndex: number;
  questionText: string;
  questionType: QuestionType;
  group?: string;
  rawAnswer: string;
  translatedAnswer?: string;
  wasTranslated: boolean;
  wasSkipped: boolean;
  hadConcerns: boolean;
  followups: { question: string; answer: string }[];
}

export interface TranscriptOutput {
  interviewType: InterviewType;
  startedAt: string;
  completedAt: string;
  questionCount: number;
  questionsAnswered: number;
  concernsDetected: number;
  responses: QuestionResponse[];
  fullTranscript: { role: string; content: string; timestamp: string }[];
}

