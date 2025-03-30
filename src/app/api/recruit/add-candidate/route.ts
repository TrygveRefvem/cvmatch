import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';
import { Buffer } from 'buffer'; // Import Buffer for file processing
import pdf from 'pdf-parse'; // <-- Import pdf-parse
import mammoth from 'mammoth'; // <-- Import mammoth

// --- Configuration & Clients ---
const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_CV_LENGTH = 10000; 
const MAX_JOB_LENGTH = 8000;

// --- Helper Functions (Adapted from /api/analyze) ---

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const halfLength = Math.floor(maxLength / 2);
  return text.substring(0, halfLength) + 
    "\n...[tekst forkortet for analyse]...\n" + 
    text.substring(text.length - halfLength);
}

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
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CVMatchBot/1.0; +http://YOUR_DOMAIN/bot)' } // Be a good bot citizen
    });
    if (!response.ok) {
      throw new Error(`Kunne ikke hente URL (${response.status})`);
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/pdf')) {
      throw new Error('PDF stillingsannonser støttes ikke ennå.');
    }
    const rawText = await response.text();
    const extractedText = contentType.includes('html') ? extractTextFromHtml(rawText) : rawText;
    if (!extractedText) {
        throw new Error('Kunne ikke hente ut tekst fra URLen.');
    }
    return extractedText;
  } catch (error) {
    console.error("fetchAndExtractJobText Error:", error);
    throw new Error(`Feil ved henting av stillingsannonse: ${error instanceof Error ? error.message : 'Ukjent feil'}`);
  }
}

// Placeholder function - replace with actual random password generation
function generatePlaceholderPassword(length = 16): string {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        password += charset.charAt(Math.floor(Math.random() * n));
    }
    // Ensure it meets basic complexity if needed, or just return random for placeholder
    return password;
}

// --- Main API Route Handler ---

export async function POST(request: NextRequest) {
  let candidateUserId: string | null = null;
  let batchId: string | null = null;

  try {
    // 1. Auth Checks
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'RECRUITER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const recruiterUserId = session.user.id;

    // 2. Parse Form Data
    const formData = await request.formData();
    batchId = formData.get('batchId') as string;
    const candidateEmail = formData.get('candidateEmail') as string;
    const cvFile = formData.get('cvFile') as File;

    // --- Add Logging --- 
    console.log("API Received - Batch ID:", batchId);
    console.log("API Received - Candidate Email:", candidateEmail);
    console.log("API Received - CV File:", cvFile ? `Name: ${cvFile.name}, Size: ${cvFile.size}, Type: ${cvFile.type}` : "null or undefined");
    // --- End Logging --- 

    // 3. Specific Validation
    if (!batchId) {
      return NextResponse.json({ error: 'Mangler påkrevd felt: batchId.' }, { status: 400 });
    }
    if (!candidateEmail || typeof candidateEmail !== 'string' || !/\S+@\S+\.\S+/.test(candidateEmail)) {
        return NextResponse.json({ error: 'Mangler eller ugyldig påkrevd felt: candidateEmail.' }, { status: 400 });
    }
    if (!cvFile || typeof cvFile.size === 'undefined') { // Check if it's a valid File object
        console.error('Validation failed: cvFile is missing or not a valid File object.', cvFile);
        return NextResponse.json({ error: 'Mangler påkrevd felt: cvFile.' }, { status: 400 });
    }
    // No need for URL validation here anymore

    // 4. Verify Batch Ownership & Get JD Text
    const batch = await prisma.jobBatch.findFirst({
      where: { id: batchId, userId: recruiterUserId },
      // Explicitly select the fields needed, including the ones causing type errors
      select: { 
          id: true, 
          title: true, 
          jobDescriptionText: true, 
          jobDescriptionUrl: true // Added explicit select for URL
      } 
    });
    if (!batch) {
      return NextResponse.json({ error: 'Batch ikke funnet eller ikke tilgang.' }, { status: 403 });
    }
    // Check if JD text exists (now should be correctly typed if select works)
    if (!batch.jobDescriptionText) {
        console.error(`Batch ${batchId} is missing jobDescriptionText.`);
        return NextResponse.json({ error: 'Batchens stillingsannonse-tekst mangler. Kan ikke analysere.' }, { status: 500 });
    }

    // 5. Find or Create Candidate User
    let candidateUser = await prisma.user.findUnique({ where: { email: candidateEmail }, select: { id: true } });
    if (!candidateUser) {
      const placeholderPassword = generatePlaceholderPassword();
      const hashedPassword = await bcrypt.hash(placeholderPassword, 10);
      try {
          candidateUser = await prisma.user.create({
            data: {
              email: candidateEmail,
              name: candidateEmail.split('@')[0],
              hashedPassword: hashedPassword,
              role: 'CANDIDATE',
            },
            select: { id: true }
          });
          console.log(`Created placeholder user for candidate: ${candidateEmail}`);
      } catch (error: any) {
          // Handle potential unique constraint violation if email registered between find and create
          if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
             console.warn(`Race condition: Email ${candidateEmail} registered after check. Fetching existing.`);
             candidateUser = await prisma.user.findUnique({ where: { email: candidateEmail }, select: { id: true } });
             if (!candidateUser) throw new Error("Failed to retrieve user after race condition."); // Should not happen
          } else {
              throw error; // Re-throw other DB errors
          }
      }
    }
    candidateUserId = candidateUser.id;

    // 6. Process CV (with PDF/DOCX support) and Job Description
    console.log(`Processing CV file: ${cvFile.name}, Type: ${cvFile.type}`);
    const cvBuffer = await cvFile.arrayBuffer();
    let rawCvText = '';

    try {
      if (cvFile.type === 'application/pdf') {
        const data = await pdf(Buffer.from(cvBuffer));
        rawCvText = data.text;
      } else if (cvFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const { value } = await mammoth.extractRawText({ buffer: Buffer.from(cvBuffer) });
        rawCvText = value;
      } else if (cvFile.type === 'text/plain') {
        rawCvText = Buffer.from(cvBuffer).toString('utf-8');
      } else {
        // Optional: Handle .doc (requires antiword or similar, often complex setup)
        // if (cvFile.type === 'application/msword') { ... }
        console.warn(`Unsupported CV file type: ${cvFile.type}. Attempting plain text extraction.`);
        // Fallback attempt for unknown types, might garble binary files
        rawCvText = Buffer.from(cvBuffer).toString('utf-8'); 
      }
    } catch (parsingError: any) {
        console.error(`Error parsing CV file (${cvFile.type}):`, parsingError);
        throw new Error(`Kunne ikke hente ut tekst fra CV-fil (${cvFile.type}): ${parsingError.message || 'Ukjent parsefeil'}`);
    }

    if (!rawCvText) {
        throw new Error('Kunne ikke hente ut tekst fra CV-filen etter parsing.');
    }
    const cvText = truncateText(rawCvText, MAX_CV_LENGTH);
    
    // Use JD text stored in the batch (should be typed correctly now)
    const jobDescriptionText = truncateText(batch.jobDescriptionText, MAX_JOB_LENGTH);
    const jobTitle = batch.title; 

    // 7. Run OpenAI Analysis (Using detailed prompt structure)
    console.log(`Running detailed OpenAI analysis for ${candidateEmail}`);
    const promptSystem = `Du er en erfaren rekrutteringsekspert. Analyser CV mot stillingsannonse og returner et JSON-objekt.
VIKTIG: Alle numeriske verdier MÅ være tall, ikke tekst. For eksempel: 75 ikke "seventy-five".

ANALYSE AV JOBBKRAV:
1. Analyser stillingsannonsen GRUNDIG og identifiser ALLE krav og ønskede kvalifikasjoner.
2. Skill tydelig mellom obligatoriske krav (required=true) og ønskelige kvalifikasjoner (required=false).
3. Kategoriser kravene i passende kategorier (f.eks. "Teknisk kompetanse", "Erfaring", "Utdanning").
4. For hvert krav, vurder hvor godt CV-en oppfyller dette kravet og gi en detaljert begrunnelse.

Returner JSON med følgende struktur:
{
  "overallMatch": number, // 0-100, må være tall
  "jobTitle": string,    // Stillingstittel fra annonsen
  "companyName": string, // Firmanavn fra annonsen (hvis funnet)
  "categories": [
    {
      "name": string,    // Kategori (f.eks. "Teknisk kompetanse")
      "match": number,   // 0-100, må være tall
      "details": [
        {
          "name": string,      // Spesifikk kompetanse/krav
          "match": number,     // 0-100, må være tall
          "required": boolean, // true hvis obligatorisk, false hvis ønskelig
          "reasoning": string  // Detaljert begrunnelse for match-score
        }
      ]
    }
  ],
  "strengths": string[],    // Liste over kandidatens styrker relatert til stillingen
  "weaknesses": string[],   // Liste over mangler/svakheter relatert til stillingen
  "feedback": string[]      // Generelle tilbakemeldinger og anbefalinger (maks 2-3 setninger totalt)
}`;

    const promptUser = `Analyser følgende CV mot stillingsannonsen og returner JSON i henhold til systeminstruksjonene.
VIKTIG: Alle numeriske verdier (match, overallMatch) MÅ være tall (f.eks. 75), ikke tekst ("seventy-five").

CV:
${cvText}

STILLINGSANNONSE:
${jobDescriptionText}

Vurder spesielt:
1. Formelle krav og utdanning
2. Teknisk kompetanse og ferdigheter
3. Arbeidserfaring og ansiennitet
4. Personlige egenskaper nevnt
5. Eventuell ledererfaring
6. Bransjeerfaring
7. Språkkunnskaper
8. Nevnte prestasjoner og resultater

VIKTIG: Returner KUN JSON, ingen introduksjon, konklusjon eller annen tekst utenfor JSON-strukturen.`;

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Using mini as it's often good enough for structured JSON
        messages: [
            { role: "system", content: promptSystem },
            { role: "user", content: promptUser }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3, // Lower temperature for more deterministic structured output
    });

    const resultText = response.choices[0]?.message?.content;
    if (!resultText) {
        throw new Error('Fikk ingen respons fra OpenAI.');
    }

    let analysisResultJson: any;
    try {
        // Attempt to parse directly, assuming OpenAI adheres to json_object format
        analysisResultJson = JSON.parse(resultText); 
        
        // Basic validation of the parsed structure
        if (typeof analysisResultJson.overallMatch !== 'number') {
            console.warn("OpenAI response missing or invalid 'overallMatch'. Setting to null.", analysisResultJson);
            analysisResultJson.overallMatch = null;
        }
        // Add more validation as needed for categories, details etc.
        if (!Array.isArray(analysisResultJson.categories)) analysisResultJson.categories = [];
        if (!Array.isArray(analysisResultJson.strengths)) analysisResultJson.strengths = [];
        if (!Array.isArray(analysisResultJson.weaknesses)) analysisResultJson.weaknesses = [];
        if (!Array.isArray(analysisResultJson.feedback)) analysisResultJson.feedback = [];

    } catch (e) {
        console.error("Failed to parse OpenAI JSON response:", resultText, e);
        throw new Error('Kunne ikke tolke JSON-svar fra OpenAI.');
    }

    // 8. Save Analysis Result to Database
    console.log(`Saving analysis for ${candidateEmail} to batch ${batchId}`);

    // --- Sanitize strings to remove null characters before saving ---
    const nullCharRegex = /\0/g; 
    const sanitizedCvText = cvText?.replace(nullCharRegex, '') || null;
    const sanitizedJobDescriptionText = jobDescriptionText?.replace(nullCharRegex, '') || null;
    // Note: Feedback is now an array of strings according to the new prompt
    const sanitizedFeedback = analysisResultJson.feedback?.map((f: string) => f.replace(nullCharRegex, '')) || [];
    const sanitizedStrengths = analysisResultJson.strengths?.map((s: string) => s.replace(nullCharRegex, '')) || [];
    const sanitizedWeaknesses = analysisResultJson.weaknesses?.map((w: string) => w.replace(nullCharRegex, '')) || []; 
    // Note: questionsToAsk is NOT part of the new prompt structure, removing it from save
    // const sanitizedQuestionsToAsk = ...
    // --- End Sanitization ---

    const savedAnalysis = await prisma.analysisResult.create({
      data: {
        userId: candidateUserId,
        jobBatchId: batchId,
        // Use title from JSON if available, otherwise batch title, sanitize
        jobTitle: analysisResultJson.jobTitle?.replace(nullCharRegex, '') || jobTitle?.replace(nullCharRegex, '') || 'Ukjent Tittel',
        jobDescriptionUrl: batch.jobDescriptionUrl, 
        cvText: sanitizedCvText, 
        jobDescriptionText: sanitizedJobDescriptionText, 
        resultJson: analysisResultJson, // Store the full, structured JSON
        matchPercentage: analysisResultJson.overallMatch,
        // Save arrays directly if schema supports it, otherwise stringify
        // Assuming schema TEXT fields for now, so stringify the sanitized arrays
        feedback: JSON.stringify(sanitizedFeedback),
        strengths: JSON.stringify(sanitizedStrengths),
        areasForImprovement: JSON.stringify(sanitizedWeaknesses), // Map weaknesses to areasForImprovement field
        // questionsToAsk: null, // Field removed from prompt/analysis
      },
    });
    console.log(`Analysis saved successfully: ${savedAnalysis.id}`);

    // 9. Return Success Response
    return NextResponse.json({ success: true, analysisId: savedAnalysis.id }, { status: 201 });

  } catch (error: any) {
    console.error(`Error adding candidate ${error.message ? error.message : 'Unknown error'}`, { candidateUserId, batchId, error });
    // Ensure password isn't leaked in error messages if user creation failed complexly
    return NextResponse.json({ error: `Kunne ikke legge til kandidat: ${error.message || 'En intern feil oppstod.'}` }, { status: 500 });
  }
} 