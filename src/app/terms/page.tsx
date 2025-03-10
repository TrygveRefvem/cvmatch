import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vilkår - CV Match',
  description: 'Bruksvilkår for CV Match',
};

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Bruksvilkår</h1>
      <div className="prose prose-lg">
        <p className="mb-4">
          Velkommen til CV Match. Ved å bruke vår tjeneste godtar du disse vilkårene.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-4">1. Tjenestebeskrivelse</h2>
        <p className="mb-4">
          CV Match er en AI-drevet tjeneste som hjelper deg med å analysere CV-er mot stillingsannonser. Vi tilbyr både enkelt- og batchanalyse av dokumenter.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-4">2. Brukeransvar</h2>
        <p className="mb-4">
          Som bruker av tjenesten er du ansvarlig for:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>Å sikre at du har rettigheter til å dele opplastede dokumenter</li>
          <li>Å ikke dele sensitive eller konfidensielle opplysninger</li>
          <li>Å ikke misbruke eller overbelaste tjenesten</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6 mb-4">3. Tjenestekvalitet</h2>
        <p className="mb-4">
          Vi streber etter å tilby en pålitelig og nøyaktig tjeneste, men kan ikke garantere at analysene alltid vil være 100% nøyaktige. Vi anbefaler at du gjennomgår resultatene manuelt.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-4">4. Begrensning av ansvar</h2>
        <p className="mb-4">
          CV Match er ikke ansvarlig for:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>Feil eller unøyaktigheter i analyseresultatene</li>
          <li>Tap av data eller informasjon</li>
          <li>Indirekte skader som følge av bruk av tjenesten</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6 mb-4">5. Endringer i vilkårene</h2>
        <p className="mb-4">
          Vi forbeholder oss retten til å endre disse vilkårene når som helst. Fortsatt bruk av tjenesten etter endringer betyr at du aksepterer de nye vilkårene.
        </p>

        <h2 className="text-2xl font-semibold mt-6 mb-4">6. Kontakt</h2>
        <p className="mb-4">
          For spørsmål om vilkårene, vennligst kontakt oss på:
          <br />
          E-post: terms@cvmatch.no
        </p>
      </div>
    </div>
  );
} 