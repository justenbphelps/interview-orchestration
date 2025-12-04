import { NextResponse } from "next/server";

/**
 * API route to fetch traces from LangSmith.
 * 
 * Note: This requires LANGSMITH_API_KEY to be set in the environment.
 * If not set, it returns mock data or empty results.
 */

const LANGSMITH_API_KEY = process.env.LANGSMITH_API_KEY;
const LANGSMITH_ENDPOINT = process.env.LANGSMITH_ENDPOINT || "https://api.smith.langchain.com";
const LANGSMITH_PROJECT = process.env.LANGSMITH_PROJECT || "interview-orchestration";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get("threadId");
  const limit = parseInt(searchParams.get("limit") || "50");

  // Check if LangSmith is configured
  if (!LANGSMITH_API_KEY) {
    return NextResponse.json({
      enabled: false,
      message: "LangSmith not configured. Set LANGSMITH_API_KEY in your environment.",
      traces: [],
    });
  }

  try {
    // Fetch runs from LangSmith
    const response = await fetch(
      `${LANGSMITH_ENDPOINT}/api/v1/runs/query`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": LANGSMITH_API_KEY,
        },
        body: JSON.stringify({
          project_name: LANGSMITH_PROJECT,
          filter: threadId 
            ? `and(eq(metadata_key, "threadId"), eq(metadata_value, "${threadId}"))`
            : undefined,
          limit,
          order_by: ["-start_time"],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("LangSmith API error:", errorText);
      return NextResponse.json({
        enabled: true,
        error: "Failed to fetch traces from LangSmith",
        traces: [],
      });
    }

    const data = await response.json();
    
    // Transform the runs into our trace format
    const traces = (data.runs || []).map((run: LangSmithRun) => ({
      id: run.id,
      name: run.name,
      type: run.run_type,
      status: run.status,
      startTime: run.start_time,
      endTime: run.end_time,
      latency: run.total_cost ? undefined : calculateLatency(run.start_time, run.end_time),
      tokens: {
        input: run.prompt_tokens,
        output: run.completion_tokens,
        total: run.total_tokens,
      },
      cost: run.total_cost,
      error: run.error,
      metadata: run.extra?.metadata,
      tags: run.tags,
      parentId: run.parent_run_id,
      childCount: run.child_run_ids?.length || 0,
      inputs: summarizeInputs(run.inputs),
      outputs: summarizeOutputs(run.outputs),
    }));

    return NextResponse.json({
      enabled: true,
      project: LANGSMITH_PROJECT,
      traces,
      total: data.total || traces.length,
    });
  } catch (error) {
    console.error("Error fetching LangSmith traces:", error);
    return NextResponse.json({
      enabled: true,
      error: error instanceof Error ? error.message : "Unknown error",
      traces: [],
    });
  }
}

// =============================================================================
// TYPES
// =============================================================================

interface LangSmithRun {
  id: string;
  name: string;
  run_type: string;
  status: string;
  start_time: string;
  end_time?: string;
  total_cost?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  error?: string;
  extra?: {
    metadata?: Record<string, unknown>;
  };
  tags?: string[];
  parent_run_id?: string;
  child_run_ids?: string[];
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
}

// =============================================================================
// HELPERS
// =============================================================================

function calculateLatency(startTime: string, endTime?: string): number | undefined {
  if (!endTime) return undefined;
  return new Date(endTime).getTime() - new Date(startTime).getTime();
}

function summarizeInputs(inputs?: Record<string, unknown>): string {
  if (!inputs) return "";
  
  // For LLM calls, show prompt preview
  if (inputs.messages && Array.isArray(inputs.messages)) {
    const lastMessage = inputs.messages[inputs.messages.length - 1];
    const content = typeof lastMessage === "string" 
      ? lastMessage 
      : lastMessage?.content || "";
    return truncate(String(content), 100);
  }
  
  // For other inputs, show keys
  return Object.keys(inputs).join(", ");
}

function summarizeOutputs(outputs?: Record<string, unknown>): string {
  if (!outputs) return "";
  
  // For LLM calls, show response preview
  if (outputs.content) {
    return truncate(String(outputs.content), 100);
  }
  
  if (outputs.generations && Array.isArray(outputs.generations)) {
    const firstGen = outputs.generations[0];
    if (Array.isArray(firstGen) && firstGen[0]?.text) {
      return truncate(firstGen[0].text, 100);
    }
  }
  
  return Object.keys(outputs).join(", ");
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + "...";
}

