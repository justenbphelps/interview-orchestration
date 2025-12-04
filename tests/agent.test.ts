import { describe, it, expect } from "@jest/globals";
import {
  isBasicQuestion,
  getCurrentQuestion,
  hasMoreQuestions,
  canAskFollowup,
  Question,
  InterviewState,
} from "../src/agent/state.js";
import {
  validateResponse,
  validateInterviewConfig,
} from "../src/agent/validation/validators.js";

// =============================================================================
// STATE HELPER TESTS
// =============================================================================

describe("State Helpers", () => {
  describe("isBasicQuestion", () => {
    it("returns true for max_followups = 0", () => {
      const question: Question = {
        type: "phone_number",
        text: "What is your phone?",
        max_followups: 0,
      };
      expect(isBasicQuestion(question)).toBe(true);
    });

    it("returns false for max_followups > 0", () => {
      const question: Question = {
        type: "long_answer",
        text: "Tell me about yourself",
        max_followups: 2,
      };
      expect(isBasicQuestion(question)).toBe(false);
    });
  });

  describe("getCurrentQuestion", () => {
    it("returns the current question", () => {
      const questions: Question[] = [
        { type: "short_answer", text: "Q1", max_followups: 0 },
        { type: "short_answer", text: "Q2", max_followups: 0 },
      ];
      const state = {
        questions,
        currentQuestionIndex: 1,
      } as InterviewState;

      const question = getCurrentQuestion(state);
      expect(question?.text).toBe("Q2");
    });

    it("returns null if index is out of bounds", () => {
      const questions: Question[] = [
        { type: "short_answer", text: "Q1", max_followups: 0 },
      ];
      const state = {
        questions,
        currentQuestionIndex: 5,
      } as InterviewState;

      expect(getCurrentQuestion(state)).toBeNull();
    });
  });

  describe("hasMoreQuestions", () => {
    it("returns true if more questions remain", () => {
      const state = {
        questions: [{ type: "short_answer", text: "Q1", max_followups: 0 }],
        currentQuestionIndex: 0,
      } as InterviewState;

      expect(hasMoreQuestions(state)).toBe(true);
    });

    it("returns false if no more questions", () => {
      const state = {
        questions: [{ type: "short_answer", text: "Q1", max_followups: 0 }],
        currentQuestionIndex: 1,
      } as InterviewState;

      expect(hasMoreQuestions(state)).toBe(false);
    });
  });

  describe("canAskFollowup", () => {
    it("returns true if followups remaining", () => {
      const state = {
        questions: [{ type: "long_answer", text: "Q1", max_followups: 2 }],
        currentQuestionIndex: 0,
        currentFollowupCount: 1,
      } as InterviewState;

      expect(canAskFollowup(state)).toBe(true);
    });

    it("returns false if max followups reached", () => {
      const state = {
        questions: [{ type: "long_answer", text: "Q1", max_followups: 2 }],
        currentQuestionIndex: 0,
        currentFollowupCount: 2,
      } as InterviewState;

      expect(canAskFollowup(state)).toBe(false);
    });
  });
});

// =============================================================================
// VALIDATION TESTS
// =============================================================================

describe("Validators", () => {
  describe("validateResponse", () => {
    describe("number_scale", () => {
      const question: Question = {
        type: "number_scale",
        text: "Rate 1-10",
        max_followups: 0,
      };

      it("accepts valid numbers", () => {
        expect(validateResponse("5", question).isValid).toBe(true);
        expect(validateResponse("1", question).isValid).toBe(true);
        expect(validateResponse("10", question).isValid).toBe(true);
      });

      it("rejects invalid numbers", () => {
        expect(validateResponse("0", question).isValid).toBe(false);
        expect(validateResponse("11", question).isValid).toBe(false);
        expect(validateResponse("abc", question).isValid).toBe(false);
      });

      it("normalizes the value", () => {
        expect(validateResponse("  7  ", question).normalizedValue).toBe("7");
      });
    });

    describe("yes_no", () => {
      const question: Question = {
        type: "yes_no",
        text: "Do you agree?",
        max_followups: 0,
      };

      it("accepts yes variants", () => {
        expect(validateResponse("yes", question).normalizedValue).toBe("yes");
        expect(validateResponse("Yeah", question).normalizedValue).toBe("yes");
        expect(validateResponse("Y", question).normalizedValue).toBe("yes");
      });

      it("accepts no variants", () => {
        expect(validateResponse("no", question).normalizedValue).toBe("no");
        expect(validateResponse("Nope", question).normalizedValue).toBe("no");
        expect(validateResponse("N", question).normalizedValue).toBe("no");
      });

      it("rejects invalid responses", () => {
        expect(validateResponse("maybe", question).isValid).toBe(false);
        expect(validateResponse("sometimes", question).isValid).toBe(false);
      });
    });

    describe("single_select", () => {
      const question: Question = {
        type: "single_select",
        text: "Choose one",
        max_followups: 0,
        options: ["Option A", "Option B", "Option C"],
      };

      it("accepts exact matches", () => {
        expect(validateResponse("Option A", question).isValid).toBe(true);
        expect(validateResponse("option b", question).isValid).toBe(true);
      });

      it("accepts numeric selection", () => {
        expect(validateResponse("1", question).normalizedValue).toBe("Option A");
        expect(validateResponse("2", question).normalizedValue).toBe("Option B");
      });

      it("accepts letter selection", () => {
        expect(validateResponse("a", question).normalizedValue).toBe("Option A");
        expect(validateResponse("b", question).normalizedValue).toBe("Option B");
      });

      it("rejects invalid options", () => {
        expect(validateResponse("Option D", question).isValid).toBe(false);
        expect(validateResponse("4", question).isValid).toBe(false);
      });
    });

    describe("phone_number", () => {
      const question: Question = {
        type: "phone_number",
        text: "Phone number",
        max_followups: 0,
      };

      it("accepts valid phone formats", () => {
        expect(validateResponse("555-123-4567", question).isValid).toBe(true);
        expect(validateResponse("(555) 123-4567", question).isValid).toBe(true);
        expect(validateResponse("5551234567", question).isValid).toBe(true);
        expect(validateResponse("+1 555 123 4567", question).isValid).toBe(true);
      });

      it("normalizes to digits only", () => {
        expect(validateResponse("555-123-4567", question).normalizedValue).toBe(
          "5551234567"
        );
      });

      it("rejects invalid phone numbers", () => {
        expect(validateResponse("123", question).isValid).toBe(false);
        expect(validateResponse("call me", question).isValid).toBe(false);
      });
    });

    describe("short_answer", () => {
      const question: Question = {
        type: "short_answer",
        text: "What city?",
        max_followups: 0,
      };

      it("accepts non-empty responses", () => {
        expect(validateResponse("New York", question).isValid).toBe(true);
      });

      it("rejects empty responses", () => {
        expect(validateResponse("", question).isValid).toBe(false);
        expect(validateResponse("   ", question).isValid).toBe(false);
      });
    });
  });

  describe("validateInterviewConfig", () => {
    it("accepts valid config", () => {
      const config = {
        interview_type: "screener",
        questions: [
          { type: "short_answer", text: "Q1", max_followups: 0 },
        ],
      };
      expect(validateInterviewConfig(config).isValid).toBe(true);
    });

    it("rejects missing interview_type", () => {
      const config = {
        questions: [{ type: "short_answer", text: "Q1", max_followups: 0 }],
      };
      expect(validateInterviewConfig(config).isValid).toBe(false);
    });

    it("rejects invalid interview_type", () => {
      const config = {
        interview_type: "invalid",
        questions: [{ type: "short_answer", text: "Q1", max_followups: 0 }],
      };
      expect(validateInterviewConfig(config).isValid).toBe(false);
    });

    it("rejects empty questions array", () => {
      const config = {
        interview_type: "screener",
        questions: [],
      };
      expect(validateInterviewConfig(config).isValid).toBe(false);
    });

    it("rejects questions without required fields", () => {
      const config = {
        interview_type: "screener",
        questions: [{ text: "Q1" }],
      };
      expect(validateInterviewConfig(config).isValid).toBe(false);
    });

    it("rejects single_select without options", () => {
      const config = {
        interview_type: "screener",
        questions: [
          { type: "single_select", text: "Choose", max_followups: 0 },
        ],
      };
      expect(validateInterviewConfig(config).isValid).toBe(false);
    });
  });
});
