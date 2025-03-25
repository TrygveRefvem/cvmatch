import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export const metadata: Metadata = {
  title: 'Vilkår - CV Match',
  description: 'Vilkår for bruk av CV Match tjenesten',
};

export default function TermsPage() {
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
            <Link href="/about" className="hover:text-primary transition-colors">
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
            <h1 className="text-3xl font-bold mb-6">Vilkår for bruk</h1>
            
            <div className="prose prose-lg">
              <p className="mb-4">
                Sist oppdatert: {new Date().toLocaleDateString('nb-NO')}
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4">1. Aksept av vilkår</h2>
              <p className="mb-4">
                Ved å bruke CV Match tjenesten, godtar du disse vilkårene for bruk i sin helhet. Hvis du ikke godtar vilkårene, ber vi deg vennligst om å ikke bruke tjenesten.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4">2. Tjenestens formål</h2>
              <p className="mb-4">
                CV Match er en tjeneste som bruker AI-teknologi for å analysere CV-er mot stillingsannonser og gi tilbakemelding om matchgrad.
                Tjenesten er ment som et hjelpemiddel for jobbsøkere og rekrutterere, og skal ikke erstatte profesjonell karriereveiledning.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4">3. Brukerens ansvar</h2>
              <p className="mb-4">
                Som bruker av tjenesten er du ansvarlig for:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Å sikre at innholdet du laster opp er lovlig og ikke krenker andres rettigheter</li>
                <li>Å ikke bruke tjenesten til ulovlige formål eller på måter som kan skade tjenesten eller andre brukere</li>
                <li>Å ikke forsøke å omgå sikkerhetstiltak eller hacke tjenesten</li>
                <li>Å ikke dele sensitiv personinformasjon som ikke er relevant for jobbsøking</li>
              </ul>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4">4. Immaterielle rettigheter</h2>
              <p className="mb-4">
                CV Match og all tilhørende programvare, design, tekst og annet innhold er beskyttet av opphavsrett og andre immaterielle rettigheter.
                Du får en begrenset, ikke-eksklusiv lisens til å bruke tjenesten for personlige eller interne forretningsformål.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4">5. Ansvarsfraskrivelse</h2>
              <p className="mb-4">
                CV Match leveres "som den er" og vi gir ingen garantier for tjenestens nøyaktighet, pålitelighet eller egnethet for et bestemt formål.
                Vi er ikke ansvarlige for tap eller skade som følge av bruk av tjenesten, inkludert men ikke begrenset til tapte muligheter, tapt inntekt eller indirekte tap.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4">6. Personvern</h2>
              <p className="mb-4">
                Vi behandler personopplysninger i samsvar med gjeldende personvernlovgivning og vår <Link href="/privacy" className="text-primary hover:underline">personvernerklæring</Link>.
                Ved å bruke tjenesten samtykker du til vår behandling av dine personopplysninger som beskrevet der.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4">7. Endringer i vilkårene</h2>
              <p className="mb-4">
                Vi forbeholder oss retten til å endre disse vilkårene når som helst. Vesentlige endringer vil bli varslet via tjenesten.
                Din fortsatte bruk av tjenesten etter slike endringer betyr at du aksepterer de nye vilkårene.
              </p>
              
              <h2 className="text-2xl font-semibold mt-8 mb-4">8. Kontaktinformasjon</h2>
              <p className="mb-4">
                Hvis du har spørsmål om disse vilkårene, kan du kontakte oss på <a href="mailto:kontakt@cvmatch.no" className="text-primary hover:underline">kontakt@cvmatch.no</a>.
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
              <Link href="/terms" className="text-primary font-medium transition-colors">
                Vilkår
              </Link>
              <Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">
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