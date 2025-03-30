// src/app/api/seeker/analysis-results/[analysisId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Adjust path
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RouteContext {
  params: {
    analysisId: string;
  };
}

// GET handler for fetching details of a SINGLE analysis result
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Autentisering påkrevd.' }, { status: 401 });
    }
    const userId = session.user.id;

    // 2. Get analysisId from URL parameters
    const { analysisId } = context.params;
    if (!analysisId) {
      return NextResponse.json({ error: 'Mangler analysisId i URL.' }, { status: 400 });
    }

    console.log(`[API Detail] Fetching analysis details for ID: ${analysisId}, User: ${userId}`);

    // 3. Fetch Analysis Result from Database
    const analysisResult = await prisma.analysisResult.findUnique({
      where: { id: analysisId },
      // Select all relevant fields needed for the detail page
      select: {
        id: true,
        userId: true, // Needed for authorization check
        jobTitle: true,
        jobDescriptionUrl: true,
        matchPercentage: true,
        resultJson: true, // Keep this as Prisma.JsonValue or 'any'
        cvText: true,
        jobDescriptionText: true,
        feedback: true, // Stored as string
        strengths: true, // Stored as string
        areasForImprovement: true, // Stored as string
        seekerStatus: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    // 4. Validation and Authorization
    if (!analysisResult) {
      console.warn(`[API Detail] Analysis result not found: ${analysisId}`);
      return NextResponse.json({ error: 'Analyse ikke funnet.' }, { status: 404 });
    }

    // IMPORTANT: Ensure the logged-in user owns this analysis result
    if (analysisResult.userId !== userId) {
       console.warn(`[API Detail] Forbidden access attempt: User ${userId} tried to access analysis ${analysisId} owned by ${analysisResult.userId}`);
      return NextResponse.json({ error: 'Ikke tilgang til denne analysen.' }, { status: 403 });
    }

     console.log(`[API Detail] Authorization successful for analysis ${analysisId}`);

    // 5. Prepare Response Data (Parse JSON strings stored as TEXT)
    let parsedStrengths: string[] = [];
    let parsedAreasForImprovement: string[] = [];
    let parsedFeedback: string[] = [];

    try {
        if (analysisResult.strengths && typeof analysisResult.strengths === 'string' && analysisResult.strengths.trim() !== '') {
             parsedStrengths = JSON.parse(analysisResult.strengths);
        }
    } catch (e) { console.error(`[API Detail] Error parsing strengths for analysis ${analysisId}:`, e); }
    try {
         if (analysisResult.areasForImprovement && typeof analysisResult.areasForImprovement === 'string' && analysisResult.areasForImprovement.trim() !== '') {
            parsedAreasForImprovement = JSON.parse(analysisResult.areasForImprovement);
         }
    } catch (e) { console.error(`[API Detail] Error parsing areasForImprovement for analysis ${analysisId}:`, e); }
    try {
         if (analysisResult.feedback && typeof analysisResult.feedback === 'string' && analysisResult.feedback.trim() !== '') {
            parsedFeedback = JSON.parse(analysisResult.feedback);
         }
    } catch (e) { console.error(`[API Detail] Error parsing feedback for analysis ${analysisId}:`, e); }

    // Construct the final response object
    const responseData = {
      ...analysisResult,
      // Replace the stringified versions with the parsed arrays
      strengths: parsedStrengths,
      areasForImprovement: parsedAreasForImprovement,
      feedback: parsedFeedback,
      // resultJson remains as is (Prisma handles the JSON database type)
    };

    // 6. Return Success Response
    console.log(`[API Detail] Successfully fetched and prepared analysis details for ID: ${analysisId}`);
    return NextResponse.json(responseData, { status: 200 });

  } catch (error: any) {
    console.error(`[API Detail] Error fetching analysis details: ${error.message}`, { error });
    return NextResponse.json({ error: `Kunne ikke hente analysedetaljer: ${error.message || 'En intern feil oppstod.'}` }, { status: 500 });
  }
}

// --- DELETE Handler --- 
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
      // 1. Authentication
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Autentisering påkrevd.' }, { status: 401 });
      }
      const userId = session.user.id;
  
      // 2. Get analysisId from URL parameters
      const { analysisId } = context.params;
      if (!analysisId) {
        return NextResponse.json({ error: 'Mangler analysisId i URL.' }, { status: 400 });
      }
  
      console.log(`[API Delete] Attempting to delete analysis ID: ${analysisId}, User: ${userId}`);
  
      // 3. Find the Analysis Result to verify ownership *before* deleting
      const analysisToDelete = await prisma.analysisResult.findUnique({ 
          where: { id: analysisId },
          select: { userId: true } // Only need userId for check
      });

      // 4. Validation and Authorization
      if (!analysisToDelete) {
        // Already gone or never existed - arguably not an error for DELETE
        console.warn(`[API Delete] Analysis result not found for deletion: ${analysisId}`);
        return NextResponse.json({ message: 'Analyse ikke funnet eller allerede slettet.' }, { status: 200 }); // Or 404 if preferred
      }
  
      if (analysisToDelete.userId !== userId) {
        console.warn(`[API Delete] Forbidden delete attempt: User ${userId} tried to delete analysis ${analysisId} owned by ${analysisToDelete.userId}`);
        return NextResponse.json({ error: 'Ikke tilgang til å slette denne analysen.' }, { status: 403 });
      }
      
      console.log(`[API Delete] Authorization successful for deleting analysis ${analysisId}`);

      // 5. Perform Deletion
      await prisma.analysisResult.delete({ 
          where: { id: analysisId } 
      });
  
      console.log(`[API Delete] Successfully deleted analysis ID: ${analysisId}`);
      
      // 6. Return Success Response
      return NextResponse.json({ success: true, message: 'Analyse slettet.' }, { status: 200 }); // Can also use 204 No Content
  
    } catch (error: any) {
      console.error(`[API Delete] Error deleting analysis: ${error.message}`, { error });
      return NextResponse.json({ error: `Kunne ikke slette analysen: ${error.message || 'En intern feil oppstod.'}` }, { status: 500 });
    }
  }