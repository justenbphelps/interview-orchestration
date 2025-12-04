"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  GitBranch,
  ArrowRight,
  ExternalLink,
  Cloud,
  CloudOff,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

export interface TraceEvent {
  id: string;
  timestamp: Date;
  type: "node_start" | "node_end" | "edge" | "state_update" | "llm_call" | "error";
  nodeName?: string;
  edgeFrom?: string;
  edgeTo?: string;
  data?: Record<string, unknown>;
  duration?: number;
  status?: "success" | "error" | "pending";
}

interface TraceSidebarProps {
  events: TraceEvent[];
  onClear: () => void;
  isConnected: boolean;
  threadId?: string | null;
}

interface LangSmithStatus {
  enabled: boolean;
  project?: string;
  error?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const getEventIcon = (type: TraceEvent["type"], status?: string) => {
  switch (type) {
    case "node_start":
      return <Loader2 className="h-3 w-3 animate-spin text-blue-400" />;
    case "node_end":
      return status === "error" ? (
        <XCircle className="h-3 w-3 text-red-400" />
      ) : (
        <CheckCircle className="h-3 w-3 text-green-400" />
      );
    case "edge":
      return <ArrowRight className="h-3 w-3 text-purple-400" />;
    case "state_update":
      return <Activity className="h-3 w-3 text-yellow-400" />;
    case "llm_call":
      return <Zap className="h-3 w-3 text-orange-400" />;
    case "error":
      return <XCircle className="h-3 w-3 text-red-400" />;
    default:
      return <MessageSquare className="h-3 w-3 text-slate-400" />;
  }
};

const getEventColor = (type: TraceEvent["type"]) => {
  switch (type) {
    case "node_start":
      return "border-l-blue-500";
    case "node_end":
      return "border-l-green-500";
    case "edge":
      return "border-l-purple-500";
    case "state_update":
      return "border-l-yellow-500";
    case "llm_call":
      return "border-l-orange-500";
    case "error":
      return "border-l-red-500";
    default:
      return "border-l-slate-500";
  }
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
};

const formatDuration = (ms: number) => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const getEventTooltip = (type: TraceEvent["type"]): { title: string; description: string } => {
  switch (type) {
    case "node_start":
      return {
        title: "Node Started",
        description: "A graph node has begun execution. It will process data and may call external services.",
      };
    case "node_end":
      return {
        title: "Node Completed",
        description: "A graph node finished execution. The duration shows total processing time including any LLM calls.",
      };
    case "edge":
      return {
        title: "Edge Transition",
        description: "The graph transitioned from one node to another. This shows the flow of execution through the graph.",
      };
    case "state_update":
      return {
        title: "State Update",
        description: "The graph's shared state was modified. This includes changes to question index, completion status, and stored responses.",
      };
    case "llm_call":
      return {
        title: "LLM Inference",
        description: "A call was made to the AI model (Claude). This is estimated based on response time - actual calls happen in backend nodes.",
      };
    case "error":
      return {
        title: "Error Occurred",
        description: "An error occurred during graph execution. Check the expanded data for error details.",
      };
    default:
      return {
        title: "Event",
        description: "A graph event occurred.",
      };
  }
};

// =============================================================================
// COMPONENT
// =============================================================================

export function TraceSidebar({ events, onClear, isConnected, threadId }: TraceSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const [isResizing, setIsResizing] = useState(false);
  const [langsmithStatus, setLangsmithStatus] = useState<LangSmithStatus | null>(null);

  // Check LangSmith status on mount
  useEffect(() => {
    async function checkLangSmith() {
      try {
        const response = await fetch("/api/traces?limit=1");
        const data = await response.json();
        setLangsmithStatus({
          enabled: data.enabled,
          project: data.project,
          error: data.error,
        });
      } catch {
        setLangsmithStatus({ enabled: false });
      }
    }
    checkLangSmith();
  }, []);

  const toggleEventExpanded = (id: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedEvents(newExpanded);
  };

  // Resize handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      setSidebarWidth(Math.min(Math.max(newWidth, 280), 600));
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  };

  return (
    <>
      {/* Edge Toggle Button - Always visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-1/2 -translate-y-1/2 z-[10000] bg-slate-900 text-white p-2 shadow-lg hover:bg-slate-800 transition-all ${
          isOpen 
            ? "rounded-l-lg" 
            : "right-0 rounded-l-lg"
        }`}
        style={isOpen ? { right: `${sidebarWidth}px` } : undefined}
        title={isOpen ? "Close Trace Panel" : "Open Trace Panel"}
      >
        {isOpen ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
      </button>

      {/* Sidebar Panel */}
      {isOpen && (
        <div
          className="fixed right-0 top-0 bottom-0 bg-slate-900 text-slate-100 shadow-2xl z-[9998] flex flex-col"
          style={{ width: `${sidebarWidth}px`, fontSize: "12px" }}
        >
          {/* Resize Handle */}
          <div
            onMouseDown={handleMouseDown}
            className={`absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-purple-500 transition-colors ${
              isResizing ? "bg-purple-500" : "bg-transparent hover:bg-purple-500/50"
            }`}
          />

          {/* Header */}
          <div className="p-3 border-b border-slate-700 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-green-400" />
                <span className="font-semibold text-sm">Graph Trace</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-green-500" : "bg-red-500"
                  }`}
                  title={isConnected ? "Connected" : "Disconnected"}
                />
              </div>
              <button
                onClick={onClear}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
                title="Clear trace"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            
            {/* LangSmith Status */}
            <div className="mt-2 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                {langsmithStatus?.enabled ? (
                  <>
                    <Cloud className="h-3 w-3 text-green-400" />
                    <span className="text-green-400">LangSmith</span>
                  </>
                ) : (
                  <>
                    <CloudOff className="h-3 w-3 text-slate-500" />
                    <span className="text-slate-500">LangSmith Off</span>
                  </>
                )}
              </div>
              {langsmithStatus?.enabled && langsmithStatus.project && (
                <a
                  href={`https://smith.langchain.com/o/default/projects/p/${langsmithStatus.project}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
                  title="Open in LangSmith"
                >
                  <span>View Traces</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

      {/* Stats Bar */}
      <div className="px-3 py-2 bg-slate-800/50 border-b border-slate-700 flex items-center gap-4 text-xs flex-shrink-0">
        <div className="flex items-center gap-1">
          <Activity className="h-3 w-3 text-slate-400" />
          <span className="text-slate-400">Events:</span>
          <span className="text-slate-200">{events.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <Zap className="h-3 w-3 text-orange-400" />
          <span className="text-slate-400">LLM:</span>
          <span className="text-slate-200">
            {events.filter((e) => e.type === "llm_call").length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <XCircle className="h-3 w-3 text-red-400" />
          <span className="text-slate-400">Errors:</span>
          <span className="text-slate-200">
            {events.filter((e) => e.type === "error").length}
          </span>
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <div className="p-4 text-center text-slate-500">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No trace events yet</p>
            <p className="text-xs mt-1">Events will appear as the graph executes</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {events.map((event) => (
              <div
                key={event.id}
                className={`bg-slate-800 rounded border-l-2 ${getEventColor(event.type)} overflow-hidden`}
              >
                {/* Event Header */}
                <button
                  onClick={() => toggleEventExpanded(event.id)}
                  className="w-full p-2 flex items-center gap-2 hover:bg-slate-700/50 transition-colors text-left group"
                >
                  <div 
                    className="relative"
                    title={`${getEventTooltip(event.type).title}: ${getEventTooltip(event.type).description}`}
                  >
                    {getEventIcon(event.type, event.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs truncate">
                        {event.type === "edge"
                          ? `${event.edgeFrom} → ${event.edgeTo}`
                          : event.nodeName || event.type}
                      </span>
                      {event.duration !== undefined && (
                        <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {formatDuration(event.duration)}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {formatTime(event.timestamp)}
                    </div>
                  </div>
                  {event.data && Object.keys(event.data).length > 0 && (
                    expandedEvents.has(event.id) ? (
                      <ChevronUp className="h-3 w-3 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-slate-500" />
                    )
                  )}
                </button>

                {/* Expanded Data */}
                {expandedEvents.has(event.id) && event.data && (
                  <div className="px-2 pb-2 border-t border-slate-700">
                    <pre className="text-[10px] text-slate-400 overflow-x-auto p-2 bg-slate-900 rounded mt-2 max-h-40 overflow-y-auto">
                      {JSON.stringify(event.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="p-2 border-t border-slate-700 flex-shrink-0">
        <div className="flex flex-wrap gap-2 text-[10px]">
          <span 
            className="flex items-center gap-1 cursor-help"
            title="Node Completed: A graph node finished execution with duration shown"
          >
            <span className="w-2 h-2 rounded-full bg-green-500" /> Node
          </span>
          <span 
            className="flex items-center gap-1 cursor-help"
            title="Edge Transition: Shows flow between graph nodes"
          >
            <span className="w-2 h-2 rounded-full bg-purple-500" /> Edge
          </span>
          <span 
            className="flex items-center gap-1 cursor-help"
            title="LLM Inference: Estimated AI model call (Claude) based on response time"
          >
            <span className="w-2 h-2 rounded-full bg-orange-500" /> LLM
          </span>
          <span 
            className="flex items-center gap-1 cursor-help"
            title="State Update: Graph's shared state was modified (question index, completion, etc.)"
          >
            <span className="w-2 h-2 rounded-full bg-yellow-500" /> State
          </span>
          <span 
            className="flex items-center gap-1 cursor-help"
            title="Error: Something went wrong during execution"
          >
            <span className="w-2 h-2 rounded-full bg-red-500" /> Error
          </span>
        </div>
      </div>
        </div>
      )}
    </>
  );
}

