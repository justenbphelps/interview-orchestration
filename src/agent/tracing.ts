/**
 * LangSmith Tracing Configuration
 * 
 * This module provides utilities for enhanced tracing with LangSmith.
 * Tracing is automatically enabled when these environment variables are set:
 * - LANGSMITH_TRACING=true
 * - LANGSMITH_API_KEY=your-api-key
 * - LANGSMITH_PROJECT=interview-orchestration
 */

import { RunnableConfig } from "@langchain/core/runnables";

// =============================================================================
// TRACING CONFIGURATION
// =============================================================================

/**
 * Check if LangSmith tracing is enabled.
 */
export function isTracingEnabled(): boolean {
  return process.env.LANGSMITH_TRACING === "true" && !!process.env.LANGSMITH_API_KEY;
}

/**
 * Get the LangSmith project name.
 */
export function getProjectName(): string {
  return process.env.LANGSMITH_PROJECT || "interview-orchestration";
}

/**
 * Create a run configuration with tracing metadata.
 */
export function createTracingConfig(options: {
  runName?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  interviewType?: string;
  questionIndex?: number;
  threadId?: string;
}): Partial<RunnableConfig> {
  const { runName, tags = [], metadata = {}, interviewType, questionIndex, threadId } = options;

  // Build comprehensive metadata
  const enrichedMetadata: Record<string, unknown> = {
    ...metadata,
    timestamp: new Date().toISOString(),
    project: getProjectName(),
  };

  if (interviewType) enrichedMetadata.interviewType = interviewType;
  if (questionIndex !== undefined) enrichedMetadata.questionIndex = questionIndex;
  if (threadId) enrichedMetadata.threadId = threadId;

  // Build tags
  const enrichedTags = [
    "interview-orchestration",
    ...tags,
  ];
  
  if (interviewType) enrichedTags.push(`type:${interviewType}`);

  return {
    runName,
    tags: enrichedTags,
    metadata: enrichedMetadata,
  };
}

/**
 * Node-specific tracing tags.
 */
export const NODE_TAGS: Record<string, string[]> = {
  initialize: ["initialization", "welcome"],
  askQuestion: ["question-delivery"],
  translateIfNeeded: ["translation", "preprocessing"],
  validateFormat: ["validation", "input-processing"],
  reprompt: ["validation", "error-handling"],
  storeBasicResponse: ["storage", "basic-question"],
  analyzeResponse: ["analysis", "llm-intensive"],
  respondToConcerns: ["concern-handling", "compliance"],
  storeAssessmentResponse: ["storage", "assessment-question"],
  generateEmpathyForFollowup: ["empathy", "llm-generation"],
  generateEmpathyForStore: ["empathy", "llm-generation"],
  generateFollowup: ["followup", "llm-generation"],
  complete: ["completion", "finalization"],
};

/**
 * Get tags for a specific node.
 */
export function getNodeTags(nodeName: string): string[] {
  return NODE_TAGS[nodeName] || [];
}

// =============================================================================
// TRACE METADATA HELPERS
// =============================================================================

/**
 * Create metadata for an LLM call.
 */
export function createLLMMetadata(options: {
  purpose: string;
  model?: string;
  questionType?: string;
  inputLength?: number;
}): Record<string, unknown> {
  return {
    type: "llm_call",
    purpose: options.purpose,
    model: options.model || "claude-3-5-haiku-latest",
    questionType: options.questionType,
    inputLength: options.inputLength,
  };
}

/**
 * Create metadata for a tool call.
 */
export function createToolMetadata(options: {
  tool: string;
  input: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    type: "tool_call",
    tool: options.tool,
    inputKeys: Object.keys(options.input),
  };
}

/**
 * Create metadata for a state transition.
 */
export function createTransitionMetadata(options: {
  from: string;
  to: string;
  condition?: string;
}): Record<string, unknown> {
  return {
    type: "state_transition",
    from: options.from,
    to: options.to,
    condition: options.condition,
  };
}

// =============================================================================
// LOGGING HELPERS (for when tracing is not enabled)
// =============================================================================

/**
 * Log a trace event (useful for debugging without LangSmith).
 */
export function logTrace(
  level: "info" | "debug" | "warn" | "error",
  message: string,
  metadata?: Record<string, unknown>
): void {
  if (process.env.NODE_ENV === "development" || process.env.DEBUG) {
    const timestamp = new Date().toISOString();
    const prefix = `[TRACE ${timestamp}]`;
    
    switch (level) {
      case "error":
        console.error(prefix, message, metadata);
        break;
      case "warn":
        console.warn(prefix, message, metadata);
        break;
      case "debug":
        console.debug(prefix, message, metadata);
        break;
      default:
        console.log(prefix, message, metadata);
    }
  }
}

