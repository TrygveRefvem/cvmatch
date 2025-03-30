import MatchTestForm from '@/components/match-test/MatchTestForm';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function MatchTestPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Optional: Add a simple header if desired */}
      <main className="flex-1 py-12">
        <div className="container max-w-4xl">
           <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
             <ArrowLeftIcon className="h-4 w-4 mr-2" />
             Tilbake til forsiden
           </Link>

          <div className="card bg-card text-card-foreground shadow-lg rounded-lg p-6 sm:p-8">
              <h1 className="text-2xl font-bold mb-4">Test din CV Match</h1>
              <p className="text-muted-foreground mb-6">
                Lim inn teksten fra din CV og en stillingsannonse for å få en rask indikasjon på match-score.
                 Resultatet lagres ikke.
              </p>
              <MatchTestForm />
          </div>
        </div>
      </main>
      {/* Optional: Add a simple footer */}
    </div>
  );
} 