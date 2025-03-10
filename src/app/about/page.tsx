import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

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
              Match CV
            </Link>
            <Link href="/about" className="hover:text-primary transition-colors">
              Om oss
            </Link>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 py-12">
        <div className="container max-w-4xl">
          <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Tilbake til forsiden
          </Link>

          <div className="card p-8 mb-8">
            <h1 className="text-3xl font-bold mb-6">Om CV Match & Feedback</h1>
            
            <div className="prose max-w-none">
              <p className="text-lg mb-6">
                CV Match & Feedback er en webapplikasjon som bruker AI for å matche CV-er mot stillingsannonser og gi personlig tilbakemelding til jobbsøkere. Målet er å skape en mer transparent, rettferdig og respektfull rekrutteringsprosess.
              </p>

              <h2 className="text-2xl font-bold mt-8 mb-4">Vår visjon</h2>
              <p className="mb-4">
                Vi tror på en arbeidshverdag der alle jobbsøkere får en rettferdig vurdering og verdifull tilbakemelding, uavhengig av bakgrunn. Vår visjon er å demokratisere rekrutteringsprosessen ved å gi jobbsøkere verktøyene de trenger for å forstå hvordan de matcher med stillinger og hvordan de kan forbedre sine søknader.
              </p>

              <h2 className="text-2xl font-bold mt-8 mb-4">Hvordan det fungerer</h2>
              <p className="mb-4">
                Vår teknologi bruker avansert AI for å analysere både CV-er og stillingsannonser. Systemet identifiserer nøkkelkrav, ferdigheter, erfaringer og kvalifikasjoner fra begge dokumenter, og beregner deretter en matchprosent basert på hvor godt CV-en oppfyller kravene i stillingsannonsen.
              </p>
              <p className="mb-4">
                I tillegg til en total matchprosent, gir vi detaljert innsikt i hvordan du matcher på ulike kategorier som ferdigheter, erfaring og utdanning. Dette hjelper deg å forstå dine styrker og svakheter i forhold til den spesifikke stillingen.
              </p>

              <h2 className="text-2xl font-bold mt-8 mb-4">Personlig tilbakemelding</h2>
              <p className="mb-4">
                Det som virkelig skiller oss ut er vår personlige tilbakemelding. Basert på matchresultatet genererer vår AI konkrete forslag til hvordan du kan forbedre CV-en din for å øke sjansene for å bli innkalt til intervju. Dette kan inkludere forslag til hvilke ferdigheter du bør fremheve, hvilke erfaringer som er mest relevante, og hvordan du kan omformulere deler av CV-en for å bedre matche stillingsannonsen.
              </p>

              <h2 className="text-2xl font-bold mt-8 mb-4">Personvern og sikkerhet</h2>
              <p className="mb-4">
                Vi tar personvern på alvor. Alle opplastede CV-er og stillingsannonser behandles konfidensielt og slettes automatisk etter en viss periode. Vi bruker ikke dine data til andre formål enn å gi deg den matchingen og tilbakemeldingen du ber om.
              </p>

              <h2 className="text-2xl font-bold mt-8 mb-4">Kontakt oss</h2>
              <p className="mb-4">
                Har du spørsmål eller tilbakemeldinger? Vi vil gjerne høre fra deg! Send oss en e-post på <a href="mailto:kontakt@cvmatch.no" className="text-primary hover:underline">kontakt@cvmatch.no</a>.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-muted-foreground">
                © 2024 CV Match & Feedback. Alle rettigheter reservert.
              </p>
            </div>
            <div className="flex space-x-6">
              <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                Om oss
              </Link>
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                Personvern
              </Link>
              <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                Vilkår
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 