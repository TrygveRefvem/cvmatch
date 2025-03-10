# CV Match

En applikasjon for å analysere CVer mot stillingsannonser ved hjelp av kunstig intelligens.

## Funksjoner

- Analyse av CV mot stillingsannonse
- Detaljert matchrapport med prosentvis score
- Kategorisert evaluering av kompetanse og erfaring
- Støtte for både tekst og URL-baserte stillingsannonser
- Automatisk tekstutvinning fra HTML-annonser

## Teknologier

- Next.js 15
- TypeScript
- OpenAI API (o3-mini modell)
- TailwindCSS
- Jest for testing

## Kom i gang

### Forutsetninger

- Node.js 18.17 eller nyere
- En OpenAI API-nøkkel

### Installasjon

1. Klon repoet:
```bash
git clone [repo-url]
cd matching
```

2. Installer avhengigheter:
```bash
npm install
```

3. Opprett `.env.local` fil med følgende variabler:
```
OPENAI_API_KEY=din-api-nøkkel
OPENAI_API_BASE_URL=https://api.openai.com/v1
```

4. Start utviklingsserveren:
```bash
npm run dev
```

Applikasjonen vil nå kjøre på [http://localhost:3000](http://localhost:3000)

### Docker

For å bygge og kjøre med Docker:

```bash
docker build -t cvmatch .
docker run -p 3000:3000 -e OPENAI_API_KEY=din-api-nøkkel cvmatch
```

## Testing

```bash
npm test
```

## Lisens

Dette prosjektet er lisensiert under MIT-lisensen - se [LICENSE](LICENSE) filen for detaljer.

## Bidrag

1. Fork repoet
2. Opprett en feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit endringene dine (`git commit -m 'Add some AmazingFeature'`)
4. Push til branchen (`git push origin feature/AmazingFeature`)
5. Åpne en Pull Request
