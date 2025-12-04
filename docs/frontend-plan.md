# Frontend Implementation Plan

## Tech Stack
- **Next.js 14** (App Router)
- **shadcn/ui** (UI components)
- **Tailwind CSS** (styling)
- **@langchain/langgraph-sdk** (API client)

---

## Architecture

```
frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Landing page
│   └── interview/
│       └── [threadId]/
│           └── page.tsx            # Interview session
├── components/
│   ├── ui/                         # shadcn components
│   ├── interview/
│   │   ├── InterviewContainer.tsx  # Main interview wrapper
│   │   ├── MessageList.tsx         # Chat message display
│   │   ├── MessageBubble.tsx       # Individual message
│   │   └── inputs/
│   │       ├── QuestionInput.tsx   # Routes to correct input
│   │       ├── NumberScale.tsx     # 1-10 slider
│   │       ├── SingleSelect.tsx    # Dropdown/radio
│   │       ├── YesNo.tsx           # Yes/No buttons
│   │       ├── PhoneInput.tsx      # Phone number
│   │       ├── ShortAnswer.tsx     # Text input
│   │       └── LongAnswer.tsx      # Textarea
├── lib/
│   ├── langgraph.ts                # LangGraph client
│   └── types.ts                    # Shared types
└── hooks/
    └── useInterview.ts             # Interview state hook
```

---

## Setup Commands

```bash
# Create Next.js app
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir=false

cd frontend

# Install shadcn/ui
npx shadcn@latest init

# Add shadcn components
npx shadcn@latest add button input textarea select radio-group slider card

# Install LangGraph SDK
npm install @langchain/langgraph-sdk
```

---

## Key Components

### 1. LangGraph Client (`lib/langgraph.ts`)

```typescript
import { Client } from "@langchain/langgraph-sdk";

const LANGGRAPH_URL = process.env.NEXT_PUBLIC_LANGGRAPH_URL || "http://localhost:2024";

export const client = new Client({ apiUrl: LANGGRAPH_URL });

export interface InterviewConfig {
  interview_type: "screener" | "exit";
  questions: Question[];
  llm_fallback?: boolean;
}

export interface Question {
  type: "number_scale" | "long_answer" | "short_answer" | "yes_no" | "single_select" | "phone_number";
  text: string;
  max_followups: number;
  group?: string;
  options?: string[];
}

export async function startInterview(config: InterviewConfig) {
  const thread = await client.threads.create();
  
  const result = await client.runs.wait(thread.thread_id, "agent", {
    input: {
      interviewType: config.interview_type,
      questions: config.questions,
      llmFallback: config.llm_fallback ?? false,
      messages: [],
    },
  });
  
  return { threadId: thread.thread_id, state: result };
}

export async function sendMessage(threadId: string, message: string) {
  const result = await client.runs.wait(threadId, "agent", {
    input: {
      messages: [{ role: "user", content: message }],
    },
  });
  
  return result;
}

export async function getThreadState(threadId: string) {
  return client.threads.getState(threadId);
}
```

### 2. Interview Hook (`hooks/useInterview.ts`)

```typescript
"use client";

import { useState, useCallback } from "react";
import { startInterview, sendMessage, InterviewConfig, Question } from "@/lib/langgraph";

interface Message {
  role: "assistant" | "user";
  content: string;
}

interface InterviewState {
  threadId: string | null;
  messages: Message[];
  currentQuestion: Question | null;
  currentQuestionIndex: number;
  isComplete: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useInterview() {
  const [state, setState] = useState<InterviewState>({
    threadId: null,
    messages: [],
    currentQuestion: null,
    currentQuestionIndex: 0,
    isComplete: false,
    isLoading: false,
    error: null,
  });

  const start = useCallback(async (config: InterviewConfig) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    
    try {
      const { threadId, state: graphState } = await startInterview(config);
      
      setState({
        threadId,
        messages: extractMessages(graphState),
        currentQuestion: config.questions[graphState.currentQuestionIndex] || null,
        currentQuestionIndex: graphState.currentQuestionIndex,
        isComplete: graphState.isComplete,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to start interview",
      }));
    }
  }, []);

  const respond = useCallback(async (response: string) => {
    if (!state.threadId) return;
    
    setState((s) => ({ ...s, isLoading: true }));
    
    try {
      const graphState = await sendMessage(state.threadId, response);
      
      setState((s) => ({
        ...s,
        messages: extractMessages(graphState),
        currentQuestion: graphState.questions?.[graphState.currentQuestionIndex] || null,
        currentQuestionIndex: graphState.currentQuestionIndex,
        isComplete: graphState.isComplete,
        isLoading: false,
      }));
    } catch (error) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to send response",
      }));
    }
  }, [state.threadId]);

  return { ...state, start, respond };
}

function extractMessages(graphState: any): Message[] {
  return (graphState.messages || []).map((msg: any) => ({
    role: msg._getType?.() === "human" ? "user" : "assistant",
    content: typeof msg.content === "string" ? msg.content : "",
  }));
}
```

### 3. Question Input Router (`components/interview/inputs/QuestionInput.tsx`)

```tsx
"use client";

import { Question } from "@/lib/langgraph";
import { NumberScale } from "./NumberScale";
import { SingleSelect } from "./SingleSelect";
import { YesNo } from "./YesNo";
import { PhoneInput } from "./PhoneInput";
import { ShortAnswer } from "./ShortAnswer";
import { LongAnswer } from "./LongAnswer";

interface QuestionInputProps {
  question: Question;
  onSubmit: (value: string) => void;
  disabled?: boolean;
}

export function QuestionInput({ question, onSubmit, disabled }: QuestionInputProps) {
  switch (question.type) {
    case "number_scale":
      return <NumberScale onSubmit={onSubmit} disabled={disabled} />;
    
    case "single_select":
      return (
        <SingleSelect 
          options={question.options || []} 
          onSubmit={onSubmit} 
          disabled={disabled} 
        />
      );
    
    case "yes_no":
      return <YesNo onSubmit={onSubmit} disabled={disabled} />;
    
    case "phone_number":
      return <PhoneInput onSubmit={onSubmit} disabled={disabled} />;
    
    case "long_answer":
      return <LongAnswer onSubmit={onSubmit} disabled={disabled} />;
    
    case "short_answer":
    default:
      return <ShortAnswer onSubmit={onSubmit} disabled={disabled} />;
  }
}
```

### 4. Number Scale Input (`components/interview/inputs/NumberScale.tsx`)

```tsx
"use client";

import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

interface NumberScaleProps {
  onSubmit: (value: string) => void;
  disabled?: boolean;
}

export function NumberScale({ onSubmit, disabled }: NumberScaleProps) {
  const [value, setValue] = useState(5);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>1</span>
        <span className="text-2xl font-bold text-foreground">{value}</span>
        <span>10</span>
      </div>
      
      <Slider
        value={[value]}
        onValueChange={([v]) => setValue(v)}
        min={1}
        max={10}
        step={1}
        disabled={disabled}
        className="w-full"
      />
      
      <Button 
        onClick={() => onSubmit(value.toString())} 
        disabled={disabled}
        className="w-full"
      >
        Submit
      </Button>
    </div>
  );
}
```

### 5. Single Select Input (`components/interview/inputs/SingleSelect.tsx`)

```tsx
"use client";

import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface SingleSelectProps {
  options: string[];
  onSubmit: (value: string) => void;
  disabled?: boolean;
}

export function SingleSelect({ options, onSubmit, disabled }: SingleSelectProps) {
  const [selected, setSelected] = useState<string>("");

  return (
    <div className="space-y-4">
      <RadioGroup value={selected} onValueChange={setSelected} disabled={disabled}>
        {options.map((option, index) => (
          <div key={option} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer">
            <RadioGroupItem value={option} id={`option-${index}`} />
            <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
              {option}
            </Label>
          </div>
        ))}
      </RadioGroup>
      
      <Button 
        onClick={() => onSubmit(selected)} 
        disabled={disabled || !selected}
        className="w-full"
      >
        Submit
      </Button>
    </div>
  );
}
```

### 6. Yes/No Input (`components/interview/inputs/YesNo.tsx`)

```tsx
"use client";

import { Button } from "@/components/ui/button";

interface YesNoProps {
  onSubmit: (value: string) => void;
  disabled?: boolean;
}

export function YesNo({ onSubmit, disabled }: YesNoProps) {
  return (
    <div className="flex gap-4">
      <Button
        onClick={() => onSubmit("yes")}
        disabled={disabled}
        variant="outline"
        className="flex-1 h-16 text-lg"
      >
        Yes
      </Button>
      <Button
        onClick={() => onSubmit("no")}
        disabled={disabled}
        variant="outline"
        className="flex-1 h-16 text-lg"
      >
        No
      </Button>
    </div>
  );
}
```

### 7. Main Interview Page (`app/interview/page.tsx`)

```tsx
"use client";

import { useEffect } from "react";
import { useInterview } from "@/hooks/useInterview";
import { InterviewContainer } from "@/components/interview/InterviewContainer";

// Example config - in production, fetch from API or pass via URL params
const INTERVIEW_CONFIG = {
  interview_type: "screener" as const,
  questions: [
    {
      type: "number_scale" as const,
      text: "How would you rate leadership at Acme?",
      max_followups: 1,
      group: "Leadership",
    },
    {
      type: "yes_no" as const,
      text: "Do you currently have a valid CDL?",
      max_followups: 0,
    },
    {
      type: "single_select" as const,
      text: "What is the highest level of education you have completed?",
      options: ["Some high school", "High school", "Bachelor's degree", "Advanced degree"],
      max_followups: 0,
    },
    {
      type: "phone_number" as const,
      text: "What is your phone number?",
      max_followups: 0,
    },
  ],
  llm_fallback: true,
};

export default function InterviewPage() {
  const interview = useInterview();

  useEffect(() => {
    interview.start(INTERVIEW_CONFIG);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <InterviewContainer
          messages={interview.messages}
          currentQuestion={interview.currentQuestion}
          isComplete={interview.isComplete}
          isLoading={interview.isLoading}
          error={interview.error}
          onRespond={interview.respond}
        />
      </div>
    </main>
  );
}
```

### 8. Interview Container (`components/interview/InterviewContainer.tsx`)

```tsx
"use client";

import { Question } from "@/lib/langgraph";
import { MessageList } from "./MessageList";
import { QuestionInput } from "./inputs/QuestionInput";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle } from "lucide-react";

interface Message {
  role: "assistant" | "user";
  content: string;
}

interface InterviewContainerProps {
  messages: Message[];
  currentQuestion: Question | null;
  isComplete: boolean;
  isLoading: boolean;
  error: string | null;
  onRespond: (response: string) => void;
}

export function InterviewContainer({
  messages,
  currentQuestion,
  isComplete,
  isLoading,
  error,
  onRespond,
}: InterviewContainerProps) {
  return (
    <Card className="shadow-xl">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          {isComplete ? (
            <>
              <CheckCircle className="h-5 w-5 text-green-500" />
              Interview Complete
            </>
          ) : (
            "Interview"
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Messages */}
        <div className="max-h-[400px] overflow-y-auto p-4">
          <MessageList messages={messages} />
          
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground mt-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing...</span>
            </div>
          )}
        </div>
        
        {/* Input */}
        {!isComplete && currentQuestion && (
          <div className="border-t p-4 bg-muted/50">
            <QuestionInput
              question={currentQuestion}
              onSubmit={onRespond}
              disabled={isLoading}
            />
          </div>
        )}
        
        {/* Error */}
        {error && (
          <div className="p-4 bg-destructive/10 text-destructive">
            {error}
          </div>
        )}
        
        {/* Complete */}
        {isComplete && (
          <div className="p-6 text-center">
            <p className="text-muted-foreground">
              Thank you for completing the interview!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_LANGGRAPH_URL=http://localhost:2024
```

---

## Running Together

```bash
# Terminal 1: Start LangGraph server
cd interview-orchestration
npx @langchain/langgraph-cli dev

# Terminal 2: Start Next.js frontend
cd frontend
npm run dev
```

---

## Next Steps

1. Create the Next.js project
2. Install dependencies
3. Copy the component code
4. Connect to LangGraph API
5. Test the flow
6. Add streaming support for real-time responses
7. Add authentication if needed
8. Deploy!

