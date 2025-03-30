import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Adjust path if needed
import { PrismaClient } from '@prisma/client';
import { stripe } from '@/lib/stripe'; // Assuming stripe client is initialized in lib

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // 1. Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get user's Stripe Customer ID from DB
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { stripeCustomerId: true },
    });

    if (!user || !user.stripeCustomerId) {
      console.error(`Stripe Customer ID not found for user: ${session.user.email}`);
      return NextResponse.json({ error: 'Stripe kunde-ID ikke funnet.' }, { status: 404 });
    }

    // 3. Define the return URL (where user comes back to after portal)
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/account`;

    // 4. Create Stripe Billing Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl,
    });

    // 5. Return the portal session URL
    return NextResponse.json({ url: portalSession.url });

  } catch (error) {
    console.error('Error creating Stripe portal session:', error);
    // Check if it's a Stripe error object
    const errorMessage = error instanceof Error ? error.message : 'En intern feil oppstod.';
    return NextResponse.json({ error: `Kunne ikke opprette kundeportal: ${errorMessage}` }, { status: 500 });
  }
} 