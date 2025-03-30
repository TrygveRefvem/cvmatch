import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';
// import { z } from 'zod'; // Remove Zod import again

const prisma = new PrismaClient();

// Remove Zod schema
// const ParamsSchema = z.object({
//   batchId: z.string().cuid() 
// });

// GET /api/recruit/batches/[batchId] - Fetch specific batch details for the owner
export async function GET(
  request: NextRequest,
  { params }: { params: { batchId: string } } // Keep standard signature
) {
  console.log("DEBUG: Raw params object received:", params);

  let batchId: string;
  try {
    // --- Workaround for receiving Promise as params --- 
    // Attempt to access batchId directly, even if params is a Promise
    // This relies on the observed behavior where the property exists on the Promise object
    const potentialBatchId = (params as any)?.batchId;

    if (typeof potentialBatchId !== 'string' || potentialBatchId.length === 0) {
        console.error("Failed to extract string batchId from params:", params);
        return NextResponse.json({ error: 'Invalid or missing batch ID in request parameters.' }, { status: 400 });
    }
    batchId = potentialBatchId; // Assign the extracted string ID
    console.log("DEBUG: Successfully extracted batchId:", batchId);
    // --- End Workaround ---

    // --- Proceed with the rest of the function using the extracted batchId ---

    // 1. Auth Checks
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'RECRUITER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const recruiterUserId = session.user.id;

    // 2. Fetch Batch Details
    const batch = await prisma.jobBatch.findUnique({
      where: {
        id: batchId, // Use the extracted batchId
        userId: recruiterUserId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        jobDescriptionUrl: true,
        widgetToken: true,
        createdAt: true,
        analysisResults: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
      }
    });

    // 3. Handle Not Found
    if (!batch) {
      return NextResponse.json({ error: 'Batch ikke funnet eller ikke tilgang.' }, { status: 404 });
    }

    // Ensure analysisResults is always an array
    const analysisResults = batch.analysisResults || [];
    type ResultWithUserAndJson = typeof analysisResults[number]; 

    // 4. Process results to add counts before sending
    const processedResults = analysisResults.map((result: ResultWithUserAndJson) => { 
        let strengthsCount = 0;
        let areasForImprovementCount = 0;
        let parsedJson: any = null; 
        try {
            if (result.resultJson && typeof result.resultJson === 'object') {
                parsedJson = result.resultJson;
            } else if (typeof result.resultJson === 'string') {
                parsedJson = JSON.parse(result.resultJson);
            }
            if (parsedJson) {
                if(typeof parsedJson.strengths === 'string') parsedJson.strengths = JSON.parse(parsedJson.strengths);
                if(typeof parsedJson.feedback === 'string') parsedJson.feedback = JSON.parse(parsedJson.feedback);
                if(typeof parsedJson.weaknesses === 'string') parsedJson.weaknesses = JSON.parse(parsedJson.weaknesses);
                strengthsCount = Array.isArray(parsedJson.strengths) ? parsedJson.strengths.length : 0;
                areasForImprovementCount = Array.isArray(parsedJson.weaknesses) ? parsedJson.weaknesses.length : 0;
            }
        } catch (e) {
            console.error(`Failed to parse JSON or count arrays for result ${result.id}`, e);
        }
        return {
            ...result,
            strengthsCount,
            areasForImprovementCount,
        };
    });

    const processedBatch = { ...batch, analysisResults: processedResults }; 

    // 5. Return the processed batch data
    return NextResponse.json(processedBatch);

  } catch (error) {
    const logBatchId = (params as any)?.batchId || 'unknown'; // Safely try to access for logging
    console.error(`Error fetching batch details for ID ${logBatchId}:`, error);
    return NextResponse.json({ error: 'Kunne ikke hente batch detaljer. En intern feil oppstod.' }, { status: 500 });
  }
}

// Potential future route handlers for this batch (PUT for update, DELETE)
// export async function PUT(...) { ... }
// export async function DELETE(...) { ... } 