'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // Use useRouter for potential future navigation needs, though window.location is used for Stripe redirect

export default function ManageSubscriptionButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const router = useRouter(); // Keep for potential future use

  const handleManageSubscription = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        setError(data.error || 'Kunne ikke hente administrasjonslenke. Prøv igjen.');
        setIsLoading(false);
        return;
      }

      // Redirect user to the Stripe Billing Portal
      window.location.href = data.url;

      // No need to set isLoading to false here as the page will redirect

    } catch (err) {
      console.error('Error calling create-portal-session API:', err);
      setError('En uventet feil oppstod.');
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleManageSubscription}
        disabled={isLoading}
        className="btn btn-outline btn-primary w-full sm:w-auto mt-4"
      >
        {isLoading ? 'Laster...' : 'Administrer abonnement'}
      </button>
      {error && <p className="text-red-600 text-sm mt-2 text-center sm:text-left">{error}</p>}
    </div>
  );
} 