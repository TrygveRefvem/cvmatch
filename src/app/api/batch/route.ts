import { NextRequest, NextResponse } from 'next/server';
import getOpenAIClient from '@/lib/openai-client';

// Maksimal lengde for CV og stillingsannonse (omtrentlig antall tegn)
const MAX_CV_LENGTH = 10000;
const MAX_JOB_LENGTH = 5000;

// Funksjon for å forkorte tekst til maksimal lengde
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  // Behold starten og slutten av teksten, kutt i midten
  const halfLength = Math.floor(maxLength / 2);
  return text.substring(0, halfLength) + 
    "\n...[tekst forkortet for analyse]...\n" + 
    text.substring(text.length - halfLength);
}

export async function POST(request: NextRequest) {
  try {
    // Hent data fra forespørselen
    const data = await request.json();
    const { cvs, jobSource } = data;
    
    // Sjekk at nødvendige data er tilgjengelig
    if (!cvs || !Array.isArray(cvs) || cvs.length === 0) {
      return NextResponse.json(
        { error: 'Ingen CV-er ble sendt med forespørselen' },
        { status: 400 }
      );
    }
    
    if (!jobSource.text && !jobSource.url) {
      return NextResponse.json(
        { error: 'Stillingsannonse mangler' },
        { status: 400 }
      );
    }
    
    // Hent jobbtekst fra URL hvis nødvendig
    let jobText = jobSource.text;
    if (!jobText && jobSource.url) {
      try {
        const response = await fetch(jobSource.url);
        if (!response.ok) {
          throw new Error('Kunne ikke hente stillingsannonse fra URL');
        }
        jobText = await response.text();
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error('Feil ved henting av stillingsannonse:', error.message);
        }
        return NextResponse.json(
          { error: 'Kunne ikke hente stillingsannonse fra URL' },
          { status: 400 }
        );
      }
    }
    
    // Forkort jobbtekst for å unngå token-begrensninger
    const truncatedJobText = truncateText(jobText, MAX_JOB_LENGTH);
    
    // Analyser hver CV
    const results = [];
    let successfulAnalyses = 0;
    let failedAnalyses = 0;
    
    for (const cv of cvs) {
      try {
        // Forkort CV-tekst
        const truncatedCvText = truncateText(cv.text, MAX_CV_LENGTH);
        
        // Analyser CV og stillingsannonse
        const analysisResult = await analyzeCvAndJob(truncatedCvText, truncatedJobText);
        
        results.push({
          name: cv.name,
          analysis: analysisResult
        });
        
        successfulAnalyses++;
      } catch (error: unknown) {
        console.error(`Feil ved analyse av CV ${cv.name}:`, error);
        if (error instanceof Error) {
          console.error('Feilmelding:', error.message);
          console.error('Stack trace:', error.stack);
        }
        results.push({
          name: cv.name,
          error: error instanceof Error ? error.message : 'Kunne ikke analysere CV-en'
        });
        failedAnalyses++;
      }
    }
    
    return NextResponse.json({
      totalProcessed: cvs.length,
      successfulAnalyses,
      failedAnalyses,
      results
    });
    
  } catch (error: unknown) {
    console.error('Error processing batch request:', error);
    return NextResponse.json(
      { error: 'Det oppstod en feil under behandlingen av forespørselen' },
      { status: 500 }
    );
  }
}

// Implementasjon av CV-analyse funksjon med OpenAI
async function analyzeCvAndJob(cvText: string, jobText: string) {
  try {
    console.log('Starter OpenAI-analyse...');
    console.log('CV-tekst lengde:', cvText.length);
    console.log('Jobb-tekst lengde:', jobText.length);
    
    // Get the OpenAI client from our modular configuration
    const openai = getOpenAIClient();
    
    // Bruk OpenAI for analyse
    console.log('Sender forespørsel til OpenAI...');
    const response = await openai.chat.completions.create({
      model: "o3-mini",
      messages: [
        {
          role: "system",
          content: `Du er en erfaren rekrutteringsekspert. Analyser CV mot stillingsannonse og returner et JSON-objekt.
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
  "companyName": string, // Firmanavn fra annonsen
  "categories": [
    {
      "name": string,    // Kategori (f.eks. "Teknisk kompetanse", "Erfaring", etc.)
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
  "feedback": string[]      // Generelle tilbakemeldinger og anbefalinger
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
1. Formelle krav og utdanning
2. Teknisk kompetanse og ferdigheter
3. Arbeidserfaring og ansiennitet
4. Personlige egenskaper
5. Ledererfaring
6. Bransjeerfaring
7. Språkkunnskaper
8. Prestasjoner og resultater

VIKTIG: 
- Analyser stillingskravene GRUNDIG
- Identifiser ALLE obligatoriske og ønskelige kvalifikasjoner
- Gi en detaljert vurdering av hvert krav
- Returner KUN JSON, ingen annen tekst`
        }
      ]
    });

    console.log('Mottok respons fra OpenAI');
    console.log('Respons type:', typeof response.choices[0].message.content);
    console.log('Respons lengde:', response.choices[0].message.content?.length);
    console.log('Rå respons:', response.choices[0].message.content);
    
    // Hent og parse JSON-responsen
    const content = response.choices[0].message.content;
    if (!content) {
      console.error('Ingen innhold i responsen fra OpenAI');
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
        throw new Error('Kunne ikke finne gyldig JSON i responsen');
      }
      
      const isolatedJson = jsonContent.substring(jsonStart, jsonEnd);
      const parsed = JSON.parse(isolatedJson);
      console.log('Parset JSON:', parsed);
      return parsed;
    } catch (error) {
      console.error('Feil ved parsing av JSON-respons:', error);
      console.error('Respons som ikke kunne parses:', content);
      console.error('Feil type:', error instanceof Error ? error.message : 'Ukjent feiltype');
      
      // Returner et standardfeilobjekt i stedet for å kaste feil
      return {
        overallMatch: 0,
        jobTitle: '',
        companyName: '',
        categories: [],
        feedback: ['Kunne ikke analysere CV-en. Vennligst sjekk at både CV og stillingsannonse er gyldige.'],
        strengths: [],
        weaknesses: []
      };
    }
  } catch (error: unknown) {
    console.error('Feil ved OpenAI API-kall:', error);
    
    if (error instanceof Error) {
      console.error('Feilmelding:', error.message);
      console.error('Stack trace:', error.stack);
      
      // Hvis feilen er relatert til token-begrensning, returner en mer spesifikk feilmelding
      if (error.toString().includes('context_length_exceeded') || 
          error.toString().includes('maximum context length')) {
        throw new Error('CV-en eller stillingsannonsen er for lang for analyse. Prøv med en kortere tekst.');
      }
      
      // Hvis feilen er relatert til API-nøkkel eller autentisering
      if (error.toString().includes('401') || 
          error.toString().includes('unauthorized') ||
          error.toString().includes('invalid api key')) {
        throw new Error('Ugyldig eller manglende OpenAI API-nøkkel');
      }
    }
    
    // Ellers kast den opprinnelige feilen
    throw error;
  }
} 