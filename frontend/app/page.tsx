"use client";

import { useEffect, useState, useCallback } from "react";
import { useInterview } from "@/hooks/useInterview";
import { InterviewContainer } from "@/components/interview/InterviewContainer";
import { DevSidebar } from "@/components/dev/DevSidebar";
import { TraceSidebar } from "@/components/dev/TraceSidebar";
import type { InterviewConfig } from "@/lib/types";

// =============================================================================
// DEFAULT INTERVIEW CONFIG
// =============================================================================

const DEFAULT_CONFIG: InterviewConfig = {
  interview_type: "screener",
  setup: {
    companyName: "Acme Inc.",
    jobTitle: "Software Engineer",
    interviewerName: "Alex",
  },
  questions: [
    {
      type: "number_scale",
      text: "How would you rate leadership at Acme?",
      max_followups: 1,
      group: "Leadership",
    },
    {
      type: "long_answer",
      text: "Explain your biggest concern with Acme's leadership team.",
      max_followups: 2,
      group: "Leadership",
    },
    {
      type: "short_answer",
      text: "What is your current city of residence?",
      max_followups: 0,
    },
    {
      type: "yes_no",
      text: "Do you currently have a valid CDL?",
      max_followups: 0,
    },
    {
      type: "single_select",
      text: "What is the highest level of education you have completed?",
      options: [
        "Some high school",
        "High school",
        "Bachelor's degree",
        "Advanced degree",
      ],
      max_followups: 0,
    },
    {
      type: "phone_number",
      text: "What is your phone number?",
      max_followups: 0,
    },
  ],
  llm_fallback: false,
};

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function InterviewPage() {
  const interview = useInterview(false); // Streaming disabled until fixed
  const [config, setConfig] = useState<InterviewConfig>(DEFAULT_CONFIG);
  const [hasStarted, setHasStarted] = useState(false);

  // Start interview on mount
  useEffect(() => {
    if (!hasStarted) {
      interview.start(config);
      setHasStarted(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle config change and restart
  const handleRestart = useCallback(() => {
    interview.reset();
    setTimeout(() => {
      interview.start(config);
    }, 100);
  }, [interview, config]);

  // Handle config updates
  const handleConfigChange = useCallback((newConfig: InterviewConfig) => {
    setConfig(newConfig);
  }, []);

  // Handle trigger actions from dev sidebar
  const handleTrigger = useCallback((action: string) => {
    if (action === "skip") {
      // Skip to next question by sending a dummy response
      interview.respond("skip");
    } else if (action === "complete") {
      // This would need backend support
      console.log("Complete interview trigger");
    } else if (action.startsWith("inject:")) {
      // Inject a test response
      const response = action.replace("inject:", "");
      interview.respond(response);
    } else if (action === "invalid_input") {
      interview.respond("asdfghjkl");
    } else if (action === "concern_eeoc") {
      interview.respond("I was discriminated against because of my race and gender");
    } else if (action === "concern_incident") {
      interview.respond("There was a safety violation that injured a coworker");
    }
  }, [interview]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100">
      {/* Background Pattern */}
      <div className="fixed inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))] -z-10" />

      {/* Dev Sidebar (Left) */}
      <DevSidebar
        config={config}
        onConfigChange={handleConfigChange}
        onRestart={handleRestart}
        onTriggerNode={handleTrigger}
        currentQuestion={interview.currentQuestion}
        interviewState={{
          currentQuestionIndex: interview.currentQuestionIndex,
          isComplete: interview.isComplete,
          messagesCount: interview.messages.length,
        }}
      />

      {/* Trace Sidebar (Right) */}
      <TraceSidebar
        events={interview.traceEvents}
        onClear={interview.clearTraceEvents}
        isConnected={!!interview.threadId}
        threadId={interview.threadId}
      />

      {/* Main Content - Always centered */}
      <div className="relative">
        {/* Header */}
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-white font-bold text-sm">U</span>
                </div>
                <span className="font-semibold text-lg">Upwage</span>
              </div>

              {/* Right side */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground hidden sm:block">
                  {config.interview_type === "screener"
                    ? "Screening Interview"
                    : "Exit Interview"}
                </span>
                {config.llm_fallback && (
                  <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                    Fallback Mode
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-2xl mx-auto px-4 flex flex-col" style={{ height: 'calc(100vh - 77px)' }}>
          {/* Top spacing */}
          <div className="py-3 flex-shrink-0" />
          
          {/* Interview - fills remaining space */}
          <div className="flex-1 min-h-0">
            <InterviewContainer
              messages={interview.messages}
              currentQuestion={interview.currentQuestion}
              currentQuestionIndex={interview.currentQuestionIndex}
              questionsTotal={interview.questionsTotal}
              isComplete={interview.isComplete}
              isLoading={interview.isLoading}
              isStreaming={interview.isStreaming}
              error={interview.error}
              onRespond={interview.respond}
            />
          </div>

          {/* Footer */}
          <footer className="py-3 text-center text-sm text-muted-foreground flex-shrink-0">
            <p>Your responses are confidential and secure.</p>
            {interview.isComplete && interview.questionsTotal > 0 && (
              <button
                onClick={handleRestart}
                className="mt-2 text-primary hover:underline"
              >
                Start a new interview
              </button>
            )}
          </footer>
        </div>
      </div>
    </div>
  );
}
