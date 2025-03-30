import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import OpenAI from 'openai';
import { Buffer } from 'buffer';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

// --- Configuration & Clients ---
const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_CV_LENGTH = 10000;
const MAX_JOB_LENGTH = 8000;

// --- Helper Functions (Similar to add-candidate) ---

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const halfLength = Math.floor(maxLength / 2);
  return text.substring(0, halfLength) +
    "\n...[tekst forkortet for analyse]...\n" +
    text.substring(text.length - halfLength);
}

function generatePlaceholderPassword(length = 16): string {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        password += charset.charAt(Math.floor(Math.random() * n));
    }
    return password;
}

// --- CORS Headers --- Set headers for allowing requests from any origin
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow any origin
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Allow POST and OPTIONS methods
  'Access-Control-Allow-Headers': 'Content-Type', // Allow Content-Type header
};

// --- OPTIONS Handler (for CORS preflight) ---
export async function OPTIONS(request: NextRequest) {
  // Respond successfully to OPTIONS requests with CORS headers
  // Browsers send OPTIONS request first to check if the actual POST request is allowed
  console.log("Widget API: Handling OPTIONS request");
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// --- POST Handler --- Main logic for widget submission
export async function POST(request: NextRequest) {
  let candidateUserId: string | null = null;
  let batchId: string | null = null;

  try {
    // 1. Parse Form Data
    const formData = await request.formData();
    const widgetToken = formData.get('widgetToken') as string;
    const candidateEmail = formData.get('candidateEmail') as string;
    const cvFile = formData.get('cvFile') as File;

    console.log("Widget API Received POST - Token:", widgetToken);
    console.log("Widget API Received POST - Candidate Email:", candidateEmail);
    console.log("Widget API Received POST - CV File:", cvFile ? `Name: ${cvFile.name}, Size: ${cvFile.size}, Type: ${cvFile.type}` : "null");

    // 2. Validate Input
    if (!widgetToken) {
      return NextResponse.json({ error: 'Mangler påkrevd identifikator (token).' }, { status: 400, headers: corsHeaders });
    }
    if (!candidateEmail || typeof candidateEmail !== 'string' || !/\S+@\S+\.\S+/.test(candidateEmail)) {
      return NextResponse.json({ error: 'Mangler eller ugyldig e-postadresse.' }, { status: 400, headers: corsHeaders });
    }
    if (!cvFile || typeof cvFile.size === 'undefined') { // Check if it's a valid File object
      console.error('Widget API Validation failed: cvFile is missing or not a valid File object.', cvFile);
      return NextResponse.json({ error: 'Mangler påkrevd CV-fil.' }, { status: 400, headers: corsHeaders });
    }

    // 3. Find Job Batch using Widget Token
    const batch = await prisma.jobBatch.findUnique({
      where: { widgetToken },
      select: { // Select only necessary fields
          id: true,
          // userId: true, // Not strictly needed for analysis itself, but good for context/logging maybe
          title: true,
          jobDescriptionText: true,
          jobDescriptionUrl: true // Needed for saving in analysis
      }
    });

    if (!batch) {
      console.error(`Widget API: Invalid or unknown widgetToken provided: ${widgetToken}`);
      return NextResponse.json({ error: 'Ugyldig eller ukjent batch-identifikator.' }, { status: 404, headers: corsHeaders });
    }
    batchId = batch.id; // Set batchId for logging purposes

    // Check if JD text exists (critical for analysis)
    if (!batch.jobDescriptionText) {
        console.error(`Widget API: Batch ${batch.id} (Token: ${widgetToken}) is missing jobDescriptionText. Cannot proceed with analysis.`);
        // Return 500 as this is an internal setup issue, not the candidate's fault
        return NextResponse.json({ error: 'Batchens stillingsannonse-tekst mangler internt. Kan ikke analysere.' }, { status: 500, headers: corsHeaders });
    }

    // 4. Find or Create Candidate User
    let candidateUser = await prisma.user.findUnique({ where: { email: candidateEmail }, select: { id: true } });
    if (!candidateUser) {
      const placeholderPassword = generatePlaceholderPassword();
      const hashedPassword = await bcrypt.hash(placeholderPassword, 10);
      try {
          candidateUser = await prisma.user.create({
            data: {
              email: candidateEmail,
              name: candidateEmail.split('@')[0], // Use part of email as placeholder name
              hashedPassword: hashedPassword,
              role: 'CANDIDATE', // Candidates added via widget are always CANDIDATE role
            },
            select: { id: true }
          });
          console.log(`Widget API: Created placeholder user for candidate: ${candidateEmail} with ID: ${candidateUser.id}`);
      } catch (error: any) {
          // Handle potential unique constraint violation if email registered between find and create
          if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
             console.warn(`Widget API: Race condition creating user for ${candidateEmail}. Fetching existing.`);
             candidateUser = await prisma.user.findUnique({ where: { email: candidateEmail }, select: { id: true } });
             if (!candidateUser) {
                console.error(`Widget API: Failed to retrieve user ${candidateEmail} even after race condition catch.`);
                throw new Error("Failed to retrieve user after race condition."); // Should not happen
             }
             console.log(`Widget API: Found existing user ${candidateEmail} with ID: ${candidateUser.id} after race condition.`);
          } else {
              console.error(`Widget API: Error creating user ${candidateEmail}:`, error);
              throw error; // Re-throw other DB errors
          }
      }
    } else {
        console.log(`Widget API: Found existing user ${candidateEmail} with ID: ${candidateUser.id}`);
    }

    // Ensure we have a user ID now
    if (!candidateUser?.id) {
         console.error(`Widget API: Failed to obtain candidate user ID for email ${candidateEmail}.`);
         throw new Error("Failed to find or create candidate user.");
    }
    candidateUserId = candidateUser.id;

    // 5. Process CV (PDF/DOCX/TXT support)
    console.log(`Widget API: Processing CV file: ${cvFile.name}, Type: ${cvFile.type} for user ${candidateUserId}`);
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
        // Fallback attempt for unknown types - might garble binary files
        console.warn(`Widget API: Unsupported CV file type: ${cvFile.type}. Attempting plain text extraction.`);
        rawCvText = Buffer.from(cvBuffer).toString('utf-8'); // Best effort
      }
    } catch (parsingError: any) {
        console.error(`Widget API: Error parsing CV file (${cvFile.name}, Type: ${cvFile.type}) for user ${candidateUserId}:`, parsingError);
        // Let the user know their file might be the issue, include type
        return NextResponse.json({ error: `Kunne ikke hente ut tekst fra din CV-fil (${cvFile.type}). Filen kan være skadet eller i et format som ikke støttes.` }, { status: 400, headers: corsHeaders });
    }

    if (!rawCvText || rawCvText.trim() === '') {
        console.error(`Widget API: Could not extract text from CV file ${cvFile.name} for user ${candidateUserId}.`);
        return NextResponse.json({ error: `Kunne ikke hente ut tekst fra din CV-fil (${cvFile.name}). Vennligst sjekk filen.` }, { status: 400, headers: corsHeaders });
    }
    const cvText = truncateText(rawCvText, MAX_CV_LENGTH);
    console.log(`Widget API: Extracted CV text (truncated length: ${cvText.length}) for user ${candidateUserId}`);

    // 6. Prepare Job Description Text and Title from Batch
    // JD text should exist based on earlier check
    const jobDescriptionText = truncateText(batch.jobDescriptionText!, MAX_JOB_LENGTH);
    const jobTitle = batch.title;
    console.log(`Widget API: Using Job Title "${jobTitle}" and JD Text (truncated length: ${jobDescriptionText.length}) from batch ${batch.id}`);


    // 7. Run OpenAI Analysis (Using detailed prompt structure)
    console.log(`Widget API: Starting OpenAI analysis for user ${candidateUserId} against batch ${batch.id}`);
    // Reusing the same detailed prompt as in add-candidate/feedback
    const promptSystem = `Du er en erfaren rekrutteringsekspert. Analyser CV mot stillingsannonse og returner et JSON-objekt.\nVIKTIG: Alle numeriske verdier MÅ være tall, ikke tekst. For eksempel: 75 ikke \"seventy-five\".\n\nANALYSE AV JOBBKRAV:\n1. Analyser stillingsannonsen GRUNDIG og identifiser ALLE krav og ønskede kvalifikasjoner.\n2. Skill tydelig mellom obligatoriske krav (required=true) og ønskelige kvalifikasjoner (required=false).\n3. Kategoriser kravene i passende kategorier (f.eks. \"Teknisk kompetanse\", \"Erfaring\", \"Utdanning\").\n4. For hvert krav, vurder hvor godt CV-en oppfyller dette kravet og gi en detaljert begrunnelse.\n\nReturner JSON med følgende struktur:\n{\n  \"overallMatch\": number, // 0-100, må være tall\n  \"jobTitle\": string,    // Stillingstittel fra annonsen\n  \"companyName\": string, // Firmanavn fra annonsen (hvis funnet)\n  \"categories\": [\n    {\n      \"name\": string,    // Kategori (f.eks. \"Teknisk kompetanse\")\n      \"match\": number,   // 0-100, må være tall\n      \"details\": [\n        {\n          \"name\": string,      // Spesifikk kompetanse/krav\n          \"match\": number,     // 0-100, må være tall\n          \"required\": boolean, // true hvis obligatorisk, false hvis ønskelig\n          \"reasoning\": string  // Detaljert begrunnelse for match-score\n        }\n      ]\n    }\n  ],\n  \"strengths\": string[],    // Liste over kandidatens styrker relatert til stillingen\n  \"weaknesses\": string[],   // Liste over mangler/svakheter relatert til stillingen\n  \"feedback\": string[]      // Generelle tilbakemeldinger og anbefalinger (maks 2-3 setninger totalt)\n}`;

    const promptUser = `Analyser følgende CV mot stillingsannonsen og returner JSON i henhold til systeminstruksjonene.\nVIKTIG: Alle numeriske verdier (match, overallMatch) MÅ være tall (f.eks. 75), ikke tekst (\"seventy-five\").\n\nCV:\n${cvText}\n\nSTILLINGSANNONSE:\n${jobDescriptionText}\n\nVurder spesielt:\n1. Formelle krav og utdanning\n2. Teknisk kompetanse og ferdigheter\n3. Arbeidserfaring og ansiennitet\n4. Personlige egenskaper nevnt\n5. Eventuell ledererfaring\n6. Bransjeerfaring\n7. Språkkunnskaper\n8. Nevnte prestasjoner og resultater\n\nVIKTIG: Returner KUN JSON, ingen introduksjon, konklusjon eller annen tekst utenfor JSON-strukturen.`;

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Or your preferred model for analysis
        messages: [
            { role: "system", content: promptSystem },
            { role: "user", content: promptUser }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3, // Lower temp for more structured JSON output
    });

    const resultText = response.choices[0]?.message?.content;
    if (!resultText) {
        console.error(`Widget API: No response content from OpenAI for user ${candidateUserId}, batch ${batch.id}.`);
        throw new Error('Fikk ingen respons fra OpenAI analyse.');
    }
    console.log(`Widget API: Received OpenAI analysis raw response for user ${candidateUserId}`);

    let analysisResultJson: any;
    try {
        analysisResultJson = JSON.parse(resultText);
        // Basic validation of the parsed structure
        if (typeof analysisResultJson.overallMatch !== 'number') analysisResultJson.overallMatch = null;
        if (!Array.isArray(analysisResultJson.categories)) analysisResultJson.categories = [];
        if (!Array.isArray(analysisResultJson.strengths)) analysisResultJson.strengths = [];
        if (!Array.isArray(analysisResultJson.weaknesses)) analysisResultJson.weaknesses = [];
        if (!Array.isArray(analysisResultJson.feedback)) analysisResultJson.feedback = [];
        console.log(`Widget API: Successfully parsed OpenAI JSON for user ${candidateUserId}. Overall Match: ${analysisResultJson.overallMatch}`);
    } catch (e) {
        console.error(`Widget API: Failed to parse OpenAI JSON response for user ${candidateUserId}, batch ${batch.id}. Response: ${resultText}`, e);
        throw new Error('Kunne ikke tolke JSON-svar fra OpenAI analysen.');
    }

    // 8. Save Analysis Result to Database
    console.log(`Widget API: Saving analysis for user ${candidateUserId} to batch ${batch.id}`);
    // Sanitize strings to remove null characters before saving (important!)
    const nullCharRegex = /\0/g;
    const sanitizedCvText = cvText?.replace(nullCharRegex, '') || null;
    const sanitizedJobDescriptionText = jobDescriptionText?.replace(nullCharRegex, '') || null;
    const sanitizedFeedback = analysisResultJson.feedback?.map((f: string) => f?.replace(nullCharRegex, '') || '') || [];
    const sanitizedStrengths = analysisResultJson.strengths?.map((s: string) => s?.replace(nullCharRegex, '') || '') || [];
    const sanitizedWeaknesses = analysisResultJson.weaknesses?.map((w: string) => w?.replace(nullCharRegex, '') || '') || [];

    const savedAnalysis = await prisma.analysisResult.create({
      data: {
        userId: candidateUserId,
        jobBatchId: batch.id,
        jobTitle: analysisResultJson.jobTitle?.replace(nullCharRegex, '') || jobTitle?.replace(nullCharRegex, '') || 'Ukjent Tittel',
        jobDescriptionUrl: batch.jobDescriptionUrl, // Save the batch's JD URL
        cvText: sanitizedCvText, // Store the processed CV text
        jobDescriptionText: sanitizedJobDescriptionText, // Store the processed JD text
        resultJson: analysisResultJson, // Store the full structured JSON from OpenAI
        matchPercentage: analysisResultJson.overallMatch, // Store the overall match percentage
        // Assuming schema TEXT fields for arrays, stringify the sanitized arrays
        feedback: JSON.stringify(sanitizedFeedback),
        strengths: JSON.stringify(sanitizedStrengths),
        areasForImprovement: JSON.stringify(sanitizedWeaknesses), // Map weaknesses to this field
      },
    });
    console.log(`Widget API: Analysis saved successfully with ID: ${savedAnalysis.id} for user ${candidateUserId}, batch ${batch.id}`);

    // 9. Return Success Response (Simple confirmation for the widget)
    // The widget usually just needs to know if it worked or not.
    return NextResponse.json({ success: true, message: 'Søknad mottatt og sendt til analyse.' }, { status: 201, headers: corsHeaders });

  } catch (error: any) {
    console.error(`Widget API Error: ${error.message || 'Unknown error'}`, { candidateUserId, batchId, error });
    // Return error response with CORS headers so the widget's fetch doesn't fail on CORS
    return NextResponse.json({ error: `Kunne ikke behandle søknad: ${error.message || 'En intern feil oppstod.'}` }, { status: 500, headers: corsHeaders });
  }
}