// src/app/api/seeker/analysis-results/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Adjust path
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET handler to fetch all analysis results for the logged-in seeker
export async function GET(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Autentisering påkrevd.' }, { status: 401 });
    }
    const userId = session.user.id;

    console.log(`[API List] Fetching analysis results for user: ${userId}`);

    // 2. Fetch Analysis Results from Database for this user
    // We filter where jobBatchId is null to get only seeker-initiated analyses
    const analysisResults = await prisma.analysisResult.findMany({
      where: {
        userId: userId,
        jobBatchId: null // Important: Only fetch results created by the seeker via /my-jobs
      },
      // Select only the summary fields needed for the list view
      select: {
        id: true,
        jobTitle: true,
        matchPercentage: true,
        seekerStatus: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc', // Show newest first
      },
    });

    console.log(`[API List] Found ${analysisResults.length} analysis results for user ${userId}`);

    // 3. Return Success Response
    return NextResponse.json(analysisResults, { status: 200 });

  } catch (error: any) {
    console.error(`[API List] Error fetching analysis results: ${error.message}`, { error });
    return NextResponse.json({ error: `Kunne ikke hente analyseresultater: ${error.message || 'En intern feil oppstod.'}` }, { status: 500 });
  }
}