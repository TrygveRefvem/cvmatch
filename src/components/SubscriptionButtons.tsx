'use client'

import { useState } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { ArrowPathIcon } from "@heroicons/react/24/outline";

// Initialize Stripe.js Promise (outside component)
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : Promise.resolve<Stripe | null>(null);

interface SubscriptionButtonsProps {
  candidatePriceId: string | undefined;
  recruiterPriceId: string | undefined;
}

export default function SubscriptionButtons({ candidatePriceId, recruiterPriceId }: SubscriptionButtonsProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null); // Track loading state per button
  const [error, setError] = useState<string | null>(null);

  const handleSubscribeClick = async (priceId: string | undefined, planName: string) => {
    setError(null);

    if (!priceId) {
      setError(`Pris-ID for ${planName} er ikke konfigurert riktig.`);
      console.error(`Missing Price ID for ${planName}.`);
      return;
    }

    setIsLoading(priceId); // Set loading for the clicked button

    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
        setError("Stripe er ikke konfigurert riktig (manglende publiserbar nøkkel).");
        setIsLoading(null);
        return;
    }

    try {
      // 1. Create checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      const sessionData = await response.json();

      if (!response.ok || !sessionData.id) {
        throw new Error(sessionData.error || 'Kunne ikke opprette Stripe checkout økt.');
      }

      // 2. Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error("Stripe.js kunne ikke lastes inn.");
      }

      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId: sessionData.id });

      if (stripeError) {
        console.error("Stripe redirectToCheckout error:", stripeError);
        setError(`Kunne ikke omdirigere til betaling: ${stripeError.message}`);
      }
      // If redirection fails or user cancels, stop loading state
      setIsLoading(null);

    } catch (error: any) {
      console.error(`Error during subscribe click for ${planName}:`, error);
      setError(error.message || `En feil oppstod under oppretting av ${planName}-abonnement.`);
      setIsLoading(null);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Velg en plan:</h3>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Candidate Plan Button */} 
        <button
          type="button"
          onClick={() => handleSubscribeClick(candidatePriceId, 'Candidate')}
          className="btn btn-primary bg-blue-600 hover:bg-blue-700 flex-1 flex-col h-auto items-center px-4 py-3"
          disabled={!!isLoading || !candidatePriceId} // Disable if any button is loading
          title={!candidatePriceId ? "Candidate plan ikke konfigurert" : "Abonner på Candidate plan"}
        >
          {isLoading === candidatePriceId ? (
            <ArrowPathIcon className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <span className="text-lg font-semibold">Candidate</span>
              <span className="text-sm">(kr 4.99/mnd)</span>
            </>
          )}
        </button>

        {/* Recruiter Plan Button */} 
        <button
          type="button"
          onClick={() => handleSubscribeClick(recruiterPriceId, 'Recruiter Pro')}
          className="btn btn-primary bg-green-600 hover:bg-green-700 flex-1 flex-col h-auto items-center px-4 py-3"
          disabled={!!isLoading || !recruiterPriceId}
          title={!recruiterPriceId ? "Recruiter plan ikke konfigurert" : "Abonner på Recruiter Pro plan"}
        >
          {isLoading === recruiterPriceId ? (
            <ArrowPathIcon className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <span className="text-lg font-semibold">Recruiter Pro</span>
              <span className="text-sm">(kr 49/mnd)</span>
            </>
          )}
        </button>
      </div>
      {/* Add Manage Billing button later */} 
    </div>
  );
} 