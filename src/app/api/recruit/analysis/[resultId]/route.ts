import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(
  request: NextRequest, 
  { params }: { params: { resultId: string } }
) {
  const session = await getServerSession(authOptions);
  const { resultId } = params;

  // 1. Auth Checks: Ensure user is logged in and is a recruiter
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'RECRUITER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const recruiterUserId = session.user.id;

  if (!resultId) {
     return NextResponse.json({ error: 'Missing analysis result ID' }, { status: 400 });
  }

  try {
    // 2. Fetch the analysis result and its batch to verify ownership
    const analysisResult = await prisma.analysisResult.findUnique({
      where: {
        id: resultId,
      },
      include: {
        jobBatch: {
          select: { userId: true }, // Only need userId for ownership check
        },
      },
    });

    // 3. Authorization Check: Ensure result exists and recruiter owns the batch
    if (!analysisResult) {
      return NextResponse.json({ error: 'Analysis result not found' }, { status: 404 });
    }
    if (!analysisResult.jobBatch || analysisResult.jobBatch.userId !== recruiterUserId) {
      console.warn(`Recruiter ${recruiterUserId} attempted to delete analysis ${resultId} but does not own the batch.`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Delete the analysis result
    await prisma.analysisResult.delete({
      where: { id: resultId },
    });

    console.log(`Recruiter ${recruiterUserId} deleted analysis result ${resultId}`);
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error(`Error deleting analysis result ${resultId}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 