"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface LongAnswerProps {
  onSubmit: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  minLength?: number;
}

export function LongAnswer({
  onSubmit,
  disabled,
  placeholder = "Share your thoughts...",
  minLength = 10,
}: LongAnswerProps) {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    if (value.trim().length >= minLength) {
      onSubmit(value.trim());
      setValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const charCount = value.trim().length;
  const isValid = charCount >= minLength;

  return (
    <div className="space-y-3 animate-fade-in">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="min-h-[120px] resize-none"
        rows={4}
      />

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {charCount < minLength ? (
            <span className="text-amber-500">
              {minLength - charCount} more characters needed
            </span>
          ) : (
            <span className="text-green-500">✓ Good to go</span>
          )}
        </span>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">⌘ + Enter to submit</span>
          <Button
            onClick={handleSubmit}
            disabled={disabled || !isValid}
            size="lg"
          >
            <Send className="h-4 w-4 mr-2" />
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}

