# CV Match

A CV matching application that analyzes CVs against job descriptions using AI.

## Local Development

### Prerequisites

- Node.js 20 or higher
- npm 9 or higher

### Setup

1. Clone the repository
2. Create a `.env.local` file from the example:
   ```bash
   cp .env.local.example .env.local
   ```
3. Edit `.env.local` and add your OpenAI API key or Azure OpenAI configuration

### Running Locally

```bash
# Install dependencies
npm install

# Start development server with env vars from .env.local
npm run dev:local

# Or use the standard dev command (requires environment variables to be set)
npm run dev
```

### Testing

```bash
# Run tests with env vars from .env.local
npm run test:local

# Or use the standard test command
npm test
```

## Docker

```bash
# Build Docker image
npm run docker:build

# Run Docker container with environment variables
npm run docker:run
```

## CI/CD Pipeline

This repository includes a GitHub Actions workflow that:

1. Runs tests on pull requests
2. Builds and deploys to a development environment on push to main
3. Deploys to production on manual dispatch

### Deployment

- Development deployments happen automatically when changes are pushed to the main branch
- Production deployments require a manual trigger of the GitHub Actions workflow

## Azure OpenAI Integration

The application is designed to work with either standard OpenAI API or Azure OpenAI:

- For standard OpenAI, set only the `OPENAI_API_KEY` environment variable
- For Azure OpenAI, set both `OPENAI_API_KEY` and `OPENAI_API_BASE_URL` environment variables

The integration is modular and configured through environment variables. See `src/config/environment.ts` and `src/lib/openai-client.ts` for details.

## Project Structure

- `src/` - Application source code
  - `app/` - Next.js app routes
  - `context/` - React context providers
  - `config/` - Configuration files
  - `lib/` - Shared utilities and APIs
- `scripts/` - Development and utility scripts

## License

See the [LICENSE](LICENSE) file for details.

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

## Environment Variables

The application requires the following environment variables:

### OpenAI Configuration
- `OPENAI_API_KEY`: Your OpenAI API key
- `OPENAI_API_BASE_URL`: Set to "https://api.openai.com/v1"

### Application Configuration
- `NEXT_PUBLIC_API_URL`: The URL of your deployed application (e.g., "https://cvmatch-v2.azurewebsites.net")
- `NODE_ENV`: Set to "production" in production environment
- `WEBSITES_PORT`: Set to "3000" for the web app

## Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file with your environment variables:
   ```
   OPENAI_API_KEY=your-openai-api-key
   OPENAI_API_BASE_URL=https://api.openai.com/v1
   NEXT_PUBLIC_API_URL=http://localhost:3000
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## Features

- CV analysis using OpenAI's API
- Job posting matching
- Detailed feedback and improvement suggestions
- Batch analysis capabilities

## Security

- OpenAI API keys are stored securely in Azure Web App configuration
- All sensitive data is handled server-side
- No API keys are exposed to the client

## License

[Your license information here]
