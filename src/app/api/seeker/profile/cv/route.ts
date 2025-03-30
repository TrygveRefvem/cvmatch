// src/app/api/seeker/profile/cv/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Adjust path as necessary
import { PrismaClient } from '@prisma/client';
import { Buffer } from 'buffer';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Define Structure for CV JSON ---
interface CvContactInfo {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    linkedin?: string;
    website?: string;
}

interface CvExperience {
    jobTitle?: string;
    company?: string;
    location?: string;
    startDate?: string;
    endDate?: string; // Or 'Present'
    description?: string; // Preferably Markdown list
}

interface CvEducation {
    degree?: string;
    institution?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
}

interface CvData {
    contactInfo?: CvContactInfo;
    summary?: string;
    skills?: string[];
    experience?: CvExperience[];
    education?: CvEducation[];
    languages?: string[];
    // Add other potential sections like projects, certifications, etc.
}

// --- Helper: Text Extraction Function (Simplified from add-candidate) ---
async function extractCvText(cvFile: File): Promise<string> {
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
            console.warn(`Unsupported CV file type: ${cvFile.type}. Attempting plain text extraction.`);
            // Fallback attempt for unknown types
            rawCvText = Buffer.from(cvBuffer).toString('utf-8');
        }
    } catch (parsingError: any) {
        console.error(`Error parsing CV file (${cvFile.type}):`, parsingError);
        throw new Error(`Kunne ikke hente ut tekst fra CV-fil (${cvFile.type}): ${parsingError.message || 'Ukjent parsefeil'}`);
    }

    if (!rawCvText) {
        throw new Error('Kunne ikke hente ut tekst fra CV-filen etter parsing.');
    }
     // Basic sanitization - remove null characters which can cause DB issues
    return rawCvText.replace(/\0/g, '');
}


// --- API Route Handler (POST) ---
export async function POST(request: NextRequest) {
    try {
        // 1. Authentication
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Autentisering påkrevd.' }, { status: 401 });
        }
        const userId = session.user.id;

        // 2. Get File from Form Data
        const formData = await request.formData();
        const cvFile = formData.get('cvFile') as File;

        if (!cvFile || typeof cvFile.size === 'undefined') {
            console.error('Validation failed: cvFile is missing or not a valid File object.', cvFile);
            return NextResponse.json({ error: 'Mangler påkrevd felt: cvFile.' }, { status: 400 });
        }

        console.log(`Processing CV upload for user ${userId}: ${cvFile.name}, Type: ${cvFile.type}`);

        // 3. Extract Text
        const extractedCvText = await extractCvText(cvFile);
        if (!extractedCvText) { // Double check after extraction
             throw new Error('Klarte ikke å hente ut tekst fra filen.');
        }

        // --- 3b. Convert Extracted Text to Markdown (for fallback/simple display) ---
        let markdownCvText = extractedCvText;
        try {
            console.log(`Converting extracted CV text to Markdown for user ${userId}...`);
            const mdConversionPrompt = `
Konverter følgende rå CV-tekst til godt strukturert GitHub Flavored Markdown (GFM).
Vær nøye med å identifisere og bruke passende Markdown-elementer:
- Bruk #, ##, ### for hovedoverskrifter og seksjonstitler (f.eks. navn, Sammendrag, Erfaring, Utdanning, Ferdigheter, Språk, Kontakt).
- Bruk * eller - for punktlister der det er naturlig (f.eks. under ferdigheter, ansvarsområder i en jobb).
- Formater avsnitt korrekt med et tomt linjeskift mellom dem for å skape <p> tags.
- Prøv å bevare viktige linjeskift innenfor logiske blokker (f.eks. i kontaktinformasjon eller under en jobbeskrivelse).
- Gjør linker klikkbare med standard Markdown-syntaks [tekst](URL).

Målet er å gjøre CV-en lesbar og visuelt tiltalende når den rendres fra Markdown.

Rå CV-tekst:
\`\`\`
${extractedCvText}
\`\`\`

Returner KUN den konverterte Markdown-teksten, uten noen introduksjon, forklaring eller ekstra kommentarer.
`;

            const mdResponse = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: mdConversionPrompt }],
                temperature: 0.2,
            });

            const mdResult = mdResponse.choices[0]?.message?.content;
            if (mdResult) {
                markdownCvText = mdResult.trim();
                console.log(`Successfully converted CV text to Markdown for user ${userId}.`);
            } else {
                console.warn(`LLM Markdown conversion returned empty content for user ${userId}.`);
            }
        } catch (llmError: any) {
            console.error(`Error during LLM Markdown conversion for user ${userId}: ${llmError.message}.`);
        }

        // --- 3c. Parse Extracted Text into Structured JSON ---
        let structuredCvJson: CvData | null = null;
        try {
            console.log(`Parsing extracted CV text into JSON for user ${userId}...`);
            const jsonParsingPrompt = `
Analyser følgende rå CV-tekst og returner en strukturert JSON-representasjon.
Bruk følgende struktur der det er mulig (utelat felt hvis informasjonen ikke finnes):

{
  "contactInfo": { "name": string, "address": string, "phone": string, "email": string, "linkedin": string, "website": string },
  "summary": string,
  "skills": string[],
  "experience": [ { "jobTitle": string, "company": string, "location": string, "startDate": string, "endDate": string, "description": string } ],
  "education": [ { "degree": string, "institution": string, "location": string, "startDate": string, "endDate": string, "description": string } ],
  "languages": string[]
}

- Prøv å trekke ut start/slutt-datoer for erfaring/utdanning (måned/år eller år er OK).
- For beskrivelser under erfaring/utdanning, behold gjerne punktslister hvis de finnes.

Rå CV-tekst:
\`\`\`
${extractedCvText}
\`\`\`

Returner KUN gyldig JSON, ingen annen tekst, introduksjon eller kommentarer.
`;

            const jsonResponse = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: jsonParsingPrompt }],
                response_format: { type: "json_object" },
                temperature: 0.1,
            });

            const jsonResult = jsonResponse.choices[0]?.message?.content;
            if (jsonResult) {
                try {
                    structuredCvJson = JSON.parse(jsonResult) as CvData;
                    console.log(`Successfully parsed CV text to JSON for user ${userId}.`);
                } catch (parseError) {
                    console.error(`Failed to parse JSON response from LLM for user ${userId}: ${parseError}`, jsonResult);
                    // Keep structuredCvJson as null
                }
            } else {
                console.warn(`LLM JSON parsing returned empty content for user ${userId}.`);
            }
        } catch (llmError: any) {
            console.error(`Error during LLM JSON parsing for user ${userId}: ${llmError.message}.`, llmError);
            // Keep structuredCvJson as null
        }
        // --- End JSON Parsing ---

        // 4. Save to Database (Upsert Profile with BOTH Markdown and JSON)
        const profile = await prisma.jobSeekerProfile.upsert({
            where: { userId: userId },
            update: {
                cvText: markdownCvText, // Save the markdown version (fallback)
                structuredCvJson: structuredCvJson || undefined, // Save the structured JSON (or undefined if null)
            },
            create: {
                userId: userId,
                cvText: markdownCvText,
                structuredCvJson: structuredCvJson || undefined,
            },
            select: {
                 cvText: true,
                 structuredCvJson: true
             }
        });

        console.log(`Successfully updated/created JobSeekerProfile for user ${userId} with Markdown and JSON CV.`);

        // 5. Return Success Response (with BOTH formats)
        return NextResponse.json({
             success: true,
             message: 'CV lastet opp, formatert og parset!', // Updated message
             cvText: profile.cvText, // Return markdown text
             structuredCvJson: profile.structuredCvJson // Return structured JSON
         }, { status: 200 });

    } catch (error: any) {
        console.error(`Error uploading CV for user: ${error.message}`, { error });
        return NextResponse.json({ error: `Opplasting feilet: ${error.message || 'En intern feil oppstod.'}` }, { status: 500 });
    }
}

// --- API Route Handler (GET) ---
export async function GET(request: NextRequest) {
    try {
        // 1. Authentication
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Autentisering påkrevd.' }, { status: 401 });
        }
        const userId = session.user.id;

        console.log(`Fetching JobSeekerProfile for user ${userId}`);

        // 2. Fetch Profile including structured JSON
        const profile = await prisma.jobSeekerProfile.findUnique({
            where: { userId: userId },
            select: {
                cvText: true,           // Markdown text
                structuredCvJson: true, // Structured JSON data
                updatedAt: true         // Last update time
            }
        });

        if (!profile) {
            console.log(`No JobSeekerProfile found for user ${userId}`);
            return NextResponse.json({ profile: null }, { status: 200 }); 
        }

        console.log(`Found JobSeekerProfile for user ${userId}, last updated: ${profile.updatedAt}`);

        // 3. Return Profile Data (including JSON)
        return NextResponse.json({ 
            profile: { 
                ...profile, 
                // Ensure JSON is parsed if it's stored as a string (depends on DB/Prisma version)
                // If Prisma handles JSON type correctly, this parsing might not be needed.
                structuredCvJson: profile.structuredCvJson ? JSON.parse(JSON.stringify(profile.structuredCvJson)) : null
            }
        }, { status: 200 });

    } catch (error: any) {
        console.error(`Error fetching profile for user: ${error.message}`, { error });
        return NextResponse.json({ error: `Kunne ikke hente profil: ${error.message || 'En intern feil oppstod.'}` }, { status: 500 });
    }
} 