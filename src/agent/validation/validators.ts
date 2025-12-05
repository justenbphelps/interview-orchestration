import { QuestionType, Question } from "../state.js";

// =============================================================================
// VALIDATION RESULT
// =============================================================================

export interface ValidationResult {
  isValid: boolean;
  normalizedValue?: string;
  errorMessage?: string;
}

// =============================================================================
// VALIDATORS BY QUESTION TYPE
// =============================================================================

/**
 * Validates a number scale response (1-10).
 */
export const validateNumberScale = (response: string): ValidationResult => {
  const trimmed = response.trim();
  const num = parseInt(trimmed, 10);

  if (isNaN(num)) {
    return {
      isValid: false,
      errorMessage: "Please provide a number between 1 and 10.",
    };
  }

  if (num < 1 || num > 10) {
    return {
      isValid: false,
      errorMessage: `${num} is out of range. Please provide a number between 1 and 10.`,
    };
  }

  return {
    isValid: true,
    normalizedValue: num.toString(),
  };
};

/**
 * Validates a yes/no response.
 */
export const validateYesNo = (response: string): ValidationResult => {
  const trimmed = response.trim().toLowerCase();

  const yesVariants = [
    "yes",
    "y",
    "yeah",
    "yep",
    "yup",
    "sure",
    "absolutely",
    "definitely",
    "correct",
    "affirmative",
    "true",
  ];

  const noVariants = [
    "no",
    "n",
    "nope",
    "nah",
    "negative",
    "not really",
    "false",
  ];

  if (yesVariants.includes(trimmed)) {
    return {
      isValid: true,
      normalizedValue: "yes",
    };
  }

  if (noVariants.includes(trimmed)) {
    return {
      isValid: true,
      normalizedValue: "no",
    };
  }

  return {
    isValid: false,
    errorMessage: "Please answer with yes or no.",
  };
};

/**
 * Parses an option index from user input.
 * Handles: "1", "2", "a", "b", etc.
 */
const parseOptionIndex = (
  input: string,
  maxOptions: number
): number | null => {
  // Try numeric index (1-based)
  const num = parseInt(input, 10);
  if (!isNaN(num) && num >= 1 && num <= maxOptions) {
    return num - 1; // Convert to 0-based
  }

  // Try letter index (a, b, c, etc.)
  if (input.length === 1) {
    const charCode = input.charCodeAt(0);
    // 'a' = 97, 'b' = 98, etc.
    if (charCode >= 97 && charCode < 97 + maxOptions) {
      return charCode - 97;
    }
  }

  return null;
};

/**
 * Validates a single select response against provided options.
 * Uses fuzzy matching (case-insensitive, trimmed).
 */
export const validateSingleSelect = (
  response: string,
  options: string[]
): ValidationResult => {
  const trimmed = response.trim().toLowerCase();

  // Try exact match first (case-insensitive)
  const exactMatch = options.find(
    (opt) => opt.toLowerCase() === trimmed
  );

  if (exactMatch) {
    return {
      isValid: true,
      normalizedValue: exactMatch,
    };
  }

  // Try partial match (response starts with option or option starts with response)
  const partialMatch = options.find(
    (opt) =>
      opt.toLowerCase().startsWith(trimmed) ||
      trimmed.startsWith(opt.toLowerCase())
  );

  if (partialMatch) {
    return {
      isValid: true,
      normalizedValue: partialMatch,
    };
  }

  // Try "contains" match - check if any option is mentioned in the response
  // This handles cases like "High school, although I also took some courses..."
  const containsMatch = options.find(
    (opt) => trimmed.includes(opt.toLowerCase())
  );

  if (containsMatch) {
    return {
      isValid: true,
      normalizedValue: containsMatch,
    };
  }

  // Try matching by index (e.g., "1", "2", "a", "b")
  const indexMatch = parseOptionIndex(trimmed, options.length);
  if (indexMatch !== null && indexMatch < options.length) {
    return {
      isValid: true,
      normalizedValue: options[indexMatch],
    };
  }

  return {
    isValid: false,
    errorMessage: `Please choose one of the options: ${options.join(", ")}`,
  };
};

/**
 * Validates a phone number.
 * Accepts various formats and normalizes to digits only.
 */
export const validatePhoneNumber = (response: string): ValidationResult => {
  const trimmed = response.trim();

  // Extract digits only
  const digits = trimmed.replace(/\D/g, "");

  // US phone numbers: 10 digits (or 11 with country code)
  if (digits.length === 10) {
    return {
      isValid: true,
      normalizedValue: digits,
    };
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return {
      isValid: true,
      normalizedValue: digits.substring(1), // Remove country code
    };
  }

  // International numbers: 7-15 digits
  if (digits.length >= 7 && digits.length <= 15) {
    return {
      isValid: true,
      normalizedValue: digits,
    };
  }

  return {
    isValid: false,
    errorMessage:
      "Please provide a valid phone number (e.g., 555-123-4567).",
  };
};

/**
 * Validates a short answer (non-empty).
 */
export const validateShortAnswer = (response: string): ValidationResult => {
  const trimmed = response.trim();

  if (trimmed.length === 0) {
    return {
      isValid: false,
      errorMessage: "Please provide an answer.",
    };
  }

  return {
    isValid: true,
    normalizedValue: trimmed,
  };
};

/**
 * Validates a long answer (non-empty).
 */
export const validateLongAnswer = (response: string): ValidationResult => {
  const trimmed = response.trim();

  if (trimmed.length === 0) {
    return {
      isValid: false,
      errorMessage: "Please share your thoughts on this question.",
    };
  }

  return {
    isValid: true,
    normalizedValue: trimmed,
  };
};

// =============================================================================
// MAIN VALIDATION FUNCTION
// =============================================================================

/**
 * Validates a response based on question type.
 */
export const validateResponse = (
  response: string,
  question: Question
): ValidationResult => {
  switch (question.type) {
    case "number_scale":
      return validateNumberScale(response);

    case "yes_no":
      return validateYesNo(response);

    case "single_select":
      if (!question.options || question.options.length === 0) {
        return {
          isValid: false,
          errorMessage: "No options available for this question.",
        };
      }
      return validateSingleSelect(response, question.options);

    case "phone_number":
      return validatePhoneNumber(response);

    case "short_answer":
      return validateShortAnswer(response);

    case "long_answer":
      return validateLongAnswer(response);

    default:
      // Unknown type - accept any non-empty response
      return validateShortAnswer(response);
  }
};

// =============================================================================
// INPUT VALIDATION
// =============================================================================

/**
 * Validates the interview configuration input.
 */
export const validateInterviewConfig = (
  config: unknown
): { isValid: boolean; error?: string } => {
  if (!config || typeof config !== "object") {
    return { isValid: false, error: "Interview config must be an object." };
  }

  const cfg = config as Record<string, unknown>;

  // Validate interview_type
  if (!cfg.interview_type) {
    return { isValid: false, error: "interview_type is required." };
  }

  if (cfg.interview_type !== "screener" && cfg.interview_type !== "exit") {
    return {
      isValid: false,
      error: `Invalid interview_type: "${cfg.interview_type}". Must be "screener" or "exit".`,
    };
  }

  // Validate questions
  if (!cfg.questions) {
    return { isValid: false, error: "questions array is required." };
  }

  if (!Array.isArray(cfg.questions)) {
    return { isValid: false, error: "questions must be an array." };
  }

  if (cfg.questions.length === 0) {
    return { isValid: false, error: "questions array cannot be empty." };
  }

  // Validate each question
  for (let i = 0; i < cfg.questions.length; i++) {
    const q = cfg.questions[i] as Record<string, unknown>;

    if (!q.type) {
      return { isValid: false, error: `Question ${i + 1}: type is required.` };
    }

    const validTypes: QuestionType[] = [
      "number_scale",
      "long_answer",
      "short_answer",
      "yes_no",
      "single_select",
      "phone_number",
    ];

    if (!validTypes.includes(q.type as QuestionType)) {
      return {
        isValid: false,
        error: `Question ${i + 1}: invalid type "${q.type}".`,
      };
    }

    if (!q.text || typeof q.text !== "string") {
      return { isValid: false, error: `Question ${i + 1}: text is required.` };
    }

    if (typeof q.max_followups !== "number" || q.max_followups < 0) {
      return {
        isValid: false,
        error: `Question ${i + 1}: max_followups must be a non-negative number.`,
      };
    }

    // single_select requires options
    if (q.type === "single_select") {
      if (!q.options || !Array.isArray(q.options) || q.options.length === 0) {
        return {
          isValid: false,
          error: `Question ${i + 1}: single_select requires options array.`,
        };
      }
    }
  }

  return { isValid: true };
};

