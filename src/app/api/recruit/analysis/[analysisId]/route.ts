import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient, CandidateStatus } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Zod schema for validating the status update request body
const UpdateStatusSchema = z.object({
  status: z.nativeEnum(CandidateStatus), // Ensure the status is a valid enum value
});

// PUT /api/recruit/analysis/[analysisId]/ - Update candidate status
export async function PUT(
  request: NextRequest,
  { params }: { params: { analysisId: string } }
) {
  console.log("PUT request received for analysis status update:", params);
  
  try {
    // 1. Resolve analysisId from params
    const resolvedParams = params instanceof Promise ? await params : params;
    const analysisId = resolvedParams.analysisId;
    if (typeof analysisId !== 'string' || analysisId.length === 0) {
      return NextResponse.json({ error: 'Invalid or missing analysis ID in request parameters.' }, { status: 400 });
    }
    console.log(`Attempting status update for analysisId: ${analysisId}`);

    // 2. Authenticate and authorize the user (must be recruiter)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'RECRUITER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const recruiterUserId = session.user.id;

    // 3. Validate request body
    let validatedData: { status: CandidateStatus };
    try {
      const body = await request.json();
      validatedData = UpdateStatusSchema.parse(body);
    } catch (error) {
      console.error("Invalid request body for status update:", error);
      return NextResponse.json({ error: 'Invalid request body for status update', details: (error as any).errors }, { status: 400 });
    }
    const newStatus = validatedData.status;
    console.log(`Validated new status: ${newStatus}`);

    // 4. Verify ownership: Check if analysis exists and belongs to a batch owned by the recruiter
    const analysisResult = await prisma.analysisResult.findUnique({
      where: { id: analysisId },
      select: {
        id: true,
        jobBatch: {
          select: { userId: true }
        }
      }
    });

    if (!analysisResult) {
      return NextResponse.json({ error: 'Analysis result not found.' }, { status: 404 });
    }
    if (!analysisResult.jobBatch || analysisResult.jobBatch.userId !== recruiterUserId) {
      return NextResponse.json({ error: 'Forbidden: You do not own the batch this analysis belongs to.' }, { status: 403 });
    }

    // 5. Update the status in the database
    const updatedAnalysis = await prisma.analysisResult.update({
      where: { id: analysisId },
      data: { status: newStatus },
      select: { id: true, status: true } // Return the updated status
    });

    console.log(`Successfully updated status for ${analysisId} to ${updatedAnalysis.status}`);
    // 6. Return success response
    return NextResponse.json(updatedAnalysis, { status: 200 });

  } catch (error) {
    let logAnalysisId = 'unknown';
    try {
      const resolvedParams = params instanceof Promise ? await params : params;
      logAnalysisId = resolvedParams.analysisId || 'unknown';
    } catch (paramsError) {
      // Ignore error during error logging
    }
    console.error(`Error updating status for analysis ID ${logAnalysisId}:`, error);
    return NextResponse.json({ error: 'Could not update status. An internal error occurred.' }, { status: 500 });
  }
}

// DELETE /api/recruit/analysis/[analysisId]/ - Delete analysis result
export async function DELETE(
  request: NextRequest, 
  { params }: { params: { analysisId: string } } // Use analysisId consistently
) {
  console.log("DELETE request received for analysis:", params);

  try {
    // 1. Resolve analysisId from params
    const resolvedParams = params instanceof Promise ? await params : params;
    const analysisId = resolvedParams.analysisId;
    if (typeof analysisId !== 'string' || analysisId.length === 0) {
      return NextResponse.json({ error: 'Invalid or missing analysis ID in request parameters.' }, { status: 400 });
    }
    console.log(`Attempting deletion for analysisId: ${analysisId}`);

    // 2. Auth Checks: Ensure user is logged in and is a recruiter
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'RECRUITER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const recruiterUserId = session.user.id;

    // 3. Fetch the analysis result and its batch to verify ownership
    const analysisResult = await prisma.analysisResult.findUnique({
      where: {
        id: analysisId, // Use analysisId
      },
      include: {
        jobBatch: {
          select: { userId: true }, // Only need userId for ownership check
        },
      },
    });

    // 4. Authorization Check: Ensure result exists and recruiter owns the batch
    if (!analysisResult) {
      return NextResponse.json({ error: 'Analysis result not found' }, { status: 404 });
    }
    if (!analysisResult.jobBatch || analysisResult.jobBatch.userId !== recruiterUserId) {
      console.warn(`Recruiter ${recruiterUserId} attempted to delete analysis ${analysisId} but does not own the batch.`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 5. Delete the analysis result
    await prisma.analysisResult.delete({
      where: { id: analysisId }, // Use analysisId
    });

    console.log(`Recruiter ${recruiterUserId} deleted analysis result ${analysisId}`);
    // 6. Return success response (204 No Content is also common for DELETE)
    return NextResponse.json({ success: true, message: 'Analysis result deleted.' }, { status: 200 });

  } catch (error) {
    let logAnalysisId = 'unknown';
    try {
      const resolvedParams = params instanceof Promise ? await params : params;
      logAnalysisId = resolvedParams.analysisId || 'unknown';
    } catch (paramsError) {
      // Ignore error during error logging
    }
    console.error(`Error deleting analysis result ${logAnalysisId}:`, error);
    return NextResponse.json({ error: 'Internal server error during deletion.' }, { status: 500 });
  }
} 