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
    // If params is a Promise, await it
    const resolvedParams = params instanceof Promise ? await params : params;
    batchId = resolvedParams.batchId;

    if (typeof batchId !== 'string' || batchId.length === 0) {
        console.error("Failed to extract string batchId from params:", resolvedParams);
        return NextResponse.json({ error: 'Invalid or missing batch ID in request parameters.' }, { status: 400 });
    }
    
    console.log("DEBUG: Successfully extracted batchId:", batchId);

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
    let logBatchId = 'unknown';
    try {
      const resolvedParams = params instanceof Promise ? await params : params;
      logBatchId = resolvedParams.batchId || 'unknown';
    } catch (paramsError) {
      console.error('Error accessing batch ID for logging:', paramsError);
    }
    console.error(`Error fetching batch details for ID ${logBatchId}:`, error);
    return NextResponse.json({ error: 'Kunne ikke hente batch detaljer. En intern feil oppstod.' }, { status: 500 });
  }
}

// DELETE /api/recruit/batches/[batchId] - Delete a specific batch and its analyses for the owner
export async function DELETE(
  request: NextRequest,
  { params }: { params: { batchId: string } } // Keep standard signature
) {
  console.log("DELETE request received for params:", params);

  let batchId: string;
  try {
    // If params is a Promise, await it
    const resolvedParams = params instanceof Promise ? await params : params;
    batchId = resolvedParams.batchId;
    
    if (typeof batchId !== 'string' || batchId.length === 0) {
        console.error("DELETE: Failed to extract string batchId from params:", resolvedParams);
        return NextResponse.json({ error: 'Invalid or missing batch ID in request parameters.' }, { status: 400 });
    }
    
    console.log("DELETE: Successfully extracted batchId:", batchId);

    // 1. Auth Check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'RECRUITER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const recruiterUserId = session.user.id;

    // 2. Verify Ownership before Deleting
    const batchToDelete = await prisma.jobBatch.findFirst({
      where: {
        id: batchId,
        userId: recruiterUserId, // Check ownership
      },
      select: { id: true } // Only need ID to confirm existence and ownership
    });

    if (!batchToDelete) {
        return NextResponse.json({ error: 'Batch ikke funnet eller ikke tilgang for sletting.' }, { status: 404 });
    }

    // 3. Perform Deletion within a Transaction
    // Delete associated AnalysisResults first, then the JobBatch
    await prisma.$transaction(async (tx) => {
      await tx.analysisResult.deleteMany({
        where: { jobBatchId: batchId },
      });
      console.log(`Deleted analysis results for batch ${batchId}`);

      await tx.jobBatch.delete({
        where: { id: batchId },
      });
      console.log(`Deleted job batch ${batchId}`);
    });

    // 4. Return Success Response (204 No Content is common for DELETE)
    // return new NextResponse(null, { status: 204 }); 
    // Or return 200 with a confirmation message if preferred by frontend
    return NextResponse.json({ message: 'Batch slettet.' }, { status: 200 });

  } catch (error) {
    let logBatchId = 'unknown';
    try {
      const resolvedParams = params instanceof Promise ? await params : params;
      logBatchId = resolvedParams.batchId || 'unknown';
    } catch (paramsError) {
      console.error('Error accessing batch ID for logging:', paramsError);
    }
    console.error(`Error deleting batch ID ${logBatchId}:`, error);
    // Check for specific Prisma errors if needed
    return NextResponse.json({ error: 'Kunne ikke slette batch. En intern feil oppstod.' }, { status: 500 });
  }
}

// Potential future route handlers for this batch (PUT for update, DELETE)
// export async function PUT(...) { ... }
// export async function DELETE(...) { ... } 