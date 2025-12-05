/**
 * Check Relevance Node
 *
 * Uses LLM to verify that the user's response is relevant to the question asked.
 * This runs for ALL question types (basic and assessment) to catch off-topic responses.
 */

import { ChatAnthropic } from "@langchain/anthropic";
import {
  InterviewState,
  InterviewStateUpdate,
  getCurrentQuestion,
} from "../state.js";
import { getCheckRelevancePrompt } from "../prompts/templates.js";

// =============================================================================
// TYPES
// =============================================================================

interface RelevanceResult {
  isRelevant: boolean;
  reason: string;
}

// =============================================================================
// CHECK RELEVANCE NODE
// =============================================================================

export async function checkRelevance(
  state: InterviewState
): Promise<InterviewStateUpdate> {
  const question = getCurrentQuestion(state);
  const response = state.translatedResponse || state.rawResponse || "";

  if (!question || !response.trim()) {
    return {};
  }

  // In fallback mode, skip LLM check - assume relevant
  if (state.llmFallback) {
    return {};
  }

  try {
    const model = new ChatAnthropic({
      model: "claude-3-5-haiku-latest",
      temperature: 0,
    });

    const prompt = getCheckRelevancePrompt(
      question.text,
      question.type,
      response,
      question.options
    );

    const result = await model.invoke(prompt);
    const content = typeof result.content === "string" ? result.content : "";

    // Parse the JSON response
    let parsed: RelevanceResult;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch {
      // Fallback: check for keywords indicating irrelevance
      const isIrrelevant =
        content.toLowerCase().includes('"isrelevant": false') ||
        content.toLowerCase().includes('"isrelevant":false') ||
        content.toLowerCase().includes("not relevant") ||
        content.toLowerCase().includes("off-topic") ||
        content.toLowerCase().includes("doesn't answer");

      parsed = {
        isRelevant: !isIrrelevant,
        reason: isIrrelevant
          ? "The response doesn't seem to address the question."
          : "",
      };
    }

    // If not relevant, set up for reprompt
    if (!parsed.isRelevant) {
      return {
        needsReprompt: true,
        repromptReason: parsed.reason || "Please provide a response that addresses the question.",
      };
    }

    return {};
  } catch (error) {
    console.error("Relevance check failed:", error);
    // On error, assume relevant and continue
    return {};
  }
}
