import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Zod schema for validating the request body
const CompareSchema = z.object({
  batchId: z.string().cuid(),
  analysisIds: z.array(z.string().cuid()).min(2), // Require at least 2 candidates to compare
});

// Expected JSON structure from LLM
interface ComparisonResultJson {
  ranking: { candidateId: string; name: string; rank: number }[];
  reasoning: string;
  candidates: { 
    candidateId: string; 
    name: string;
    keyStrengths: string[]; 
    keyWeaknesses: string[];
  }[];
}

// Helper to truncate text (consider moving to a lib)
function truncateText(text: string | null | undefined, maxLength: number): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  const halfLength = Math.floor(maxLength / 2);
  return text.substring(0, halfLength) + 
    "\n...[tekst forkortet]...\n" + 
    text.substring(text.length - halfLength);
}

// POST /api/recruit/analysis/compare - Compare multiple candidates for a batch
export async function POST(request: NextRequest) {
  console.log("POST request received for candidate comparison (JSON format)");
  
  try {
    // 1. Authenticate and authorize the user (must be recruiter)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'RECRUITER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const recruiterUserId = session.user.id;
    console.log(`Recruiter authenticated: ${recruiterUserId}`);

    // 2. Validate request body
    let validatedData: z.infer<typeof CompareSchema>;
    try {
      const body = await request.json();
      validatedData = CompareSchema.parse(body);
      console.log(`Comparison request validated for batch ${validatedData.batchId}, candidates: ${validatedData.analysisIds.join(', ')}`);
    } catch (error) {
      console.error("Invalid request body for comparison:", error);
      return NextResponse.json({ error: 'Invalid request body', details: (error as any).errors }, { status: 400 });
    }
    const { batchId, analysisIds } = validatedData;

    // 3. Verify ownership and fetch Job Description Text
    const jobBatch = await prisma.jobBatch.findUnique({
      where: {
        id: batchId,
        userId: recruiterUserId, // Verify ownership
      },
      select: {
        id: true,
        title: true,
        jobDescriptionText: true,
      }
    });

    if (!jobBatch) {
      return NextResponse.json({ error: 'Batch not found or access denied.' }, { status: 404 });
    }
    if (!jobBatch.jobDescriptionText) {
        return NextResponse.json({ error: 'Job description text is missing for this batch.' }, { status: 400 });
    }
    const jobDescriptionText = truncateText(jobBatch.jobDescriptionText, 6000); // Truncate JD
    console.log(`Fetched job description for batch ${batchId}`);

    // 4. Fetch Analysis Results for the specified candidates
    const analyses = await prisma.analysisResult.findMany({
      where: {
        id: { in: analysisIds },
        jobBatchId: batchId, // Ensure they belong to the correct batch
      },
      select: {
        id: true,
        cvText: true, // Include CV text
        resultJson: true, // Include structured results if available
        user: { select: { id: true, name: true, email: true } } // Include basic user info for identification
      }
    });

    if (analyses.length !== analysisIds.length) {
      console.warn(`Mismatch in requested analysis IDs (${analysisIds.length}) and found analyses (${analyses.length}) for batch ${batchId}`);
      // Decide how to handle this: error out, or proceed with found ones?
      // Let's proceed with the ones found, but this indicates a potential frontend issue.
      if (analyses.length < 2) {
          return NextResponse.json({ error: 'Could not find at least two valid analysis results to compare for this batch.' }, { status: 400 });
      }
    }
    console.log(`Fetched ${analyses.length} analysis results for comparison.`);

    // 5. Construct the Prompt for OpenAI (requesting JSON)
    let candidateSummaries = "";
    const candidateInfoForPrompt = analyses.map((analysis, index) => {
      const candidateName = analysis.user?.name || analysis.user?.email || `Kandidat ${index + 1}`;
      const cvSummary = truncateText(analysis.cvText, 3000); // Truncate CV text
      let strengths = "(Ikke tilgjengelig)";
      let weaknesses = "(Ikke tilgjengelig)";
      try {
          if(analysis.resultJson && typeof analysis.resultJson === 'object' && analysis.resultJson !== null) {
              const parsed = analysis.resultJson as any;
              if (Array.isArray(parsed.strengths)) strengths = parsed.strengths.join(", ");
              if (Array.isArray(parsed.weaknesses)) weaknesses = parsed.weaknesses.join(", ");
          }
      } catch (e) { /* ignore parsing error */ }
      
      candidateSummaries += `--- Kandidat ${index + 1} (ID: ${analysis.id}) ---\n`;
      candidateSummaries += `Navn: ${candidateName}\n`;
      candidateSummaries += `Oppsummering fra CV:\n${cvSummary}\n`;
      candidateSummaries += `Identifiserte Styrker (fra analyse): ${strengths}\n`;
      candidateSummaries += `Identifiserte Svakheter (fra analyse): ${weaknesses}\n\n`;
      
      return { id: analysis.id, name: candidateName };
    });

    const promptSystem = `Du er en erfaren rekrutteringsekspert. Din oppgave er å objektivt sammenligne ${analyses.length} kandidater for en spesifikk stilling basert på stillingsannonsen og deres CV-oppsummeringer/analysedata.
Returner KUN et JSON-objekt med følgende struktur:
{
  "ranking": [{ "candidateId": "string", "name": "string", "rank": number }],
  "reasoning": "string (kort begrunnelse for rangering)",
  "candidates": [
    {
      "candidateId": "string",
      "name": "string",
      "keyStrengths": ["string (1-3 nøkkelstyrker relatert til stillingen)"],
      "keyWeaknesses": ["string (1-3 nøkkelsvakheter relatert til stillingen)"]
    }
  ]
}
Pass på at candidateId i JSON-svaret matcher ID-ene fra KANDIDATINFORMASJON nedenfor. Ranger fra 1 (best) til ${analyses.length}.`;

    const promptUser = `Sammenlign følgende ${analyses.length} kandidater for stillingen "${jobBatch.title}".

STILLINGSANNONSE:
${jobDescriptionText}

KANDIDATINFORMASJON:
${candidateSummaries}

Returner KUN et gyldig JSON-objekt som beskrevet i system-prompten. Ikke inkluder noe annet tekst eller markdown.`;

    // 6. Call OpenAI API (requesting JSON format)
    console.log("Sending comparison request to OpenAI (expecting JSON)...");
    const response = await openai.chat.completions.create({
        model: "o3-mini", // Use o3-mini model (or gpt-4o-mini if o3 fails)
        messages: [
            { role: "system", content: promptSystem },
            { role: "user", content: promptUser }
        ],
        response_format: { type: "json_object" }, // Request JSON output
        max_completion_tokens: 1500, // Use max_completion_tokens instead of max_tokens
    });

    const comparisonResultContent = response.choices[0]?.message?.content;
    if (!comparisonResultContent) {
        throw new Error('Fikk ingen JSON-respons fra OpenAI.');
    }

    // 7. Parse the JSON response
    let comparisonJson: ComparisonResultJson;
    try {
      comparisonJson = JSON.parse(comparisonResultContent);
      // TODO: Add validation here to ensure the structure matches ComparisonResultJson type
      console.log("Successfully parsed JSON comparison result from OpenAI.");
    } catch (e) {
      console.error("Failed to parse JSON response from OpenAI:", comparisonResultContent, e);
      throw new Error('Kunne ikke tolke JSON-svar fra OpenAI.');
    }

    // 8. Return the structured comparison result
    return NextResponse.json(comparisonJson, { status: 200 });

  } catch (error) {
    console.error("Error during candidate comparison:", error);
    // Check for specific OpenAI errors if needed
    if (error instanceof OpenAI.APIError) {
        return NextResponse.json({ error: `OpenAI API Error: ${error.status} ${error.name}`, details: error.message }, { status: error.status || 500 });
    }
    return NextResponse.json({ error: 'Could not perform comparison. An internal error occurred.' }, { status: 500 });
  }
} 