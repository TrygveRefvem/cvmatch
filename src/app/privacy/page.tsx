import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Personvern - CV Match',
  description: 'Personvernerklæring for CV Match',
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Personvernerklæring</h1>
      <div className="prose prose-lg">
        <p className="mb-4">
          CV Match tar personvern på alvor. Denne personvernerklæringen forklarer hvordan vi håndterer dine personlige data.
        </p>
        
        <h2 className="text-2xl font-semibold mt-6 mb-4">1. Informasjon vi samler inn</h2>
        <p className="mb-4">
          Vi samler inn følgende typer informasjon:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>CV-er du laster opp</li>
          <li>Stillingsopplysninger du deler</li>
          <li>Analyseergebater fra vår AI-tjeneste</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6 mb-4">2. Hvordan vi bruker informasjonen</h2>
        <p className="mb-4">
          Vi bruker informasjonen for å:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>Analysere CV-er mot stillingsannonser</li>
          <li>Forbedre vår tjeneste</li>
          <li>Generere rapporter og statistikk</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6 mb-4">3. Databehandling og lagring</h2>
        <p className="mb-4">
          Vi lagrer dataene dine trygt i Azure og sletter dem automatisk etter 30 dager. Vi bruker Azure OpenAI Service for analyse av CV-er og stillingsannonser.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-4">4. Dine rettigheter</h2>
        <p className="mb-4">
          Du har rett til å:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>Be om tilgang til dine data</li>
          <li>Be om retting eller sletting av dine data</li>
          <li>Be om eksport av dine data</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6 mb-4">5. Kontakt</h2>
        <p className="mb-4">
          For spørsmål om personvern, vennligst kontakt oss på:
          <br />
          E-post: privacy@cvmatch.no
        </p>
      </div>
    </div>
  );
} 