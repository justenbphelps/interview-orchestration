"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Settings, Play, AlertCircle, Check, Copy, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InterviewConfig } from "@/lib/types";

interface ConfigEditorProps {
  config: InterviewConfig;
  onApply: (config: InterviewConfig) => void;
  isInterviewActive: boolean;
}

const DEFAULT_CONFIG: InterviewConfig = {
  interview_type: "screener",
  questions: [
    {
      type: "number_scale",
      text: "How would you rate leadership at Acme?",
      max_followups: 1,
      group: "Leadership",
    },
    {
      type: "yes_no",
      text: "Do you currently have a valid CDL?",
      max_followups: 0,
    },
  ],
  llm_fallback: true,
};

export function ConfigEditor({ config, onApply, isInterviewActive }: ConfigEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [jsonValue, setJsonValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  // For portal rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync config to JSON when dialog opens
  useEffect(() => {
    if (isOpen) {
      setJsonValue(JSON.stringify(config, null, 2));
      setError(null);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, config]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const handleJsonChange = (value: string) => {
    setJsonValue(value);
    setError(null);
  };

  const handleApply = () => {
    try {
      const parsed = JSON.parse(jsonValue) as InterviewConfig;

      if (!parsed.interview_type) {
        throw new Error("interview_type is required");
      }
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error("questions array is required");
      }
      if (parsed.questions.length === 0) {
        throw new Error("At least one question is required");
      }

      for (let i = 0; i < parsed.questions.length; i++) {
        const q = parsed.questions[i];
        if (!q.type) throw new Error(`Question ${i + 1}: type is required`);
        if (!q.text) throw new Error(`Question ${i + 1}: text is required`);
        if (typeof q.max_followups !== "number") {
          throw new Error(`Question ${i + 1}: max_followups must be a number`);
        }
        if (q.type === "single_select" && (!q.options || q.options.length === 0)) {
          throw new Error(`Question ${i + 1}: single_select requires options`);
        }
      }

      setError(null);
      onApply(parsed);
      setIsOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  const handleReset = () => {
    setJsonValue(JSON.stringify(DEFAULT_CONFIG, null, 2));
    setError(null);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonValue);
      setJsonValue(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch (e) {
      setError("Cannot format: Invalid JSON");
    }
  };

  const modal = isOpen && mounted ? createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={() => setIsOpen(false)}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.75)",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "relative",
          backgroundColor: "white",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          width: "100%",
          maxWidth: "700px",
          maxHeight: "calc(100vh - 40px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 600,
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Settings style={{ width: "20px", height: "20px" }} />
              Interview Configuration
            </h2>
            <p style={{ fontSize: "14px", color: "#6b7280", margin: "4px 0 0 0" }}>
              Edit the interview configuration JSON. Changes will restart the interview.
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              padding: "8px",
              borderRadius: "8px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
            }}
            className="hover:bg-gray-100"
          >
            <X style={{ width: "20px", height: "20px" }} />
          </button>
        </div>

        {/* Toolbar */}
        <div
          style={{
            padding: "8px 16px",
            backgroundColor: "#f9fafb",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Button variant="ghost" size="sm" onClick={handleFormat}>
            Format
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          <div style={{ flex: 1 }} />
          {isInterviewActive && (
            <span style={{ fontSize: "12px", color: "#6b7280" }}>
              ⚠️ Interview in progress
            </span>
          )}
        </div>

        {/* Editor */}
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          <textarea
            value={jsonValue}
            onChange={(e) => handleJsonChange(e.target.value)}
            style={{
              width: "100%",
              height: "400px",
              padding: "16px",
              fontFamily: "monospace",
              fontSize: "13px",
              backgroundColor: "#0f172a",
              color: "#e2e8f0",
              border: "none",
              resize: "none",
              outline: "none",
            }}
            spellCheck={false}
            placeholder="Enter interview configuration JSON..."
          />
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "#fef2f2",
              color: "#dc2626",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              borderTop: "1px solid #fecaca",
            }}
          >
            <AlertCircle style={{ width: "16px", height: "16px", flexShrink: 0 }} />
            {error}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #e5e7eb",
            backgroundColor: "#f9fafb",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
          }}
        >
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            <Play className="h-4 w-4 mr-2" />
            Apply & Restart
          </Button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      {/* Gear Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        title="Dev Config"
      >
        <Settings className="h-5 w-5" />
      </button>

      {modal}
    </>
  );
}

// =============================================================================
// EXAMPLE CONFIGS FOR REFERENCE
// =============================================================================

export const EXAMPLE_CONFIGS = {
  screener: {
    interview_type: "screener",
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
    llm_fallback: true,
  },
  exit: {
    interview_type: "exit",
    questions: [
      {
        type: "number_scale",
        text: "Overall, how would you rate your experience working here?",
        max_followups: 1,
        group: "Overall Experience",
      },
      {
        type: "long_answer",
        text: "What is the primary reason you decided to leave?",
        max_followups: 2,
        group: "Departure Reason",
      },
      {
        type: "yes_no",
        text: "Would you recommend this company to a friend?",
        max_followups: 1,
      },
      {
        type: "long_answer",
        text: "What could we have done differently to keep you?",
        max_followups: 1,
        group: "Feedback",
      },
    ],
    llm_fallback: true,
  },
} as const;
