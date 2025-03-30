import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai'; // Import OpenAI
// Removed email imports as we are not sending
// import { sendEmail } from '@/lib/email';
// import RejectionEmail from '@/components/emails/RejectionEmail';
// import React from 'react';

const prisma = new PrismaClient();
// Initialize OpenAI client (ensure API key is available)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// This route now fetches data for previewing the rejection email
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  // 1. Auth Checks
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'RECRUITER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const recruiterUserId = session.user.id;
  const recruiterName = session.user.name; // Still useful for preview signature

  try {
    // 2. Parse Request Body
    // Only need analysisResultId to fetch data
    const { analysisResultId } = await request.json();
    if (!analysisResultId) {
      return NextResponse.json({ error: 'Missing analysisResultId' }, { status: 400 });
    }

    // 3. Fetch Data & Verify Ownership
    const analysisResult = await prisma.analysisResult.findUnique({
      where: { id: analysisResultId },
      select: {
          id: true,
          rejectionSentAt: true,
          resultJson: true, 
          user: {
              select: { email: true, name: true }
          },
          jobBatch: {
              select: { userId: true, title: true }
          },
      }
    });

    // 4. Authorization and Validation Checks
    if (!analysisResult) {
      return NextResponse.json({ error: 'Analysis result not found' }, { status: 404 });
    }
    if (!analysisResult.jobBatch || analysisResult.jobBatch.userId !== recruiterUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!analysisResult.user?.email) {
      return NextResponse.json({ error: 'Candidate email not found' }, { status: 400 });
    }
    // Removed check for analysisResult.rejectionSentAt

    // 5. Prepare Data for Preview, including baseFeedback
    const candidateEmail = analysisResult.user.email;
    const candidateName = analysisResult.user.name;
    const jobTitle = analysisResult.jobBatch.title;
    
    // Default feedback if LLM generation fails
    let baseFeedback = "Etter en nøye gjennomgang av din profil og kvalifikasjoner, har vi valgt å gå videre med andre kandidater denne gangen."; 
    
    // --- LLM Call to Generate Feedback Text ---
    try {
        let strengths: string[] = [];
        let weaknesses: string[] = [];
        let overallMatch: number | null = null;

        // Attempt to parse key points from the original analysis JSON
        if (analysisResult.resultJson && typeof analysisResult.resultJson === 'object') {
            const jsonData = analysisResult.resultJson as any;
            overallMatch = typeof jsonData.overallMatch === 'number' ? jsonData.overallMatch : null;
            if (Array.isArray(jsonData.strengths)) {
                strengths = jsonData.strengths.filter((s: any): s is string => typeof s === 'string' && s.trim().length > 0).slice(0, 2);
            }
            if (Array.isArray(jsonData.weaknesses)) {
                weaknesses = jsonData.weaknesses.filter((w: any): w is string => typeof w === 'string' && w.trim().length > 0).slice(0, 2);
            }
        }

        // Only call LLM if we have some analysis data
        if (overallMatch !== null || strengths.length > 0 || weaknesses.length > 0) {
            const feedbackPrompt = `
            Skriv et kort (ca. 2-4 setninger), profesjonelt og *empatisk* avsnitt for en avslags-epost til en jobbsøker for stillingen '${jobTitle}'.
            Tonen skal være respektfull, konstruktiv og oppmuntrende, selv om det er et avslag.

            Bruk følgende analyse som grunnlag:
            - Identifiserte styrker: ${strengths.length > 0 ? strengths.join('; ') : 'Ingen spesifikke styrker fremhevet i analysen'}
            - Områder der andre kandidater matchet bedre (basert på analyserte svakheter): ${weaknesses.length > 0 ? weaknesses.join('; ') : 'Ingen spesifikke områder fremhevet i analysen'}
            
            Instruksjoner for utforming av avsnittet:
            1.  **Anerkjennelse:** Etter en innledende takk (som håndteres utenfor dette avsnittet), anerkjenn *kort* 1-2 av de identifiserte styrkene på en positiv måte. Eksempel: "Vi satte spesielt pris på å se din erfaring med [styrke 1]..."
            2.  **Overgang:** Lag en *myk overgang* fra styrkene til begrunnelsen for avslaget. Unngå brå skifter.
            3.  **Begrunnelse:** Forklar *kort og respektfullt* at valget falt på andre kandidater som hadde en profil som samsvarte enda tettere med noen av de sentrale kravene for rollen, og referer *forsiktig* til 1-2 av områdene der andre matchet bedre. Eksempel: "...men i denne omgang prioriterte vi kandidater med mer direkte erfaring innen [område 1]." Unngå å liste alle svakheter.
            4.  **Avslutning:** Avslutt med en *oppmuntrende og høflig* setning, gjerne integrert i flyten. Eksempel: "Vi ønsker deg uansett lykke til videre."
            5.  **Format:** Returner KUN selve avsnittet som én enkelt tekststreng – ingen introduksjon, hilsen, emnelinje eller annen tekst utenfor selve avsnittet. Sørg for at setningene henger naturlig sammen.
            `;

            console.log("Generating feedback with refined LLM prompt for analysis:", analysisResultId);
            const feedbackResponse = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: feedbackPrompt }],
                temperature: 0.6, // Slightly higher temp for more natural language
                max_tokens: 150, 
            });

            const generatedText = feedbackResponse.choices[0]?.message?.content;
            
            if (generatedText) {
                baseFeedback = generatedText.trim(); 
                console.log("LLM Generated Feedback:", baseFeedback);
            } else {
                 console.warn("LLM feedback generation produced empty content.");
            }
        } else {
             console.log("Skipping LLM feedback generation due to missing analysis data.");
        }

    } catch (llmError) {
        console.error("Error during LLM feedback generation:", llmError);
        // Keep the default baseFeedback if LLM call fails
    }
    // --- End LLM Feedback Generation ---

    // 6. Return Data for Frontend Preview
    return NextResponse.json({
        success: true,
        previewData: {
            candidateEmail,
            candidateName,
            jobTitle,
            recruiterName,
            baseFeedback, // Use the generated (or default) feedback
        }
     }, { status: 200 });

  } catch (error) {
    console.error('Error fetching feedback preview data:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 