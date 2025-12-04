"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";

interface PhoneInputProps {
  onSubmit: (value: string) => void;
  disabled?: boolean;
}

export function PhoneInput({ onSubmit, disabled }: PhoneInputProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const formatPhoneNumber = (input: string): string => {
    // Remove all non-digits
    const digits = input.replace(/\D/g, "");

    // Format as (XXX) XXX-XXXX
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setValue(formatted);
    setError(null);
  };

  const handleSubmit = () => {
    const digits = value.replace(/\D/g, "");

    if (digits.length < 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    onSubmit(digits);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="relative">
        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="tel"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="(555) 123-4567"
          disabled={disabled}
          className="pl-10 h-12 text-lg"
          maxLength={14}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive animate-fade-in">{error}</p>
      )}

      <Button
        onClick={handleSubmit}
        disabled={disabled || value.replace(/\D/g, "").length < 10}
        className="w-full"
        size="lg"
      >
        Submit
      </Button>
    </div>
  );
}

