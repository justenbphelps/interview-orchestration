"use client";

import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NumberScaleProps {
  onSubmit: (value: string) => void;
  disabled?: boolean;
}

export function NumberScale({ onSubmit, disabled }: NumberScaleProps) {
  const [value, setValue] = useState(5);

  const handleSubmit = () => {
    onSubmit(value.toString());
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Value Display */}
      <div className="text-center">
        <span
          className={cn(
            "text-5xl font-bold transition-all duration-200",
            value <= 3 && "text-red-500",
            value >= 4 && value <= 6 && "text-yellow-500",
            value >= 7 && "text-green-500"
          )}
        >
          {value}
        </span>
      </div>

      {/* Scale Labels */}
      <div className="flex justify-between text-sm text-muted-foreground px-1">
        <span>1 - Low</span>
        <span>10 - High</span>
      </div>

      {/* Slider */}
      <Slider
        value={[value]}
        onValueChange={([v]) => setValue(v)}
        min={1}
        max={10}
        step={1}
        disabled={disabled}
        className="w-full"
      />

      {/* Quick Select Buttons */}
      <div className="flex justify-between gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
          <button
            key={num}
            onClick={() => setValue(num)}
            disabled={disabled}
            className={cn(
              "w-8 h-8 rounded-full text-xs font-medium transition-all",
              "hover:bg-primary hover:text-primary-foreground",
              value === num
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            )}
          >
            {num}
          </button>
        ))}
      </div>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={disabled}
        className="w-full"
        size="lg"
      >
        Submit
      </Button>
    </div>
  );
}

