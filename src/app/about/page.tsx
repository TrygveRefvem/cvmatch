import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export const metadata: Metadata = {
  title: 'Om oss - CV Match',
  description: 'Lær mer om CV Match og hvordan vi hjelper jobbsøkere',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-primary">
            CV Match & Feedback
          </Link>
          <nav className="hidden md:flex space-x-6">
            <Link href="/" className="hover:text-primary transition-colors">
              Hjem
            </Link>
            <Link href="/match" className="hover:text-primary transition-colors">
              Match
            </Link>
            <Link href="/batch" className="hover:text-primary transition-colors">
              Batch
            </Link>
            <Link href="/about" className="text-primary font-medium transition-colors">
              Om oss
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 py-12">
        <div className="container max-w-4xl mx-auto px-4">
          <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Tilbake til forsiden
          </Link>
          
          <div className="card p-8">
            <h1 className="text-3xl font-bold mb-6">Om CV Match</h1>
            
            <div className="prose prose-lg">
              <p className="mb-4">
                CV Match er en AI-drevet tjeneste som hjelper jobbsøkere å forbedre sine jobbsøknader ved å matche deres CV mot konkrete stillingsannonser.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4">Vår historie</h2>
              <p className="mb-4">
                CV Match ble startet i 2023 med et mål om å gjøre jobbsøkerprosessen enklere og mer effektiv både for arbeidssøkere og rekrutterere. 
                Vi så hvordan AI kunne brukes for å gi mer objektive og detaljerte vurderinger av jobbsøknader, og ønsket å gjøre denne teknologien 
                tilgjengelig for alle.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4">Vår teknologi</h2>
              <p className="mb-4">
                Vi bruker state-of-the-art AI-teknologi for å analysere CV-er og stillingsannonser. Vår algoritme er spesielt trent på å identifisere 
                både eksplisitte og implisitte krav i stillingsannonser, og vurdere hvordan din CV matcher disse kravene.
              </p>
              <p className="mb-4">
                Med vårt batch-analyseverktøy kan rekrutterere og HR-avdelinger effektivt vurdere flere kandidater mot samme stilling, 
                og få en objektiv rangering og sammenligning.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4">Personvern</h2>
              <p className="mb-4">
                Vi tar personvern på alvor. Alle data som lastes opp til vår plattform behandles konfidensielt og slettes automatisk 
                etter 30 dager. Vi følger GDPR og andre relevante personvernlover.
              </p>
              <p className="mb-4">
                Les mer om hvordan vi behandler dine data i vår <Link href="/privacy" className="text-primary hover:underline">personvernerklæring</Link>.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4">Kontakt oss</h2>
              <p className="mb-4">
                Har du spørsmål eller tilbakemeldinger? Send oss en e-post på <a href="mailto:kontakt@cvmatch.no" className="text-primary hover:underline">kontakt@cvmatch.no</a>.
              </p>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-muted py-8">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-xl font-bold text-primary">CV Match</h3>
              <p className="text-sm text-muted-foreground">AI-drevet CV-analyse og jobbmatching</p>
            </div>
            <div className="flex flex-col md:flex-row gap-4 md:gap-8">
              <Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                Personvern
              </Link>
              <Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                Vilkår
              </Link>
              <Link href="/about" className="text-primary font-medium transition-colors">
                Om oss
              </Link>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-border text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} CV Match. Alle rettigheter reservert.
          </div>
        </div>
      </footer>
    </div>
  );
} 