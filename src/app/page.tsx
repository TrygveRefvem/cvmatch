import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

export default function Home() {
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
          <Link href="/match" className="btn btn-primary">
            Kom i gang
          </Link>
        </div>
      </header>

      {/* Hero section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-secondary to-background">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Match din CV mot stillingsannonser med AI
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8">
              Få personlig tilbakemelding og øk sjansene dine for å lande drømmejobben
            </p>
            <Link href="/match" className="btn btn-primary text-lg px-8 py-3">
              Prøv nå
            </Link>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Hvordan det fungerer
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <span className="text-primary font-bold text-xl">1</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Last opp CV</h3>
              <p className="text-muted-foreground">
                Last opp CV-en din i PDF, DOCX, DOC eller TXT-format. Vår AI vil automatisk analysere innholdet.
              </p>
            </div>
            <div className="card p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <span className="text-primary font-bold text-xl">2</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Legg inn stillingsannonse</h3>
              <p className="text-muted-foreground">
                Kopier inn URL-en til stillingsannonsen du er interessert i, eller lim inn teksten direkte.
              </p>
            </div>
            <div className="card p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <span className="text-primary font-bold text-xl">3</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Få tilbakemelding</h3>
              <p className="text-muted-foreground">
                Motta en detaljert analyse av hvordan CV-en din matcher med stillingen, samt personlige forbedringsforslag.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-16 md:py-24 bg-secondary">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Klar til å forbedre jobbsøknadene dine?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Bruk vår AI-drevne verktøy for å få verdifull innsikt og øke sjansene dine for å bli innkalt til intervju.
            </p>
            <Link href="/match" className="btn btn-primary text-lg px-8 py-3 inline-flex items-center">
              Match CV-en din nå
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border py-8">
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
