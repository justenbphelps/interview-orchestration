import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// =============================================================================
// TEST RESPONSE GENERATOR API
// Uses Claude to generate contextual test responses for dev testing
// =============================================================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface RequestBody {
  scenario: string;
  questionType: string;
  questionText: string;
  options?: string[];
}

const SCENARIO_PROMPTS: Record<string, string> = {
  skip_request: `Generate a polite but clear request to skip or not answer this question. 
    Make it sound natural, like a real person who doesn't want to share this information.
    Examples: "I'd prefer not to answer that", "Can we skip this one?", "I'm not comfortable sharing that"`,

  short_valid: `Generate a brief, valid answer that directly addresses the question. 
    Keep it concise (1-10 words) but complete and relevant.`,

  long_detailed: `Generate a thoughtful, detailed answer (2-4 sentences) that shows 
    genuine engagement with the question. Include specific examples or details.`,

  vague_incomplete: `Generate a vague, incomplete answer that doesn't fully address the question.
    Be evasive or give only partial information. This tests follow-up logic.`,

  eeoc_concern: `Generate a response where the person naturally mentions something related to 
    an EEOC-protected category (age, family status, pregnancy, medical leave, religious accommodation, etc.)
    in a matter-of-fact way while answering the question. NOT a complaint - just casually mentioning 
    something like "I had to take FMLA leave" or "after my maternity leave" or "as someone over 50" 
    or "due to my medical condition". Keep it brief and natural.`,

  incident_report: `Generate a response where the person casually mentions something that happened 
    at work that might need follow-up - like a minor safety issue, an uncomfortable situation with 
    a coworker, or something they witnessed. NOT dramatic - just mentioned in passing while 
    answering the question. Example: "...also there was that time the equipment malfunctioned" 
    or "...though I did have an awkward situation with a supervisor once".`,

  off_topic: `Generate a response that is completely off-topic and doesn't address 
    the question at all. Talk about something unrelated.`,

  emotional: `Generate an emotional response that shows frustration, sadness, or strong feelings
    about the topic. This tests empathy handling.`,

  multilingual: `Generate a response that includes some non-English words or phrases,
    or is partially in Spanish. This tests translation handling.`,

  invalid_format: `Generate a response that is clearly the wrong format for this question type.
    For example: text when a number is expected, or a number when text is expected.`,
};

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { scenario, questionType, questionText, options } = body;

    const scenarioPrompt = SCENARIO_PROMPTS[scenario];
    if (!scenarioPrompt) {
      return NextResponse.json(
        { error: `Unknown scenario: ${scenario}` },
        { status: 400 }
      );
    }

    // Build context about the question
    let questionContext = `Question Type: ${questionType}\nQuestion: "${questionText}"`;
    if (options && options.length > 0) {
      questionContext += `\nAvailable Options: ${options.join(", ")}`;
    }

    // Add type-specific guidance
    let typeGuidance = "";
    switch (questionType) {
      case "number_scale":
        typeGuidance = "\nExpected response: A number from 1-10, or text explaining a number.";
        break;
      case "yes_no":
        typeGuidance = "\nExpected response: Yes, No, or an explanation.";
        break;
      case "single_select":
        typeGuidance = `\nExpected response: One of the available options, or an explanation.`;
        break;
      case "phone_number":
        typeGuidance = "\nExpected response: A phone number in any format.";
        break;
      case "short_answer":
        typeGuidance = "\nExpected response: A brief text answer (a few words to a sentence).";
        break;
      case "long_answer":
        typeGuidance = "\nExpected response: A detailed text answer (multiple sentences).";
        break;
    }

    const message = await anthropic.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `You are generating a test response for an interview chatbot testing system.

${questionContext}${typeGuidance}

Scenario to simulate:
${scenarioPrompt}

Generate ONLY the test response text itself. No quotes, no explanation, no meta-commentary. 
Just the raw response as if you were the interview respondent.`,
        },
      ],
    });

    // Extract text from response
    const textContent = message.content.find((block) => block.type === "text");
    const response = textContent?.text || "I'm not sure how to answer that.";

    return NextResponse.json({ response });
  } catch (error) {
    console.error("Error generating test response:", error);
    return NextResponse.json(
      { error: "Failed to generate test response" },
      { status: 500 }
    );
  }
}

