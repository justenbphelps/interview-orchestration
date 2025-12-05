import type { InterviewConfig } from "./types";

// =============================================================================
// SCREENER INTERVIEW TEMPLATE
// =============================================================================

export const SCREENER_TEMPLATE: InterviewConfig = {
  interview_type: "screener",
  setup: {
    companyName: "Acme Inc.",
    jobTitle: "Software Engineer",
    interviewerName: "Alex",
  },
  questions: [
    {
      type: "short_answer",
      text: "What is your current city of residence?",
      max_followups: 0,
    },
    {
      type: "yes_no",
      text: "Are you legally authorized to work in the United States?",
      max_followups: 0,
    },
    {
      type: "single_select",
      text: "What is the highest level of education you have completed?",
      options: [
        "Some high school",
        "High school diploma or GED",
        "Some college",
        "Associate's degree",
        "Bachelor's degree",
        "Master's degree",
        "Doctoral degree",
      ],
      max_followups: 0,
    },
    {
      type: "short_answer",
      text: "How many years of relevant experience do you have?",
      max_followups: 0,
    },
    {
      type: "long_answer",
      text: "What interests you most about this position?",
      max_followups: 1,
      group: "Motivation",
    },
    {
      type: "yes_no",
      text: "Are you available to start within the next two weeks?",
      max_followups: 0,
    },
    {
      type: "single_select",
      text: "What is your preferred work arrangement?",
      options: [
        "On-site",
        "Remote",
        "Hybrid",
        "Flexible / No preference",
      ],
      max_followups: 0,
    },
    {
      type: "short_answer",
      text: "What are your salary expectations for this role?",
      max_followups: 0,
    },
    {
      type: "phone_number",
      text: "What is the best phone number to reach you?",
      max_followups: 0,
    },
  ],
  llm_fallback: false,
};

// =============================================================================
// EXIT INTERVIEW TEMPLATE
// =============================================================================

export const EXIT_TEMPLATE: InterviewConfig = {
  interview_type: "exit",
  setup: {
    companyName: "Acme Inc.",
    jobTitle: "Departing Employee",
    interviewerName: "Alex",
  },
  questions: [
    {
      type: "single_select",
      text: "What is the primary reason for your departure?",
      options: [
        "New job opportunity",
        "Career change",
        "Relocation",
        "Compensation",
        "Work-life balance",
        "Management/Leadership",
        "Company culture",
        "Personal reasons",
        "Retirement",
        "Other",
      ],
      max_followups: 1,
      group: "Departure Reason",
    },
    {
      type: "number_scale",
      text: "On a scale of 1-10, how would you rate your overall experience working here?",
      max_followups: 1,
      group: "Overall Experience",
    },
    {
      type: "long_answer",
      text: "What did you enjoy most about working here?",
      max_followups: 1,
      group: "Positive Feedback",
    },
    {
      type: "long_answer",
      text: "What could we have done differently to keep you?",
      max_followups: 2,
      group: "Retention",
    },
    {
      type: "number_scale",
      text: "How would you rate your relationship with your direct manager?",
      max_followups: 1,
      group: "Management",
    },
    {
      type: "long_answer",
      text: "What suggestions do you have for improving the work environment or company culture?",
      max_followups: 1,
      group: "Culture",
    },
    {
      type: "yes_no",
      text: "Would you consider returning to work here in the future?",
      max_followups: 1,
      group: "Future",
    },
    {
      type: "yes_no",
      text: "Would you recommend this company to a friend or colleague?",
      max_followups: 1,
      group: "Recommendation",
    },
    {
      type: "long_answer",
      text: "Is there anything else you'd like to share before you go?",
      max_followups: 0,
      group: "Final Thoughts",
    },
  ],
  llm_fallback: false,
};

// =============================================================================
// TEMPLATE HELPERS
// =============================================================================

export const INTERVIEW_TEMPLATES = {
  screener: SCREENER_TEMPLATE,
  exit: EXIT_TEMPLATE,
} as const;

/**
 * Get the template for a specific interview type.
 */
export function getTemplate(type: "screener" | "exit"): InterviewConfig {
  return JSON.parse(JSON.stringify(INTERVIEW_TEMPLATES[type]));
}

/**
 * Get template with custom setup values preserved.
 */
export function getTemplateWithSetup(
  type: "screener" | "exit",
  setup?: InterviewConfig["setup"]
): InterviewConfig {
  const template = getTemplate(type);
  if (setup) {
    template.setup = { ...template.setup, ...setup };
  }
  return template;
}

