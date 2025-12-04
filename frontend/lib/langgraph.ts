import { Client } from "@langchain/langgraph-sdk";
import type { InterviewConfig, Question } from "./types";

// =============================================================================
// CLIENT SETUP
// =============================================================================

const LANGGRAPH_URL =
  process.env.NEXT_PUBLIC_LANGGRAPH_URL || "http://localhost:2024";

export const client = new Client({ apiUrl: LANGGRAPH_URL });

// =============================================================================
// GRAPH STATE INTERFACE
// =============================================================================

interface GraphState {
  messages: Array<{
    type?: string;
    content: string;
    _getType?: () => string;
  }>;
  interviewType: string;
  questions: Question[];
  currentQuestionIndex: number;
  currentFollowupCount: number;
  isComplete: boolean;
  transcript?: unknown;
  responses?: unknown[];
}

// =============================================================================
// START INTERVIEW
// =============================================================================

export async function startInterview(config: InterviewConfig): Promise<{
  threadId: string;
  state: GraphState;
}> {
  // Create a new thread
  const thread = await client.threads.create();

  // Run the graph with initial input
  const result = await client.runs.wait(thread.thread_id, "agent", {
    input: {
      interviewType: config.interview_type,
      questions: config.questions,
      llmFallback: config.llm_fallback ?? false,
      messages: [],
    },
  });

  return {
    threadId: thread.thread_id,
    state: result as GraphState,
  };
}

// =============================================================================
// SEND MESSAGE (NON-STREAMING)
// =============================================================================

export async function sendMessage(
  threadId: string,
  message: string
): Promise<GraphState> {
  const result = await client.runs.wait(threadId, "agent", {
    input: {
      messages: [{ role: "user", content: message }],
    },
  });

  return result as GraphState;
}

// =============================================================================
// SEND MESSAGE (STREAMING)
// =============================================================================

export async function* streamMessage(
  threadId: string,
  message: string
): AsyncGenerator<{
  type: "state" | "message" | "done" | "error";
  data?: GraphState | string;
}> {
  try {
    const stream = client.runs.stream(threadId, "agent", {
      input: {
        messages: [{ role: "user", content: message }],
      },
      streamMode: "updates",
    });

    for await (const event of stream) {
      if (event.event === "updates") {
        // Yield state updates
        yield { type: "state", data: event.data as GraphState };
      } else if (event.event === "messages/partial") {
        // Yield partial message content for real-time display
        const content = event.data?.[0]?.content;
        if (content) {
          yield { type: "message", data: content as string };
        }
      } else if (event.event === "end") {
        yield { type: "done" };
      }
    }
  } catch (error) {
    yield {
      type: "error",
      data: error instanceof Error ? error.message : "Stream error",
    };
  }
}

// =============================================================================
// GET THREAD STATE
// =============================================================================

export async function getThreadState(threadId: string): Promise<GraphState> {
  const state = await client.threads.getState(threadId);
  return state.values as GraphState;
}

// =============================================================================
// HELPERS
// =============================================================================

export function extractMessages(
  state: GraphState
): Array<{ role: "assistant" | "user"; content: string }> {
  if (!state.messages) return [];

  return state.messages.map((msg) => {
    // Determine role
    let role: "assistant" | "user" = "assistant";

    if (typeof msg._getType === "function") {
      role = msg._getType() === "human" ? "user" : "assistant";
    } else if (msg.type === "human") {
      role = "user";
    }

    return {
      role,
      content: typeof msg.content === "string" ? msg.content : "",
    };
  });
}

