/**
 * Parallel Response Analysis Node
 *
 * Runs concern checking and proper response checking in parallel
 * to reduce latency (2 API calls happen at the same time instead of sequentially).
 */

import { ChatAnthropic } from "@langchain/anthropic";
import {
  InterviewState,
  InterviewStateUpdate,
  getCurrentQuestion,
  ConcernType,
} from "../state.js";
import { getCheckConcernsPrompt, getCheckProperResponsePrompt } from "../prompts/templates.js";

// =============================================================================
// TYPES
// =============================================================================

interface ConcernResult {
  hasConcerns: boolean;
  concernType: ConcernType | null;
  concernDetails: string | null;
}

interface ProperResponseResult {
  isProperResponse: boolean;
  needsMoreContext: boolean;
}

// =============================================================================
// PARALLEL ANALYSIS NODE
// =============================================================================

export async function analyzeResponseParallel(
  state: InterviewState
): Promise<InterviewStateUpdate> {
  const question = getCurrentQuestion(state);
  const response = state.translatedResponse || "";

  if (!question) {
    return {
      categories: {
        hasConcerns: false,
        concernType: null,
        concernDetails: null,
        isProperResponse: true,
        needsMoreContext: false,
      },
    };
  }

  // If in fallback mode, skip LLM analysis
  if (state.llmFallback) {
    return {
      categories: {
        hasConcerns: false,
        concernType: null,
        concernDetails: null,
        isProperResponse: true,
        needsMoreContext: false,
      },
    };
  }

  try {
    const model = new ChatAnthropic({
      model: "claude-3-5-haiku-latest",
      temperature: 0,
    });

    // Run both checks in parallel
    const [concernResult, properResponseResult] = await Promise.all([
      checkConcernsAsync(model, question.text, response),
      checkProperResponseAsync(model, question.text, response),
    ]);

    return {
      categories: {
        hasConcerns: concernResult.hasConcerns,
        concernType: concernResult.concernType,
        concernDetails: concernResult.concernDetails,
        isProperResponse: properResponseResult.isProperResponse,
        needsMoreContext: properResponseResult.needsMoreContext,
      },
    };
  } catch (error) {
    console.error("Parallel analysis failed:", error);
    // Default to no concerns, proper response on error
    return {
      categories: {
        hasConcerns: false,
        concernType: null,
        concernDetails: null,
        isProperResponse: true,
        needsMoreContext: false,
      },
    };
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function checkConcernsAsync(
  model: ChatAnthropic,
  questionText: string,
  response: string
): Promise<ConcernResult> {
  try {
    const prompt = getCheckConcernsPrompt(questionText, response);
    const result = await model.invoke(prompt);
    const content = typeof result.content === "string" ? result.content : "";

    // Parse concern response
    const hasConcerns =
      content.toLowerCase().includes("eeoc") ||
      content.toLowerCase().includes("incident") ||
      content.toLowerCase().includes("outside_scope") ||
      content.toLowerCase().includes("yes");

    let concernType: ConcernType | null = null;
    let concernDetails: string | null = null;

    if (hasConcerns) {
      if (content.toLowerCase().includes("eeoc")) {
        concernType = "eeoc";
        concernDetails = "Response contains potential EEOC-related content";
      } else if (content.toLowerCase().includes("incident")) {
        concernType = "incident";
        concernDetails = "Response mentions a reportable incident";
      } else if (content.toLowerCase().includes("outside_scope")) {
        concernType = "outside_scope";
        concernDetails = "Response is outside the scope of the interview";
      }
    }

    return { hasConcerns, concernType, concernDetails };
  } catch (error) {
    console.error("Concern check failed:", error);
    return { hasConcerns: false, concernType: null, concernDetails: null };
  }
}

async function checkProperResponseAsync(
  model: ChatAnthropic,
  questionText: string,
  response: string
): Promise<ProperResponseResult> {
  try {
    const prompt = getCheckProperResponsePrompt(questionText, response);
    const result = await model.invoke(prompt);
    const content = typeof result.content === "string" ? result.content : "";

    const needsMoreContext =
      content.toLowerCase().includes("no") ||
      content.toLowerCase().includes("incomplete") ||
      content.toLowerCase().includes("vague");

    return { isProperResponse: !needsMoreContext, needsMoreContext };
  } catch (error) {
    console.error("Proper response check failed:", error);
    return { isProperResponse: true, needsMoreContext: false };
  }
}

