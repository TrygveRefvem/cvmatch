import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import SubscriptionButtons from '@/components/SubscriptionButtons';
import ManageSubscriptionButton from '@/components/ManageSubscriptionButton';
import Link from 'next/link';
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

// Helper function to format dates
const formatDate = (date: Date | null): string => {
  if (!date) return 'N/A';
  return format(date, 'PPP', { locale: nb });
};

// Instantiate Prisma Client (can be outside if reused, but fine here for server component)
const prisma = new PrismaClient();

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userId = session.user.id;

  // Fetch user details AND analysis results concurrently
  const [user, analysisResults] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        trialEndsAt: true,
        stripeSubscriptionStatus: true,
        stripeCustomerId: true,
      },
    }),
    prisma.analysisResult.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' }, // Show newest first
      take: 10, // Limit to latest 10 results for performance
      select: {
        id: true,
        createdAt: true,
        jobTitle: true,
        jobDescriptionUrl: true,
        matchPercentage: true,
        // resultJson: true, // Only select if needed for a details view later
      }
    })
  ]);

  if (!user) {
    console.error("User not found in database despite valid session:", userId);
    redirect('/login');
  }

  const now = new Date();
  const isSubscribed = user.stripeSubscriptionStatus === 'active' || user.stripeSubscriptionStatus === 'trialing';
  const isTrialActive = user.trialEndsAt && user.trialEndsAt > now;
  const trialEndDateFormatted = user.trialEndsAt ? formatDate(user.trialEndsAt) : null;

  const candidatePriceId = process.env.STRIPE_CANDIDATE_PRICE_ID;
  const recruiterPriceId = process.env.STRIPE_RECRUITER_PRICE_ID;

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 py-12">
        <div className="container max-w-4xl">
          <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Tilbake til forsiden
          </Link>

          <div className="card p-8 mb-8">
            <h1 className="text-3xl font-bold mb-6">Din Konto</h1>
            
            <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Kontoinformasjon</h3>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                <dl className="sm:divide-y sm:divide-gray-200">
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Navn</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user.name || 'Ikke oppgitt'}</dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">E-post</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user.email}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Abonnement</h3>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                {isSubscribed ? (
                  <div>
                    <p className="text-green-600 font-semibold">Status: Aktivt abonnement ({user.stripeSubscriptionStatus})</p>
                    {user.stripeCustomerId && (
                      <ManageSubscriptionButton />
                    )}
                  </div>
                ) : isTrialActive ? (
                  <div>
                    <p className="text-blue-600 font-semibold">Status: Prøveperiode aktiv</p>
                    <p className="text-sm text-gray-600">Prøveperioden din utløper {trialEndDateFormatted}.</p>
                    <p className="mt-4">Du kan starte et abonnement nå for å fortsette uten avbrudd etter prøveperioden:</p>
                    <div className="mt-4">
                      <SubscriptionButtons
                        candidatePriceId={candidatePriceId}
                        recruiterPriceId={recruiterPriceId}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-red-600 font-semibold">Status: Ingen aktivt abonnement eller prøveperiode.</p>
                    <p className="mt-4">Velg en plan for å få tilgang til alle funksjoner:</p>
                    <div className="mt-4">
                      <SubscriptionButtons
                        candidatePriceId={candidatePriceId}
                        recruiterPriceId={recruiterPriceId}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Past Analysis Results Section - UPDATED */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Tidligere Analyser</h3>
              </div>
              <div className="border-t border-gray-200">
                {analysisResults.length === 0 ? (
                  <p className="px-4 py-5 text-gray-500 italic sm:px-6">Ingen tidligere analyser funnet.</p>
                ) : (
                  <ul role="list" className="divide-y divide-gray-200">
                    {analysisResults.map((result) => (
                      <li key={result.id}>
                        <Link href={`/account/results/${result.id}`} className="block px-4 py-4 sm:px-6 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="truncate text-sm font-medium text-indigo-600">
                              <span>{result.jobTitle || 'Analyse'}</span>
                              <p className="text-gray-500 font-normal">{formatDate(result.createdAt)}</p>
                            </div>
                            <div className="ml-2 flex-shrink-0 flex">
                              <p className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${result.matchPercentage && result.matchPercentage >= 70 ? 'bg-green-100 text-green-800' : result.matchPercentage && result.matchPercentage >= 40 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                {result.matchPercentage !== null ? `${result.matchPercentage}% match` : '-%'}
                              </p>
                            </div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
} 