'use client'

import { useState, FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/'; // Redirect back after login
  const error = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(error ? 'Ugyldig e-post eller passord' : null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setSignInError(null);

    try {
      const result = await signIn('credentials', {
        redirect: false, // Handle redirect manually based on result
        email,
        password,
        callbackUrl: callbackUrl, // Pass the original callbackUrl
      });

      if (result?.error) {
        console.error("Sign-in error:", result.error);
        // Use the error message from next-auth if available, otherwise a generic one
        // You might want to map specific error codes (like "CredentialsSignin") to user-friendly messages
        setSignInError('Ugyldig e-post eller passord');
        setIsLoading(false);
      } else if (result?.ok && result?.url) {
        // Sign-in successful, redirect to the intended page or dashboard
        router.push(result.url); 
        // router.push(callbackUrl); // Alternative: always redirect to original callbackUrl
      } else {
        // Handle unexpected cases
        setSignInError('En uventet feil oppstod under pålogging.');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Sign-in exception:', error);
      setSignInError('En feil oppstod. Prøv igjen.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Logg inn på din konto
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <input type="hidden" name="remember" defaultValue="true" />
          <div className="-space-y-px rounded-md shadow-sm">
            <div>
              <label htmlFor="email-address" className="sr-only">
                E-postadresse
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full appearance-none rounded-none rounded-t-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="E-postadresse"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Passord
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full appearance-none rounded-none rounded-b-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="Passord"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {signInError && (
            <div className="text-sm text-red-600 text-center">
              {signInError}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isLoading ? 'Logger inn...' : 'Logg inn'}
            </button>
          </div>
        </form>
        <div className="text-sm text-center">
          <span className="text-gray-600">Har du ikke konto? </span>
          <Link href="/auth/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
            Registrer deg her
          </Link>
        </div>
      </div>
    </div>
  );
} 