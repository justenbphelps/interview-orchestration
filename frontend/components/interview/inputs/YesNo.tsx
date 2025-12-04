"use client";

import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface YesNoProps {
  onSubmit: (value: string) => void;
  disabled?: boolean;
}

export function YesNo({ onSubmit, disabled }: YesNoProps) {
  return (
    <div className="flex gap-4 animate-fade-in">
      <Button
        onClick={() => onSubmit("yes")}
        disabled={disabled}
        variant="outline"
        className="flex-1 h-20 text-xl font-semibold hover:bg-green-500/10 hover:border-green-500 hover:text-green-600 transition-all"
      >
        <Check className="mr-2 h-6 w-6" />
        Yes
      </Button>
      <Button
        onClick={() => onSubmit("no")}
        disabled={disabled}
        variant="outline"
        className="flex-1 h-20 text-xl font-semibold hover:bg-red-500/10 hover:border-red-500 hover:text-red-600 transition-all"
      >
        <X className="mr-2 h-6 w-6" />
        No
      </Button>
    </div>
  );
}

