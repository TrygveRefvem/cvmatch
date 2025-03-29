import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe'; // Shared Stripe client
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Ensure webhook secret is set
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!webhookSecret) {
  console.warn('STRIPE_WEBHOOK_SECRET is not set. Webhook verification will fail.');
  // In production, you might want to throw an error or disable the webhook route
  // throw new Error('STRIPE_WEBHOOK_SECRET environment variable not set.');
}

// Helper function to update user subscription details in DB
async function updateUserSubscription(userId: string, subscription: Stripe.Subscription) {
  console.log(`Updating DB for user ${userId} from subscription ${subscription.id}`);
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0]?.price.id,
        stripeSubscriptionStatus: subscription.status,
        // Optionally, reset trial period if subscription becomes active
        // trialEndsAt: null, 
      },
    });
    console.log(`Successfully updated user ${userId} subscription status to ${subscription.status}`);
  } catch (error) {
    console.error(`Error updating subscription status for user ${userId}:`, error);
    // Handle error appropriately (e.g., retry logic, logging)
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  // Need to await headers() to get the header map
  const headerPayload = await headers(); 
  const signature = headerPayload.get('stripe-signature') as string;

  if (!webhookSecret) {
    console.error('Stripe webhook secret is not configured.');
    return NextResponse.json({ error: 'Webhook secret not configured.' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log(`Received Stripe webhook event: ${event.type}`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`❌ Error verifying Stripe webhook signature: ${errorMessage}`);
    return NextResponse.json({ error: `Webhook signature verification failed: ${errorMessage}` }, { status: 400 });
  }

  // --- Handle Specific Stripe Events --- 
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Handling checkout.session.completed');
        // Check if it's a subscription setup session
        if (session.mode === 'subscription' && session.subscription && session.metadata?.userId) {
          const subscriptionId = session.subscription as string;
          const userId = session.metadata.userId;
          console.log(`Checkout session completed for user ${userId}, subscription ID: ${subscriptionId}`);
          // Retrieve the subscription details to get status and price ID
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await updateUserSubscription(userId, subscription);
        } else {
          console.log(`Ignoring checkout session ${session.id} (mode: ${session.mode}, no user ID, or no subscription)`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        console.log(`Handling customer.subscription.updated for subscription ${subscription.id}`);
        // Find user by Stripe Customer ID
        const user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } });
        if (user) {
          await updateUserSubscription(user.id, subscription);
        } else {
           console.warn(`Webhook Warning: User not found for Stripe customer ID: ${customerId} during subscription update.`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        console.log(`Handling customer.subscription.deleted for subscription ${subscription.id}`);
         // Find user by Stripe Customer ID
        const user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } });
        if (user) {
           // Update status to reflect deletion (e.g., 'canceled' or null out fields)
           console.log(`Updating user ${user.id} subscription status to 'deleted/canceled'`);
           await prisma.user.update({
              where: { id: user.id },
              data: {
                // Keep customer ID, but clear subscription details
                stripeSubscriptionId: null,
                stripePriceId: null,
                stripeSubscriptionStatus: subscription.status, // Usually 'canceled'
              },
           });
        } else {
            console.warn(`Webhook Warning: User not found for Stripe customer ID: ${customerId} during subscription deletion.`);
        }
        break;
      }

      // TODO: Handle other relevant events like:
      // - invoice.payment_failed: Notify user, potentially restrict access
      // - invoice.payment_succeeded: Maybe update a billing date field

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
     console.error('Error handling Stripe webhook event:', error);
     // Don't return 4xx/5xx to Stripe unless it's a signature issue
     // Stripe will retry if it receives non-200 status
     return NextResponse.json({ error: 'Webhook handler failed internally' }, { status: 500 }); // Internal error
  }
} 