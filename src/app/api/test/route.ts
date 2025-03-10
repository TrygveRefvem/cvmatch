import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_BASE_URL,
  defaultQuery: { "api-version": "2023-05-15" }
});

export async function GET() {
  try {
    // Test-data
    const cvText = `Navn: Test Person
    Utdanning: Bachelor i Informatikk
    Erfaring: 5 år som utvikler
    Ferdigheter: JavaScript, React, Node.js
    Språk: Norsk, Engelsk`;

    const jobText = `Stilling: Senior Utvikler
    Krav:
    - Bachelor eller master i informatikk
    - Minst 3 års erfaring som utvikler
    - Erfaring med JavaScript og React
    - God kommunikasjonsevne på norsk og engelsk`;

    console.log('Starter test med følgende data:');
    console.log('CV:', cvText);
    console.log('Jobb:', jobText);

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `Du er en ekspert på rekruttering og CV-analyse. 
          Din oppgave er å analysere en CV mot en spesifikk stillingsannonse og gi en detaljert vurdering av matchgraden.
          
          VIKTIG: 
          1. Du MÅ alltid returnere et gyldig JSON-objekt, selv om du mangler informasjon.
          2. Hvis du mangler informasjon, sett match-prosentene til 0 og legg til en forklaring i feedback.
          3. Du MÅ returnere KUN JSON, ingen annen tekst eller forklaringer.
          4. Bruk følgende struktur for JSON-responsen:
          {
            "overallMatch": number,
            "categories": [
              {
                "name": string,
                "match": number,
                "details": [
                  {
                    "name": string,
                    "match": number,
                    "required": boolean,
                    "reasoning": string
                  }
                ]
              }
            ],
            "feedback": string[],
            "strengths": string[],
            "weaknesses": string[]
          }
          
          Hvis du mangler informasjon, returner et tomt objekt med denne strukturen og sett overallMatch til 0.
          
          VIKTIG: Du må returnere KUN JSON, ingen annen tekst eller forklaringer.`
        },
        {
          role: "user",
          content: `CV: ${cvText}\n\nStillingsannonse: ${jobText}`
        }
      ],
      temperature: 0.3
    });

    console.log('Mottok respons fra OpenAI');
    console.log('Respons type:', typeof response.choices[0].message.content);
    console.log('Respons lengde:', response.choices[0].message.content?.length);
    console.log('Rå respons:', response.choices[0].message.content);

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Ingen innhold i responsen fra OpenAI');
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
      
      return NextResponse.json({
        success: true,
        data: parsed
      });
    } catch (error) {
      console.error('Feil ved parsing av JSON-respons:', error);
      console.error('Respons som ikke kunne parses:', content);
      console.error('Feil type:', error instanceof Error ? error.message : 'Ukjent feiltype');
      
      return NextResponse.json({
        success: false,
        error: 'Kunne ikke parse responsen fra OpenAI som JSON',
        rawResponse: content
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Feil ved test:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Ukjent feil'
    }, { status: 500 });
  }
} 