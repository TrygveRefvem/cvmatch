import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import * as cheerio from 'cheerio';
import getOpenAIClient from '@/lib/openai-client';
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Initialiser OpenAI-klienten med API-nøkkelen fra miljøvariabler
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_BASE_URL,
  defaultQuery: { "api-version": "2023-05-15" }
});

// Maksimal lengde for CV og stillingsannonse (omtrentlig antall tegn)
const MAX_CV_LENGTH = 10000;
const MAX_JOB_LENGTH = 8000;

// Helper function to check user access (trial or subscription)
async function checkUserAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { trialEndsAt: true, stripeSubscriptionStatus: true },
  });

  if (!user) return false; // User not found

  const now = new Date();
  const hasActiveTrial = user.trialEndsAt ? user.trialEndsAt > now : false;
  const hasActiveSubscription = user.stripeSubscriptionStatus === 'active';

  console.log(`Access check for user ${userId}: Trial ends=${user.trialEndsAt}, Active trial=${hasActiveTrial}, Sub status=${user.stripeSubscriptionStatus}, Active sub=${hasActiveSubscription}`);

  return hasActiveTrial || hasActiveSubscription;
}

export async function GET() {
  try {
    const models = await openai.models.list();
    return NextResponse.json(models);
  } catch (error) {
    console.error('Feil ved henting av modeller:', error);
    return NextResponse.json(
      { error: 'Kunne ikke hente tilgjengelige modeller' },
      { status: 500 }
    );
  }
}

// Funksjon for å forkorte tekst til maksimal lengde
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  // Behold starten og slutten av teksten, kutt i midten
  const halfLength = Math.floor(maxLength / 2);
  return text.substring(0, halfLength) + 
    "\n...[tekst forkortet for analyse]...\n" + 
    text.substring(text.length - halfLength);
}

// Funksjon for å ekstrahere tekst fra HTML
function extractTextFromHtml(html: string): string {
  const $ = cheerio.load(html);
  
  // Fjern uønskede elementer
  $('script').remove();
  $('style').remove();
  $('nav').remove();
  $('header').remove();
  $('footer').remove();
  
  // Finn hovedinnholdet (stillingsannonsen)
  let jobText = '';
  
  // Prøv å finne spesifikke elementer som ofte inneholder stillingsannonsen
  const mainContent = $('.job-description, .position-body, .vacancy-text, article, main, .content-main').first();
  
  if (mainContent.length > 0) {
    jobText = mainContent.text();
  } else {
    // Hvis ingen spesifikke elementer ble funnet, bruk body
    jobText = $('body').text();
  }
  
  // Rens teksten
  return jobText
    .replace(/\\s+/g, ' ')
    .replace(/\\n+/g, '\n')
    .trim();
}

export async function POST(request: NextRequest) {
  // --- Authentication & Access Check --- 
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    console.log('Unauthorized attempt (no session or user ID) to access /api/analyze');
    return NextResponse.json({ error: 'Autentisering påkrevd' }, { status: 401 });
  }

  const userId = session.user.id;
  const hasAccess = await checkUserAccess(userId);

  if (!hasAccess) {
    console.log(`Access denied for user ${userId} (no active trial or subscription)`);
    return NextResponse.json(
      { 
        error: 'Tilgang nektet. Din prøveperiode kan ha utløpt, eller du har ingen aktivt abonnement.',
        // Add info to potentially guide user to subscribe
        needsSubscription: true, 
      },
      { status: 402 } // 402 Payment Required
    );
  }

  console.log(`Analysis request received from authenticated user: ${session.user?.email} (Access granted)`);
  // --- End Authentication & Access Check ---

  try {
    console.log('Starter analyse av CV');
    console.log('OpenAI API Key:', process.env.OPENAI_API_KEY ? 'Er satt' : 'Mangler');
    
    // Hent data fra forespørselen
    const data = await request.json();
    const { cvText, jobSource } = data;
    
    // Sjekk at nødvendige data er tilgjengelig
    if (!cvText) {
      return NextResponse.json(
        { error: 'CV-tekst mangler' },
        { status: 400 }
      );
    }
    
    if (!jobSource.text && !jobSource.url) {
      return NextResponse.json(
        { error: 'Stillingsannonse mangler' },
        { status: 400 }
      );
    }
    
    // Bruk jobSource.text hvis tilgjengelig, ellers jobSource.url
    let jobText = jobSource.text;
    if (!jobText && jobSource.url) {
      try {
        console.log('Prøver å hente stillingsannonse fra URL:', jobSource.url);
        const response = await fetch(jobSource.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Kunne ikke hente stillingsannonse fra URL: ${response.status} ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        console.log('Content-Type:', contentType);
        
        if (contentType?.includes('application/pdf')) {
          console.warn('PDF job descriptions are not supported yet.');
          jobText = 'Stillingsannonse er en PDF (ikke støttet ennå).'; 
        } else {
          // Håndter HTML og tekst
          const rawText = await response.text();
          jobText = contentType?.includes('html') ? extractTextFromHtml(rawText) : rawText;
          console.log('Hentet stillingsannonse, lengde:', jobText.length);
          if (!jobText) {
             console.warn('Could not extract text from fetched URL content.');
             jobText = 'Kunne ikke hente tekst fra stillingsannonse URL.';
          }
        }
      } catch (error: unknown) {
        const errorMessage = `Kunne ikke hente eller behandle stillingsannonse fra URL: ${error instanceof Error ? error.message : 'Ukjent feil'}`;
        console.error('Feil ved henting av stillingsannonse:', errorMessage);
        return NextResponse.json({ error: errorMessage, analysisResult: null }, { status: 400 });
      }
    }
    
    if (!jobText) {
      return NextResponse.json({ error: 'Kunne ikke hente eller finne tekst for stillingsannonse' }, { status: 400 });
    }
    
    // Forkort tekstene for å unngå token-begrensninger
    const truncatedCvText = truncateText(cvText, MAX_CV_LENGTH);
    const truncatedJobText = truncateText(jobText, MAX_JOB_LENGTH);
    
    // Analyser CV og stillingsannonse med OpenAI
    const analysisResult = await analyzeCvAndJob(truncatedCvText, truncatedJobText);
    
    // Check if analysis itself resulted in an error
    if (analysisResult?.error) {
      // Consider not saving if the analysis itself errored?
      return NextResponse.json({ error: analysisResult.error, analysisResult: null }, { status: 500 });
    }

    // --- Save successful analysis result to database --- 
    if (analysisResult && userId) {
        try {
            console.log(`Attempting to save analysis result for user ${userId}`);
            // Extract data - ensure types match schema (e.g., overallMatch is number)
            const percentage = typeof analysisResult.overallMatch === 'number' ? analysisResult.overallMatch : null;
            const title = typeof analysisResult.jobTitle === 'string' ? analysisResult.jobTitle : null;
            
            await prisma.analysisResult.create({
                data: {
                    userId: userId,
                    jobDescriptionUrl: jobSource.url || null, // Save URL if it was provided
                    jobTitle: title, // Extracted title
                    matchPercentage: percentage, // Extracted percentage
                    resultJson: analysisResult, // Store the full result object
                },
            });
            console.log(`Successfully saved analysis result for user ${userId}`);
        } catch (dbError) {
            // Log the error but don't block the response to the user
            console.error(`Failed to save analysis result for user ${userId}:`, dbError);
        }
    }
    // --- End Save analysis result --- 

    // Return the analysis result to the frontend
    return NextResponse.json({ analysisResult });
  } catch (error) {
    console.error('Error analyzing CV:', error);
    let errorMessage = 'Det oppstod en feil under analysen';
    
    if (error instanceof Error) {
      if (error.message.includes('Unsupported parameter')) {
        errorMessage = 'Teknisk feil: Ikke-støttet parameter i API-kall';
      } else if (error.message.includes('Invalid parameter')) {
        errorMessage = 'Teknisk feil: Ugyldig parameter i API-kall';
      } else if (error.message.includes('parse')) {
        errorMessage = 'Kunne ikke tolke analyseresultatet';
      }
      console.error('Detaljert feilmelding:', error.message);
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// Implementasjon av CV-analyse funksjon med OpenAI
async function analyzeCvAndJob(cvText: string, jobText: string) {
  try {
    console.log('Starter analyse med følgende parametre:');
    console.log('CV lengde:', cvText.length);
    console.log('Jobb lengde:', jobText.length);
    console.log('Bruker modell: o3-mini');
    
    // Get the OpenAI client from our modular configuration
    const openai = getOpenAIClient();
    
    // Bruk OpenAI for analyse
    const response = await openai.chat.completions.create({
      model: "o3-mini",
      messages: [
        {
          role: "system",
          content: `Du er en erfaren rekrutteringsekspert. Analyser CV mot stillingsannonse og returner et JSON-objekt.
VIKTIG: Alle numeriske verdier MÅ være tall, ikke tekst. For eksempel: 75 ikke "seventy-five".

Returner JSON med følgende struktur:
{
  "overallMatch": number, // 0-100, må være tall
  "jobTitle": string,    // Stillingstittel fra annonsen
  "companyName": string, // Firmanavn fra annonsen
  "categories": [
    {
      "name": string,    // Kategori (f.eks. "Teknisk kompetanse", "Erfaring", etc.)
      "match": number,   // 0-100, må være tall
      "details": [
        {
          "name": string,      // Spesifikk kompetanse/krav
          "match": number,     // 0-100, må være tall
          "required": boolean, // true/false
          "reasoning": string  // Kort begrunnelse
        }
      ]
    }
  ],
  "strengths": string[],    // Liste over kandidatens styrker
  "weaknesses": string[],   // Liste over mangler/svakheter
  "feedback": string[]      // Generelle tilbakemeldinger
}`
        },
        {
          role: "user",
          content: `Analyser følgende CV mot stillingsannonsen og returner JSON.
VIKTIG: Alle numeriske verdier (match, overallMatch) MÅ være tall (f.eks. 75), ikke tekst ("seventy-five").

CV:
${cvText}

STILLINGSANNONSE:
${jobText}

Vurder:
1. Formelle krav
2. Teknisk kompetanse
3. Erfaring
4. Personlige egenskaper
5. Ledererfaring
6. Bransjeerfaring
7. Språk
8. Prestasjoner

VIKTIG: 
- Returner KUN JSON, ingen annen tekst
- Bruk tall for alle numeriske verdier (75, ikke "seventy-five")`
        }
      ]
    });

    console.log('Mottok respons fra OpenAI');
    
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Ingen respons fra OpenAI');
    }

    try {
      // Prøv å finne JSON i responsen hvis den er innkapslet i markdown
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      const jsonContent = jsonMatch ? jsonMatch[1] : content;
      
      // Prøv å finne første { og siste } for å isolere JSON
      const jsonStart = jsonContent.indexOf('{');
      const jsonEnd = jsonContent.lastIndexOf('}') + 1;
      
      if (jsonStart === -1 || jsonEnd === 0) {
        console.error('Kunne ikke finne gyldig JSON i responsen');
        console.error('Rå respons:', content);
        return {
          overallMatch: 0,
          jobTitle: 'Ukjent',
          companyName: 'Ukjent',
          categories: [],
          feedback: ['Kunne ikke analysere CV-en. Prøv igjen eller kontakt support hvis problemet vedvarer.'],
          strengths: [],
          weaknesses: []
        };
      }
      
      const isolatedJson = jsonContent.substring(jsonStart, jsonEnd);
      const parsed = JSON.parse(isolatedJson);
      return parsed;
    } catch (error) {
      console.error('Feil ved parsing av JSON-respons:', error);
      console.error('Respons som ikke kunne parses:', content);
      return {
        overallMatch: 0,
        jobTitle: 'Ukjent',
        companyName: 'Ukjent',
        categories: [],
        feedback: ['En teknisk feil oppstod under analysen. Prøv igjen eller kontakt support hvis problemet vedvarer.'],
        strengths: [],
        weaknesses: []
      };
    }
  } catch (error: unknown) {
    console.error('Feil ved OpenAI API-kall:', error);
    throw error;
  }
} 