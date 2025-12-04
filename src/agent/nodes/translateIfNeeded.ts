import { RunnableConfig } from "@langchain/core/runnables";
import { ChatAnthropic } from "@langchain/anthropic";
import { InterviewState, InterviewStateUpdate } from "../state.js";
import { getTranslatePrompt } from "../prompts/templates.js";

/**
 * Extract the last user message from the conversation.
 * Handles both BaseMessage objects and plain message objects.
 */
const getLastUserMessage = (state: InterviewState): string | null => {
  const messages = state.messages;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    
    // Check message type - handle both BaseMessage and plain objects
    let isHuman = false;
    
    // Try _getType() method first (BaseMessage)
    if (typeof msg._getType === "function") {
      isHuman = msg._getType() === "human";
    } 
    // Check for HumanMessage class name
    else if (msg.constructor?.name === "HumanMessage") {
      isHuman = true;
    }
    // Check for role property (plain object)
    else if ("role" in msg && (msg as { role: string }).role === "human") {
      isHuman = true;
    }
    // Check for type property
    else if ("type" in msg && (msg as { type: string }).type === "human") {
      isHuman = true;
    }
    
    if (isHuman) {
      // Extract content
      if (typeof msg.content === "string") {
        return msg.content;
      }
      if (Array.isArray(msg.content)) {
        // Handle content arrays (e.g., multimodal messages)
        const textPart = msg.content.find(
          (part: unknown) => typeof part === "string" || (part && typeof part === "object" && "text" in part)
        );
        if (typeof textPart === "string") return textPart;
        if (textPart && "text" in textPart) return (textPart as { text: string }).text;
      }
    }
  }
  return null;
};

/**
 * Translate the user's response if it's not in English.
 * 
 * This node:
 * 1. Extracts the last user message
 * 2. Detects if it's non-English
 * 3. Translates to English if needed
 * 4. Stores both raw and translated versions
 */
export const translateIfNeeded = async (
  state: InterviewState,
  _config: RunnableConfig
): Promise<InterviewStateUpdate> => {
  const rawResponse = getLastUserMessage(state);

  if (!rawResponse) {
    return {
      rawResponse: null,
      translatedResponse: null,
      wasTranslated: false,
    };
  }

  // If in fallback mode, skip translation
  if (state.llmFallback) {
    return {
      rawResponse: rawResponse,
      translatedResponse: rawResponse,
      wasTranslated: false,
    };
  }

  try {
    const model = new ChatAnthropic({
      model: "claude-3-5-haiku-latest",
      temperature: 0,
    });

    const prompt = getTranslatePrompt(rawResponse);
    const response = await model.invoke(prompt);
    const translatedText = (response.content as string).trim();

    // Check if translation occurred by comparing
    // (simple heuristic - if they're very different, translation happened)
    const wasTranslated = translatedText.toLowerCase() !== rawResponse.toLowerCase();

    return {
      rawResponse: rawResponse,
      translatedResponse: translatedText,
      wasTranslated: wasTranslated,
    };
  } catch (error) {
    // On error, just use the raw response
    console.warn("Translation failed, using raw response:", error);
    return {
      rawResponse: rawResponse,
      translatedResponse: rawResponse,
      wasTranslated: false,
    };
  }
};

