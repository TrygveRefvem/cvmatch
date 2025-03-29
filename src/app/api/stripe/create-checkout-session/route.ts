import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { stripe } from "@/lib/stripe"; // Import shared Stripe client
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Remove the hardcoded Price ID definition here
// const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || "price_YOUR_DEFAULT_PRICE_ID";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: 'Autentisering påkrevd' }, { status: 401 });
    }

    // --- Get priceId from request body --- 
    const { priceId } = await request.json();
    if (!priceId || typeof priceId !== 'string') {
        console.error('Missing or invalid priceId in request body');
        return NextResponse.json({ error: 'Ugyldig pris valgt' }, { status: 400 });
    }
    // --- End Get priceId ---

    const userId = session.user.id;
    const userEmail = session.user.email;
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'; // Get base URL for redirects

    // --- Get or Create Stripe Customer --- 
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    let stripeCustomerId = user?.stripeCustomerId;

    if (!stripeCustomerId) {
      // Create a new Stripe customer
      console.log(`Creating Stripe customer for user ${userId} (${userEmail})`);
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          userId: userId, // Link Stripe customer to your user ID
        },
      });
      stripeCustomerId = customer.id;

      // Update user record in your DB with the new Stripe Customer ID
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: stripeCustomerId },
      });
      console.log(`Stripe customer ${stripeCustomerId} created and linked to user ${userId}`);
    } else {
      console.log(`Using existing Stripe customer ${stripeCustomerId} for user ${userId}`);
    }
    // --- End Get or Create Stripe Customer --- 

    // --- Create Stripe Checkout Session using the received priceId --- 
    console.log(`Creating Stripe Checkout Session for customer ${stripeCustomerId}, price ${priceId}`);
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'], // Or other methods like 'sepa_debit' etc.
      line_items: [
        {
          price: priceId, // Use the priceId from the request
          quantity: 1,
        },
      ],
      mode: 'subscription', // Specify 'subscription' mode
      allow_promotion_codes: true, // Optional: allow discount codes
      success_url: `${appBaseUrl}/match?session_id={CHECKOUT_SESSION_ID}`, // Redirect URL on success
      cancel_url: `${appBaseUrl}/match?canceled=true`,          // Redirect URL on cancellation
      metadata: {
        userId: userId, // Pass userId again for potential use in webhooks
      },
      // Enable automatic tax calculation if configured in Stripe
      // automatic_tax: { enabled: true }, 
    });
    // --- End Create Stripe Checkout Session --- 

    if (!checkoutSession.url) {
      console.error('Stripe Checkout Session did not return a URL', checkoutSession);
      return NextResponse.json({ error: 'Kunne ikke opprette betalingsøkt' }, { status: 500 });
    }

    // Return the session ID in the format expected by the frontend
    console.log(`Stripe Checkout Session created: ${checkoutSession.id}`);
    return NextResponse.json({ id: checkoutSession.id });

  } catch (error) {
    console.error('Error creating Stripe Checkout Session:', error);
    // Provide a generic error message to the client
    const errorMessage = error instanceof Error ? error.message : 'Ukjent feil';
    return NextResponse.json({ error: `Kunne ikke initiere betaling: ${errorMessage}` }, { status: 500 });
  }
} 