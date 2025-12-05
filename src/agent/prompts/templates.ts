import { InterviewType, QuestionType } from "../state.js";

// =============================================================================
// WELCOME MESSAGES
// =============================================================================

export const getWelcomePrompt = (interviewType: InterviewType): string => {
  if (interviewType === "screener") {
    return `You are conducting a screening interview to assess a candidate's qualifications.

Generate a brief, warm welcome message that:
1. Thanks them for their time
2. Explains this is a screening interview
3. Sets expectations (you'll ask some questions)
4. Is 2-3 sentences maximum

Generate only the welcome message, nothing else.`;
  }

  return `You are conducting an exit interview to gather feedback from a departing employee.

Generate a brief, warm welcome message that:
1. Thanks them for meeting
2. Explains the purpose is to gather feedback to improve
3. Assures their feedback is valuable
4. Is 2-3 sentences maximum

Generate only the welcome message, nothing else.`;
};

// =============================================================================
// QUESTION FORMATTING
// =============================================================================

export const getAskQuestionPrompt = (
  questionText: string,
  questionType: QuestionType,
  options?: string[]
): string => {
  let typeGuidance = "";

  switch (questionType) {
    case "number_scale":
      typeGuidance = "This is a scale question. Mention they should answer on a scale of 1 to 10.";
      break;
    case "single_select":
      typeGuidance = `This is a multiple choice question. Present these options naturally: ${options?.join(", ")}`;
      break;
    case "yes_no":
      typeGuidance = "This is a yes/no question. Phrase it to expect a yes or no answer.";
      break;
    case "phone_number":
      typeGuidance = "This asks for their phone number.";
      break;
    default:
      typeGuidance = "This is an open-ended question.";
  }

  return `Ask the following interview question in a natural, conversational way:

Question: "${questionText}"
${typeGuidance}

Guidelines:
- Keep it conversational and warm
- Don't add extra questions or follow-ups
- Don't collect any information not asked in the question

Generate only the question, nothing else.`;
};

// =============================================================================
// TRANSLATION
// =============================================================================

export const getTranslatePrompt = (response: string): string => {
  return `Analyze this text and translate it to English if needed.

Text: "${response}"

Instructions:
1. If the text is already in English, return it exactly as-is
2. If the text is in another language, translate it to English
3. Preserve the meaning and tone of the original

Return ONLY the English text, nothing else. No explanations or notes.`;
};

// =============================================================================
// CONCERN DETECTION
// =============================================================================

export const getCheckConcernsPrompt = (
  questionText: string,
  response: string
): string => {
  return `You are analyzing an interview response for concerning content that may need special handling.

Question asked: "${questionText}"
Response given: "${response}"

IMPORTANT: Normal workplace feedback, criticism, or complaints are NOT concerns. Only flag serious issues.

Check for these specific categories:

1. EEOC ISSUES - ONLY flag if there are explicit mentions of discrimination or harassment based on:
   - Race, color, religion, sex, gender, pregnancy
   - National origin, age (40+), disability
   - Genetic information, sexual orientation
   - Hostile work environment specifically due to protected characteristics
   - Retaliation for reporting discrimination
   
   DO NOT flag: General complaints about management, leadership criticism, or workplace frustrations.
   
2. OUTSIDE SCOPE - Response that:
   - Does not address the question at all
   - Is completely off-topic or irrelevant
   - Is asking questions instead of answering
   - Is about unrelated personal matters
   
   DO NOT flag: Responses that answer the question even if tangentially or with additional context.
   
3. REPORTABLE INCIDENTS - ONLY flag if there are explicit mentions of:
   - Actual workplace safety violations causing injury
   - Physical threats, violence, or intimidation
   - Specific illegal activity (theft, fraud, embezzlement)
   - Witnessed substance abuse at work
   - Sexual misconduct or assault
   
   DO NOT flag: Criticism of leadership, strategic concerns, communication problems, or general workplace issues.

When in doubt, respond with hasConcerns: false. Most interview responses are normal feedback.

Respond in this exact JSON format only:
{
  "hasConcerns": true or false,
  "concernType": "eeoc" or "outside_scope" or "incident" or null,
  "concernDetails": "brief description of the concern" or null
}`;
};

// =============================================================================
// PROPER RESPONSE CHECK
// =============================================================================

export const getCheckProperResponsePrompt = (
  questionText: string,
  response: string
): string => {
  return `You are analyzing if an interview response properly addresses the question.

Question: "${questionText}"
Response: "${response}"

Analyze if the response:
- Actually answers what was asked
- Provides sufficient detail for the question type
- Is not too vague or generic
- Makes sense as a response to this specific question

Consider:
- A number scale question just needs a number (follow-up can probe for details)
- A yes/no question just needs yes or no
- Open-ended questions need some substance but don't need to be lengthy

Respond in this exact JSON format only:
{
  "isProperResponse": true or false,
  "needsMoreContext": true or false,
  "reason": "brief explanation"
}`;
};

// =============================================================================
// EMPATHETIC ACKNOWLEDGEMENT
// =============================================================================

export const getGenerateEmpathyPrompt = (
  interviewType: InterviewType,
  questionText: string,
  response: string
): string => {
  const context = interviewType === "exit"
    ? "This is an exit interview gathering feedback from a departing employee."
    : "This is a screening interview assessing a candidate.";

  return `You are conducting an interview. ${context}

The question was: "${questionText}"
The respondent answered: "${response}"

Generate a brief, empathetic acknowledgement that:
1. Shows you heard and understood their response
2. Validates their perspective or experience
3. Is conversational and warm
4. Is 1-2 sentences maximum
5. Does NOT ask any follow-up questions

Generate only the acknowledgement, nothing else. Do not include quotation marks.`;
};

// =============================================================================
// FOLLOW-UP GENERATION
// =============================================================================

export const getGenerateFollowupPrompt = (
  interviewType: InterviewType,
  questionText: string,
  response: string,
  group?: string
): string => {
  const context = interviewType === "exit"
    ? "This is an exit interview gathering feedback."
    : "This is a screening interview.";

  const groupContext = group ? `\nQuestion category: ${group}` : "";

  return `You are conducting an interview. ${context}

The previous question was: "${questionText}"
The respondent answered: "${response}"${groupContext}

Their response needs more context or detail. Generate ONE thoughtful follow-up question that:
1. Asks for more detail or clarification
2. Is specific to what they said
3. Digs deeper into their experience or perspective
4. Is conversational and empathetic in tone
5. Stays on the topic of the original question

Generate only the follow-up question, nothing else. Do not include quotation marks.`;
};

// =============================================================================
// CLOSING MESSAGE
// =============================================================================

export const getClosingPrompt = (interviewType: InterviewType): string => {
  if (interviewType === "exit") {
    return `You have just completed an exit interview.

Generate a brief, warm closing message that:
1. Thanks them for their time and candid feedback
2. Acknowledges their feedback is valuable
3. Wishes them well in their future endeavors
4. Is 2-3 sentences maximum

Generate only the closing message, nothing else.`;
  }

  return `You have just completed a screening interview.

Generate a brief, warm closing message that:
1. Thanks them for their time
2. Lets them know next steps will be communicated
3. Is positive and encouraging
4. Is 2-3 sentences maximum

Generate only the closing message, nothing else.`;
};

// =============================================================================
// RELEVANCE CHECK
// =============================================================================

export const getCheckRelevancePrompt = (
  questionText: string,
  questionType: QuestionType,
  response: string,
  options?: string[]
): string => {
  let expectedFormat = "";

  switch (questionType) {
    case "number_scale":
      expectedFormat = "Expected: A number between 1 and 10, optionally with explanation.";
      break;
    case "yes_no":
      expectedFormat = "Expected: Yes or no, optionally with explanation.";
      break;
    case "single_select":
      expectedFormat = `Expected: One of these options: ${options?.join(", ")}`;
      break;
    case "phone_number":
      expectedFormat = "Expected: A phone number.";
      break;
    case "short_answer":
      expectedFormat = "Expected: A brief answer addressing the question.";
      break;
    case "long_answer":
      expectedFormat = "Expected: A detailed answer addressing the question.";
      break;
    default:
      expectedFormat = "Expected: An answer that addresses the question.";
  }

  return `You are checking if an interview response actually answers the question asked.

Question: "${questionText}"
${expectedFormat}

Response: "${response}"

A response is RELEVANT only if it actually provides the type of information requested:
- "Where" questions need a LOCATION (city, state, country, address, etc.)
- "What" questions need a THING, DESCRIPTION, or EXPLANATION
- "Why" questions need a REASON or EXPLANATION
- "How" questions need a PROCESS, METHOD, or EXPLANATION
- "When" questions need a TIME, DATE, or TIMEFRAME
- "Who" questions need a PERSON or PEOPLE
- Yes/no questions need YES or NO (with optional explanation)
- Scale questions need a NUMBER

A response is IRRELEVANT if:
1. It doesn't match the expected answer type (e.g., answering "yes" to "where do you live?")
2. It's about a completely different topic
3. It's random text, gibberish, or test input (like "asdf", "test", "123", "hello")
4. It's a question back instead of an answer
5. It provides no actual information related to the question
6. It's a one-word answer that doesn't fit the question type

Examples of IRRELEVANT responses:
- Question: "Where are you located?" → Response: "yes" (wrong answer type)
- Question: "What is your experience?" → Response: "good" (too vague, no actual info)
- Question: "Why are you leaving?" → Response: "okay" (doesn't answer why)

Be STRICT - the response must actually attempt to answer what was asked with appropriate information.

Respond in this exact JSON format only:
{
  "isRelevant": true or false,
  "reason": "brief explanation if irrelevant, empty string if relevant"
}`;
};

// =============================================================================
// REPROMPT
// =============================================================================

export const getRepromptPrompt = (
  questionText: string,
  questionType: QuestionType,
  errorMessage: string,
  options?: string[]
): string => {
  let typeHint = "";

  switch (questionType) {
    case "number_scale":
      typeHint = "They need to provide a number between 1 and 10.";
      break;
    case "yes_no":
      typeHint = "They need to answer yes or no.";
      break;
    case "single_select":
      typeHint = `They need to choose one of: ${options?.join(", ")}`;
      break;
    case "phone_number":
      typeHint = "They need to provide a valid phone number.";
      break;
    default:
      typeHint = "They need to provide a response.";
  }

  return `The user gave an invalid response to an interview question.

Question: "${questionText}"
Issue: ${errorMessage}
${typeHint}

Generate a friendly, brief message asking them to try again.
Be specific about what format you need.
Keep it warm and not robotic.

Generate only the re-prompt message, nothing else.`;
};

