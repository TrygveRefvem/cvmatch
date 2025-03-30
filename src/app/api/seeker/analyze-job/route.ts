// src/app/api/seeker/analyze-job/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Adjust path if necessary
import { PrismaClient, JobApplicationStatus } from '@prisma/client';
import OpenAI from 'openai';
import * as cheerio from 'cheerio'; // Import cheerio for helper

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_CV_LENGTH = 10000;
const MAX_JOB_LENGTH = 8000;

// --- Helper Function: fetchAndExtractJobText (Copied from /api/recruit/batches/route.ts) ---
// (Consider moving this to a shared lib/utils folder later)
function extractTextFromHtml(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, nav, header, footer').remove();
  const mainContent = $('.job-description, .position-body, .vacancy-text, article, main, .content-main').first();
  let jobText = mainContent.length > 0 ? mainContent.text() : $('body').text();
  return jobText.replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim();
}
async function fetchAndExtractJobText(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CVMatchBot/1.0; +http://YOUR_DOMAIN/bot)' } // Identify your bot
    });
    if (!response.ok) {
      throw new Error(`Kunne ikke hente URL (${response.status})`);
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/pdf')) {
      // You might want to handle PDF job ads differently or block them
      throw new Error('PDF stillingsannonser støttes ikke direkte for analyse via URL ennå.');
    }
    const rawText = await response.text();
    const extractedText = contentType.includes('html') ? extractTextFromHtml(rawText) : rawText;
    if (!extractedText) {
        throw new Error('Kunne ikke hente ut relevant tekst fra URLen.');
    }
    return extractedText;
  } catch (error) {
    console.error("fetchAndExtractJobText Error:", error);
    throw new Error(`Feil ved henting/lesing av stillingsannonse: ${error instanceof Error ? error.message : 'Ukjent feil'}`);
  }
}
// --- End Helper ---

// --- Helper: truncateText ---
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const halfLength = Math.floor(maxLength / 2);
  return text.substring(0, halfLength) +
    "\n...[tekst forkortet for analyse]...\n" +
    text.substring(text.length - halfLength);
}
// --- End Helper ---


export async function POST(request: NextRequest) {
    try {
        // 1. Authentication
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Autentisering påkrevd.' }, { status: 401 });
        }
        const userId = session.user.id;

        // 2. Get Job URL from request body
        const { jobUrl } = await request.json();
        if (!jobUrl || typeof jobUrl !== 'string') {
            return NextResponse.json({ error: 'Mangler eller ugyldig jobUrl.' }, { status: 400 });
        }
        try { new URL(jobUrl); } catch (_) {
            return NextResponse.json({ error: 'Ugyldig URL-format for jobUrl.' }, { status: 400 });
        }

        console.log(`Received request to analyze job URL: ${jobUrl} for user ${userId}`);

        // 3. Get Seeker's Saved CV Text
        const seekerProfile = await prisma.jobSeekerProfile.findUnique({
            where: { userId: userId },
            select: { cvText: true } // Fetch the markdown/raw CV text
        });

        if (!seekerProfile?.cvText) {
            return NextResponse.json({ error: 'Ingen CV funnet for brukeren. Last opp en CV først via /my-cv.' }, { status: 400 });
        }
        const seekerCvText = seekerProfile.cvText; // This might be Markdown or raw

        // 4. Fetch and Extract Job Description Text
        console.log(`Fetching job description from URL: ${jobUrl}`);
        const jobDescriptionText = await fetchAndExtractJobText(jobUrl);
        console.log(`Fetched job description text, length: ${jobDescriptionText.length}`);

        // 5. Run OpenAI Analysis
        console.log(`Running OpenAI analysis for user ${userId} (CV) vs Job URL ${jobUrl}`);
        const truncatedCv = truncateText(seekerCvText, MAX_CV_LENGTH);
        const truncatedJob = truncateText(jobDescriptionText, MAX_JOB_LENGTH);

        // --- REFINED Prompt v3 for More Realistic Analysis & Category Reasoning ---
         const promptSystem = `Du er en **svært kritisk og detaljorientert** rekrutteringsekspert. Analyser CV mot stillingsannonse **realistisk** og returner et JSON-objekt. Vær **konservativ** i dine vurderinger.\nVIKTIG: Alle numeriske verdier MÅ være tall, ikke tekst. For eksempel: 75 ikke \"seventy-five\".\n\nEVALUERINGSPROSESS:\n1.  Analyser stillingsannonsen GRUNDIG. Identifiser ALLE krav og ønskede kvalifikasjoner.\n2.  Skill **tydelig** mellom obligatoriske krav (required=true) og ønskelige kvalifikasjoner (required=false).\n3.  For **hvert** krav/ønske, finn **konkret og direkte bevis** i CV-en. Ikke gjør antagelser.\n4.  Vurder **nivået** og **relevansen** av erfaring/kompetanse i CV-en opp mot det som etterspørres.\n5.  Sett match-score for detaljer (0-100) basert på **solid bevis**. Høye scorer (>80%) krever **sterkt og direkte bevis**. 100% krever **fullstendig og utvetydig** oppfyllelse.\n6.  **Kategorimatch:** Denne scoren **MÅ** reflektere scorene i \'details\'. Hvis et krav (\'required: true\') har lav score (< 50%), **kan ikke** kategoriscoren være høy (maks ~50-60%). Hvis et krav har 0%, bør kategoriscoren være tilsvarende lav (0-20%). For kategorier med kun ønsker (\'required: false\'), kan en gjennomsnittsbetraktning brukes mer liberalt.\n7.  **Kategoribegrunnelse (\`categoryReasoning\`):** Gi en **kort (1 setning) oppsummerende begrunnelse** for *hvorfor* kategorien fikk sin score, basert på funnene i detaljene. Forklar spesielt hvis kategoriscoren avviker fra en enkel gjennomsnittsberegning (f.eks. pga. et viktig krav som ikke er møtt).\n8.  **Totalmatch (\`overallMatch\`):** Baser denne på en **vektet vurdering** der oppfyllelse av obligatoriske krav teller **betydelig tyngre** enn ønsker.\n9.  **Detaljbegrunnelser (\`reasoning\`):** For *hver* detalj, gi en **konkret begrunnelse**. Hvis scoren er under 100%, forklar **presist** hva som mangler i CV-en eller hvorfor beviset er for svakt/indirekte.\n\nReturner JSON med følgende struktur (bruk KUN dobbeltfnutter for nøkler og strengverdier):\n{\n  \"overallMatch\": number,\n  \"jobTitle\": string,\n  \"companyName\": string | null,\n  \"categories\": [\n    {\n      \"name\": string,\n      \"match\": number, /* Score som reflekterer oppfyllelse av detaljene, spesielt krav */\n      \"categoryReasoning\": string, /* Kort (1 setning) begrunnelse for kategoriscoren */\n      \"details\": [\n        {\n          \"name\": string,\n          \"match\": number,\n          \"required\": boolean,\n          \"reasoning\": string\n        }\n      ]\n    }\n  ],\n  \"strengths\": string[],\n  \"weaknesses\": string[],\n  \"feedback\": string[]\n}`; // --- End REFINED Prompt v3 ---

         // promptUser remains the same
        const promptUser = `Analyser følgende CV mot stillingsannonsen og returner JSON i henhold til systeminstruksjonene.\nVIKTIG: Alle numeriske verdier (match, overallMatch) MÅ være tall (f.eks. 75), ikke tekst (\"seventy-five\").\n\nCV:\n${truncatedCv}\n\nSTILLINGSANNONSE:\n${truncatedJob}\n\nVurder spesielt:\n1. Formelle krav og utdanning\n2. Teknisk kompetanse og ferdigheter\n3. Arbeidserfaring og ansiennitet\n4. Personlige egenskaper nevnt\n5. Eventuell ledererfaring\n6. Bransjeerfaring\n7. Språkkunnskaper\n8. Nevnte prestasjoner og resultater\n\nVIKTIG: Returner KUN JSON, ingen introduksjon, konklusjon eller annen tekst utenfor JSON-strukturen.`;
        // --- End prompt ---

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Or your preferred analysis model
            messages: [
                { role: "system", content: promptSystem },
                { role: "user", content: promptUser }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
        });

        const resultText = response.choices[0]?.message?.content;
        if (!resultText) {
            throw new Error('Fikk ingen respons fra OpenAI analyse.');
        }

        let analysisResultJson: any;
        try {
            analysisResultJson = JSON.parse(resultText);
            // Basic validation
            if (typeof analysisResultJson.overallMatch !== 'number') analysisResultJson.overallMatch = null;
            // Add more validation as needed...
             console.log(`Successfully parsed OpenAI analysis JSON. Overall Match: ${analysisResultJson.overallMatch}`);
        } catch (e) {
            console.error("Failed to parse OpenAI JSON response:", resultText, e);
            throw new Error('Kunne ikke tolke JSON-svar fra OpenAI analyse.');
        }

        // 6. Save Analysis Result to Database
        console.log(`Saving analysis result for user ${userId}, job URL ${jobUrl}`);

         // --- Sanitize text fields before saving (similar to add-candidate) ---
        const nullCharRegex = /\0/g;
        const sanitizedCvText = seekerCvText?.replace(nullCharRegex, '') || null;
        const sanitizedJobDescriptionText = jobDescriptionText?.replace(nullCharRegex, '') || null;
        const sanitizedFeedback = analysisResultJson.feedback?.map((f: string) => f?.replace(nullCharRegex, '') || '') || [];
        const sanitizedStrengths = analysisResultJson.strengths?.map((s: string) => s?.replace(nullCharRegex, '') || '') || [];
        const sanitizedWeaknesses = analysisResultJson.weaknesses?.map((w: string) => w?.replace(nullCharRegex, '') || '') || [];
        // --- End Sanitization ---

        const savedAnalysis = await prisma.analysisResult.create({
            data: {
                userId: userId,
                jobBatchId: null, // No batch for seeker-initiated analyses
                jobTitle: analysisResultJson.jobTitle?.replace(nullCharRegex, '') || 'Ukjent Tittel',
                jobDescriptionUrl: jobUrl, // Save the URL used for analysis
                cvText: sanitizedCvText, // Save the seeker's CV text used
                jobDescriptionText: sanitizedJobDescriptionText, // Save the fetched JD text
                resultJson: analysisResultJson, // Store the full structured JSON
                matchPercentage: analysisResultJson.overallMatch,
                 // Save arrays as JSON strings (assuming TEXT fields in schema)
                feedback: JSON.stringify(sanitizedFeedback),
                strengths: JSON.stringify(sanitizedStrengths),
                areasForImprovement: JSON.stringify(sanitizedWeaknesses),
                seekerStatus: JobApplicationStatus.NOT_APPLIED, // Set initial seeker status
                status: null, // Recruiter status is null here
            },
            // Select data needed for the summary response
            select: {
                 id: true,
                 jobTitle: true,
                 matchPercentage: true,
                 seekerStatus: true,
                 createdAt: true
            }
        });
        console.log(`Analysis saved successfully: ${savedAnalysis.id}`);


        // 7. Return Success Response (with summary)
        return NextResponse.json({
             success: true,
             message: `Jobb analysert! Match: ${savedAnalysis.matchPercentage ?? '-'}%`,
             analysisSummary: savedAnalysis // Return the summary data for the list
         }, { status: 201 }); // 201 Created

    } catch (error: any) {
        console.error(`Error analyzing job URL for user: ${error.message}`, { error });
        return NextResponse.json({ error: `Analyse feilet: ${error.message || 'En intern feil oppstod.'}` }, { status: 500 });
    }
}
