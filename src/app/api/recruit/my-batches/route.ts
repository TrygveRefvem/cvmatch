import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/recruit/my-batches - Fetch batches for the logged-in recruiter
export async function GET(request: NextRequest) {
  try {
    // 1. Get session and verify user is a logged-in recruiter
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'RECRUITER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    // 2. Fetch job batches for this user from database
    const jobBatches = await prisma.jobBatch.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        _count: { 
          select: { analysisResults: true },
        },
      },
    });

    // 3. Return the batches
    return NextResponse.json(jobBatches); 

  } catch (error) {
    console.error('Error fetching recruiter batches:', error);
    return NextResponse.json({ error: 'Kunne ikke hente batcher. En intern feil oppstod.' }, { status: 500 });
  }
} 