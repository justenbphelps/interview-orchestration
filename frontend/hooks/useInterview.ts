"use client";

import { useState, useCallback, useRef } from "react";
import {
  startInterview,
  sendMessage,
  streamMessage,
  extractMessages,
} from "@/lib/langgraph";
import type {
  InterviewConfig,
  InterviewState,
  Message,
  Question,
} from "@/lib/types";
import { generateId } from "@/lib/utils";
import type { TraceEvent } from "@/components/dev/TraceSidebar";

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: InterviewState = {
  threadId: null,
  messages: [],
  currentQuestion: null,
  currentQuestionIndex: 0,
  questionsTotal: 0,
  isComplete: false,
  isLoading: false,
  isStreaming: false,
  error: null,
};

// =============================================================================
// HOOK
// =============================================================================

export function useInterview(useStreaming = true) {
  const [state, setState] = useState<InterviewState>(initialState);
  const [traceEvents, setTraceEvents] = useState<TraceEvent[]>([]);
  const questionsRef = useRef<Question[]>([]);
  const nodeStartTimes = useRef<Map<string, number>>(new Map());

  // ---------------------------------------------------------------------------
  // Trace Event Helpers
  // ---------------------------------------------------------------------------
  const addTraceEvent = useCallback((event: Omit<TraceEvent, "id" | "timestamp">) => {
    setTraceEvents((prev) => [
      ...prev,
      {
        ...event,
        id: generateId(),
        timestamp: new Date(),
      },
    ]);
  }, []);

  const clearTraceEvents = useCallback(() => {
    setTraceEvents([]);
    nodeStartTimes.current.clear();
  }, []);

  // ---------------------------------------------------------------------------
  // Start Interview
  // ---------------------------------------------------------------------------
  const start = useCallback(async (config: InterviewConfig) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    questionsRef.current = config.questions;

    const startTime = Date.now();

    try {
      const { threadId, state: graphState } = await startInterview(config);
      const extractedMessages = extractMessages(graphState);

      const initDuration = Date.now() - startTime;
      
      // Track LLM calls for initialize (welcome message + first question formatting)
      if (initDuration > 500) {
        addTraceEvent({
          type: "llm_call",
          nodeName: "LLM Inference",
          duration: initDuration,
          data: { 
            purpose: "Generate welcome message",
            model: "claude-3-5-haiku-latest",
          },
        });
      }

      addTraceEvent({
        type: "node_end",
        nodeName: "initialize",
        status: "success",
        duration: initDuration,
        data: { 
          interview_type: config.interview_type, 
          questions_count: config.questions.length,
          threadId, 
          currentQuestionIndex: graphState.currentQuestionIndex 
        },
      });

      addTraceEvent({
        type: "edge",
        edgeFrom: "initialize",
        edgeTo: "askQuestion",
      });

      setState({
        threadId,
        messages: extractedMessages.map((m) => ({
          id: generateId(),
          role: m.role,
          content: m.content,
          timestamp: new Date(),
        })),
        currentQuestion: config.questions[graphState.currentQuestionIndex] || null,
        currentQuestionIndex: graphState.currentQuestionIndex,
        questionsTotal: config.questions.length,
        isComplete: graphState.isComplete,
        isLoading: false,
        isStreaming: false,
        error: null,
      });
    } catch (error) {
      addTraceEvent({
        type: "node_end",
        nodeName: "initialize",
        status: "error",
        duration: Date.now() - startTime,
        data: { error: error instanceof Error ? error.message : "Unknown error" },
      });

      setState((s) => ({
        ...s,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to start interview",
      }));
    }
  }, [addTraceEvent]);

  // ---------------------------------------------------------------------------
  // Respond (with streaming support)
  // ---------------------------------------------------------------------------
  const respond = useCallback(
    async (response: string) => {
      if (!state.threadId) return;

      // Add user message immediately
      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content: response,
        timestamp: new Date(),
      };

      setState((s) => ({
        ...s,
        messages: [...s.messages, userMessage],
        isLoading: true,
        isStreaming: useStreaming,
        error: null,
      }));

      if (useStreaming) {
        // Streaming mode
        let assistantMessageId = generateId();
        let assistantContent = "";
        let hasAddedMessage = false;

        try {
          for await (const event of streamMessage(state.threadId, response)) {
            if (event.type === "message" && typeof event.data === "string") {
              // Accumulate message content
              assistantContent = event.data;

              setState((s) => {
                const newMessages = [...s.messages];
                
                if (!hasAddedMessage) {
                  // Add new assistant message
                  newMessages.push({
                    id: assistantMessageId,
                    role: "assistant",
                    content: assistantContent,
                    timestamp: new Date(),
                  });
                  hasAddedMessage = true;
                } else {
                  // Update existing assistant message
                  const lastIdx = newMessages.length - 1;
                  if (newMessages[lastIdx]?.role === "assistant") {
                    newMessages[lastIdx] = {
                      ...newMessages[lastIdx],
                      content: assistantContent,
                    };
                  }
                }

                return { ...s, messages: newMessages };
              });
            } else if (event.type === "state" && event.data) {
              // Final state update
              const graphState = event.data as {
                currentQuestionIndex: number;
                isComplete: boolean;
                messages: unknown[];
              };

              setState((s) => ({
                ...s,
                currentQuestionIndex: graphState.currentQuestionIndex,
                currentQuestion:
                  questionsRef.current[graphState.currentQuestionIndex] || null,
                isComplete: graphState.isComplete,
              }));
            } else if (event.type === "done") {
              setState((s) => ({ ...s, isLoading: false, isStreaming: false }));
            } else if (event.type === "error") {
              setState((s) => ({
                ...s,
                isLoading: false,
                isStreaming: false,
                error: event.data as string,
              }));
            }
          }
        } catch (error) {
          setState((s) => ({
            ...s,
            isLoading: false,
            isStreaming: false,
            error: error instanceof Error ? error.message : "Streaming failed",
          }));
        }
      } else {
        // Non-streaming mode
        const startTime = Date.now();
        const userInputPreview = response.substring(0, 50) + (response.length > 50 ? "..." : "");

        try {
          const graphState = await sendMessage(state.threadId, response);
          const extractedMessages = extractMessages(graphState);
          const duration = Date.now() - startTime;

          // Estimate LLM calls based on execution time and mode
          // In non-fallback mode, typical nodes that use LLM: translateIfNeeded, analyzeResponse, generateEmpathy, askQuestion
          const estimatedLLMCalls = duration > 500 ? Math.ceil(duration / 1500) : 0;
          
          if (estimatedLLMCalls > 0) {
            addTraceEvent({
              type: "llm_call",
              nodeName: "LLM Inference",
              duration: Math.round(duration / estimatedLLMCalls),
              data: { 
                estimatedCalls: estimatedLLMCalls,
                model: "claude-3-5-haiku-latest",
                note: "Estimated from response time"
              },
            });
          }

          // Add trace events for the graph execution
          addTraceEvent({
            type: "node_end",
            nodeName: "processResponse",
            status: "success",
            duration,
            data: { 
              userInput: userInputPreview,
              nodesExecuted: ["translateIfNeeded", "validateFormat", "analyzeResponse", "generateEmpathy"],
              currentQuestionIndex: graphState.currentQuestionIndex,
              isComplete: graphState.isComplete,
              messagesCount: extractedMessages.length,
              estimatedLLMCalls,
            },
          });

          if (graphState.isComplete) {
            addTraceEvent({
              type: "edge",
              edgeFrom: "storeResponse",
              edgeTo: "complete",
            });
          } else {
            addTraceEvent({
              type: "edge",
              edgeFrom: "storeResponse", 
              edgeTo: "askQuestion",
            });
          }

          addTraceEvent({
            type: "state_update",
            nodeName: "state",
            data: {
              currentQuestionIndex: graphState.currentQuestionIndex,
              isComplete: graphState.isComplete,
            },
          });

          setState((s) => ({
            ...s,
            messages: extractedMessages.map((m) => ({
              id: generateId(),
              role: m.role,
              content: m.content,
              timestamp: new Date(),
            })),
            currentQuestionIndex: graphState.currentQuestionIndex,
            currentQuestion:
              questionsRef.current[graphState.currentQuestionIndex] || null,
            isComplete: graphState.isComplete,
            isLoading: false,
          }));
        } catch (error) {
          addTraceEvent({
            type: "node_end",
            nodeName: "processResponse",
            status: "error",
            duration: Date.now() - startTime,
            data: { 
              userInput: userInputPreview,
              error: error instanceof Error ? error.message : "Unknown error" 
            },
          });

          setState((s) => ({
            ...s,
            isLoading: false,
            error: error instanceof Error ? error.message : "Failed to send response",
          }));
        }
      }
    },
    [state.threadId, useStreaming, addTraceEvent]
  );

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------
  const reset = useCallback(() => {
    setState(initialState);
    questionsRef.current = [];
    clearTraceEvents();
  }, [clearTraceEvents]);

  return {
    ...state,
    traceEvents,
    clearTraceEvents,
    start,
    respond,
    reset,
  };
}

