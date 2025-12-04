"use client";

import type { Question } from "@/lib/types";
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

