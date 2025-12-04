"use client";

import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface SingleSelectProps {
  options: string[];
  onSubmit: (value: string) => void;
  disabled?: boolean;
}

export function SingleSelect({ options, onSubmit, disabled }: SingleSelectProps) {
  const [selected, setSelected] = useState<string>("");

  const handleSubmit = () => {
    if (selected) {
      onSubmit(selected);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <RadioGroup
        value={selected}
        onValueChange={setSelected}
        disabled={disabled}
        className="space-y-2"
      >
        {options.map((option, index) => (
          <div
            key={option}
            className={cn(
              "flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer",
              "hover:border-primary/50 hover:bg-accent/50",
              selected === option
                ? "border-primary bg-primary/5"
                : "border-border"
            )}
            onClick={() => !disabled && setSelected(option)}
          >
            <RadioGroupItem value={option} id={`option-${index}`} />
            <Label
              htmlFor={`option-${index}`}
              className="flex-1 cursor-pointer text-base"
            >
              {option}
            </Label>
            {selected === option && (
              <Check className="h-5 w-5 text-primary animate-fade-in" />
            )}
          </div>
        ))}
      </RadioGroup>

      <Button
        onClick={handleSubmit}
        disabled={disabled || !selected}
        className="w-full"
        size="lg"
      >
        Submit
      </Button>
    </div>
  );
}

