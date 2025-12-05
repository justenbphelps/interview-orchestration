"use client";

import type { Question, Message } from "@/lib/types";
import { MessageList } from "./MessageList";
import { QuestionInput } from "./inputs/QuestionInput";
import { ProgressBar } from "./ProgressBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface InterviewContainerProps {
  messages: Message[];
  currentQuestion: Question | null;
  currentQuestionIndex: number;
  questionsTotal: number;
  isComplete: boolean;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  onRespond: (response: string) => void;
  interviewType?: "screener" | "exit";
}

export function InterviewContainer({
  messages,
  currentQuestion,
  currentQuestionIndex,
  questionsTotal,
  isComplete,
  isLoading,
  isStreaming,
  error,
  onRespond,
  interviewType = "screener",
}: InterviewContainerProps) {
  const interviewTitle = interviewType === "screener" 
    ? "Screening Interview" 
    : "Exit Interview";
  return (
    <Card 
      className="shadow-2xl border-0 overflow-hidden flex flex-col h-full"
    >
      {/* Header - Fixed */}
      <CardHeader className="border-b bg-white flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            {isComplete ? (
              <>
                <CheckCircle className="h-6 w-6 text-green-500" />
                {interviewTitle} Complete
              </>
            ) : (
              interviewTitle
            )}
          </CardTitle>

          {isStreaming && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Streaming...
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {!isComplete && questionsTotal > 0 && (
          <ProgressBar
            current={currentQuestionIndex}
            total={questionsTotal}
            className="mt-4"
          />
        )}
      </CardHeader>

      <CardContent className="p-0 flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Messages - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0 flex flex-col">
          <div className={cn(
            "flex-1",
            messages.length === 0 && "flex flex-col"
          )}>
            <MessageList messages={messages} />
          </div>

          {/* Loading Indicator */}
          {isLoading && !isStreaming && (
            <div className={cn(
              "flex items-center gap-2 text-muted-foreground animate-fade-in",
              messages.length === 0 ? "justify-center" : "mt-4"
            )}>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Typing...</span>
            </div>
          )}
        </div>

        {/* Input Area - Fixed at bottom */}
        {!isComplete && currentQuestion && (
          <div
            className={cn(
              "border-t p-6 bg-gradient-to-b from-muted/30 to-muted/50 flex-shrink-0",
              isLoading && "opacity-70 pointer-events-none"
            )}
          >
            {/* Question Type Badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                {formatQuestionType(currentQuestion.type)}
              </span>
              {currentQuestion.group && (
                <span className="text-xs text-muted-foreground">
                  {currentQuestion.group}
                </span>
              )}
            </div>

            <QuestionInput
              question={currentQuestion}
              onSubmit={onRespond}
              disabled={isLoading}
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-destructive/10 border-t border-destructive/20 flex items-center gap-2 text-destructive flex-shrink-0">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Complete State */}
        {isComplete && (
          <div className="p-8 text-center flex-shrink-0">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Thank You!</h3>
            <p className="text-muted-foreground">
              Your interview has been completed successfully.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatQuestionType(type: string): string {
  const labels: Record<string, string> = {
    number_scale: "Scale (1-10)",
    single_select: "Multiple Choice",
    yes_no: "Yes / No",
    phone_number: "Phone Number",
    short_answer: "Short Answer",
    long_answer: "Long Answer",
  };
  return labels[type] || type;
}
