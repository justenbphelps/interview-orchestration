"use client";

import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface SingleSelectProps {
  options: string[];
  onSubmit: (value: string) => void;
  disabled?: boolean;
}

// Use dropdown for 5+ options, radio buttons for fewer
const DROPDOWN_THRESHOLD = 5;

export function SingleSelect({ options, onSubmit, disabled }: SingleSelectProps) {
  const [selected, setSelected] = useState<string>("");
  const useDropdown = options.length >= DROPDOWN_THRESHOLD;

  const handleSubmit = () => {
    if (selected) {
      onSubmit(selected);
    }
  };

  if (useDropdown) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Select
          value={selected}
          onValueChange={setSelected}
          disabled={disabled}
        >
          <SelectTrigger
            className={cn(
              "w-full transition-all",
              selected && "border-primary"
            )}
          >
            <SelectValue placeholder="Select an option..." />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
