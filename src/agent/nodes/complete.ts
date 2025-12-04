import { RunnableConfig } from "@langchain/core/runnables";
import { ChatAnthropic } from "@langchain/anthropic";
import {
  InterviewState,
  InterviewStateUpdate,
  TranscriptOutput,
  TranscriptMessage,
} from "../state.js";
import { getClosingPrompt } from "../prompts/templates.js";
import { getClosingMessage } from "../constants/cannedMessages.js";

/**
 * Complete the interview and build the final transcript.
 * 
 * This node:
 * 1. Generates a closing message
 * 2. Builds the final transcript output
 * 3. Sets isComplete = true
 */
export const complete = async (
  state: InterviewState,
  _config: RunnableConfig
): Promise<InterviewStateUpdate> => {
  let closingMessage: string;

  if (state.llmFallback) {
    // Use canned closing message
    closingMessage = getClosingMessage(state.interviewType);
  } else {
    // Use LLM to generate closing
    try {
      const model = new ChatAnthropic({
        model: "claude-3-5-haiku-latest",
        temperature: 0.7,
      });

      const prompt = getClosingPrompt(state.interviewType);
      const response = await model.invoke(prompt);
      closingMessage = (response.content as string).trim();
    } catch (error) {
      console.warn("Closing generation failed:", error);
      closingMessage = getClosingMessage(state.interviewType);
    }
  }

  // Build the full transcript from messages
  const fullTranscript: TranscriptMessage[] = state.messages.map((msg) => ({
    role: msg._getType() === "human" ? "user" : "assistant",
    content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
    timestamp: new Date().toISOString(), // Ideally we'd track this per message
  }));

  // Add the closing message to transcript
  fullTranscript.push({
    role: "assistant",
    content: closingMessage,
    timestamp: new Date().toISOString(),
  });

  // Count concerns
  const concernsDetected = state.responses.filter((r) => r.hadConcerns).length;

  // Build final transcript output
  const transcript: TranscriptOutput = {
    interviewType: state.interviewType,
    startedAt: state.startedAt || new Date().toISOString(),
    completedAt: new Date().toISOString(),
    questionCount: state.questions.length,
    questionsAnswered: state.responses.length,
    concernsDetected,
    responses: state.responses,
    fullTranscript,
  };

  return {
    isComplete: true,
    transcript,
    messages: [
      {
        role: "assistant",
        content: closingMessage,
      },
    ],
  };
};

