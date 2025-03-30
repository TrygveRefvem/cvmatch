import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Use same helpers if applicable, or redefine simply here
const MAX_CV_LENGTH = 10000;
const MAX_JOB_LENGTH = 8000; // Adjusted slightly

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const halfLength = Math.floor(maxLength / 2);
  return text.substring(0, halfLength) + 
    "\n...[tekst forkortet for analyse]...\n" + 
    text.substring(text.length - halfLength);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { cvText, jobText } = await request.json();

    // Basic Validation
    if (!cvText || !jobText) {
      return NextResponse.json({ error: 'CV text and Job Description text are required.' }, { status: 400 });
    }
    if (typeof cvText !== 'string' || typeof jobText !== 'string') {
         return NextResponse.json({ error: 'Invalid input types.' }, { status: 400 });
    }

    // Truncate
    const truncatedCv = truncateText(cvText, MAX_CV_LENGTH);
    const truncatedJob = truncateText(jobText, MAX_JOB_LENGTH);

    // Simplified OpenAI call
    const prompt = `
    Vurder hvor godt følgende CV matcher stillingsbeskrivelsen. 
    Gi en JSON-respons med KUN disse to feltene:
    1. "overallMatch": En numerisk verdi mellom 0 og 100.
    2. "overallFeedback": En kort generell tilbakemelding (maks 1-2 setninger).

    CV:
    ${truncatedCv}
    
    Stillingsbeskrivelse:
    ${truncatedJob}
    
    Returner KUN gyldig JSON.
    `;

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Can use a faster/cheaper model if needed
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }, 
        temperature: 0.3, 
    });

    const resultText = response.choices[0]?.message?.content;
    if (!resultText) {
        throw new Error('Fikk ingen respons fra OpenAI.');
    }

    let analysisResultJson: { overallMatch: number | null, overallFeedback: string | null };
    try { 
        const parsed = JSON.parse(resultText);
        // Validate the specific fields we asked for
        analysisResultJson = {
            overallMatch: (typeof parsed.overallMatch === 'number' && parsed.overallMatch >= 0 && parsed.overallMatch <= 100) ? parsed.overallMatch : null,
            overallFeedback: typeof parsed.overallFeedback === 'string' ? parsed.overallFeedback : null
        };
         if (analysisResultJson.overallMatch === null) {
             console.warn("OpenAI response missing or invalid 'overallMatch' in match-test.", parsed);
             // Don't necessarily throw error, might still have feedback
         }
    } catch (e) {
        console.error("Failed to parse OpenAI JSON response in match-test:", resultText, e);
        throw new Error('Kunne ikke tolke svar fra AI.');
    }

    // Return only the match and feedback
    return NextResponse.json({ 
        matchPercentage: analysisResultJson.overallMatch,
        feedback: analysisResultJson.overallFeedback
     }, { status: 200 });

  } catch (error) {
    console.error('Error in /api/match-test:', error);
    // Return a generic error message to the client
    return NextResponse.json({ error: error instanceof Error ? error.message : 'An unexpected error occurred.' }, { status: 500 });
  }
} 