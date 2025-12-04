import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// =============================================================================
// QUESTION GENERATOR API
// Uses Claude to generate formal interview questions from brief descriptions
// =============================================================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface RequestBody {
  type: string;
  prompt: string;
  interviewType: string;
}

const TYPE_GUIDELINES: Record<string, string> = {
  number_scale: `Generate a question that asks the respondent to rate something on a scale of 1 to 10.
    The question should clearly indicate what 1 and 10 represent (e.g., 1 = very dissatisfied, 10 = very satisfied).
    DO NOT include the scale numbers in the question - just ask naturally.`,
  
  yes_no: `Generate a question that can be answered with Yes or No.
    Make it clear and unambiguous.`,
  
  single_select: `Generate a question that asks the respondent to choose ONE option from a list.
    Also generate 3-5 appropriate options for this question.
    Return options as a JSON array in the "options" field.`,
  
  short_answer: `Generate a question expecting a brief text response (a few words to one sentence).
    Often used for factual information like names, locations, or simple details.`,
  
  long_answer: `Generate a question expecting a detailed, thoughtful response.
    These are open-ended questions that invite explanation, reflection, or storytelling.`,
  
  phone_number: `Generate a polite question asking for the respondent's phone number.
    Make it sound natural and explain why you need it if relevant.`,
};

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { type, prompt, interviewType } = body;

    const typeGuideline = TYPE_GUIDELINES[type] || "Generate an appropriate interview question.";

    const message = await anthropic.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `You are helping create questions for a ${interviewType} interview.

The user wants to ask about: "${prompt}"

Question type: ${type}

Guidelines:
${typeGuideline}

Generate a professional, clear, and conversational interview question based on the user's request.

${type === "single_select" ? `
Respond in JSON format:
{
  "questionText": "Your generated question here",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"]
}
` : `
Respond in JSON format:
{
  "questionText": "Your generated question here"
}
`}

Only respond with the JSON, nothing else.`,
        },
      ],
    });

    // Extract text from response
    const textContent = message.content.find((block) => block.type === "text");
    const responseText = textContent?.text || "";

    // Parse JSON response
    try {
      const parsed = JSON.parse(responseText);
      return NextResponse.json({
        questionText: parsed.questionText,
        options: parsed.options || undefined,
      });
    } catch {
      // If JSON parsing fails, try to extract the question
      return NextResponse.json({
        questionText: responseText.replace(/^["']|["']$/g, "").trim(),
      });
    }
  } catch (error) {
    console.error("Error generating question:", error);
    return NextResponse.json(
      { error: "Failed to generate question" },
      { status: 500 }
    );
  }
}

