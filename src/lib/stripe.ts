import Stripe from 'stripe';

// Ensure Stripe secret key is available
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables.');
}

// Initialize Stripe with the API key and version
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia', // Use the API version expected by the library types
  typescript: true,       // Enable TypeScript support
}); 