# CVMatch / Fit for Role

A web application designed to streamline the recruitment process by allowing job seekers to manage their CVs and analyze their suitability for specific job postings using AI. Recruiters can manage job batches, add candidates, and leverage AI for candidate analysis and feedback generation.

## Features

### Core

*   **User Authentication:** Credentials-based login using NextAuth.js.
*   **Role-Based Access:** Distinct interfaces and functionalities for `CANDIDATE` and `RECRUITER` roles.
*   **Navigation:** Header navigation dynamically updates based on user role and session status.

### Job Seeker (`CANDIDATE`)

*   **CV Management (`/my-cv`):**
    *   Upload CV files (PDF, DOCX, TXT).
    *   Automatic text extraction.
    *   AI-powered parsing of CV text into structured JSON data.
    *   Visually appealing display of parsed CV information.
*   **Job Analysis (`/my-jobs`):**
    *   Submit a job description URL for analysis against the saved CV.
    *   View a list of past job analyses, including match score and status.
    *   Delete past analyses.
*   **Analysis Detail View (`/my-jobs/[analysisId]`):**
    *   View detailed AI analysis results for a specific job.
    *   Includes overall match score, strengths, weaknesses/mismatches, general feedback, and a category-by-category breakdown with reasoning.

### Recruiter (`RECRUITER`)

*   **Dashboard (`/recruit`):** Central hub for recruiter actions.
*   **Job Batches:**
    *   Create job batches, linking them to a specific job description URL (job text is automatically fetched and stored).
    *   View created batches.
*   **Candidate Management:**
    *   Add candidates to specific batches, including uploading their CV.
    *   AI analysis is automatically run when adding a candidate to a batch.
    *   View candidates within a batch and their analysis results.
*   **Feedback Generation:**
    *   Generate AI-assisted rejection feedback based on the analysis results.
    *   Preview feedback before potentially sending.
*   **Embeddable Widget (`/public/apply.js`):**
    *   Provides a JavaScript widget that can be embedded on external job posting sites.
    *   Allows candidates to apply directly via CVMatch, triggering analysis against the associated Job Batch.
    *   Widget test page (`/recruit/widget-test/[batchId]`) for integration testing.

### Other

*   **Stripe Integration:** Placeholders and configuration for handling subscriptions (requires further implementation).
*   **Email Integration:** Configuration for Resend API (email sending logic like feedback emails not fully implemented).

## Technology Stack

*   **Framework:** Next.js 15.x (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS (with `@tailwindcss/typography` plugin)
*   **Database:** PostgreSQL
*   **ORM:** Prisma
*   **Authentication:** NextAuth.js
*   **AI / LLM:** OpenAI API (primarily GPT-4o-mini)
*   **File Parsing:** `pdf-parse` (for PDF), `mammoth` (for DOCX)
*   **UI Components:** Heroicons
*   **Email:** Resend
*   **Payments:** Stripe

## Getting Started / Local Development Setup

### Prerequisites

*   Node.js (v20.x recommended)
*   npm (v10.x or later)
*   A running PostgreSQL server instance.

### Setup Steps

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd cvmatch
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Set up Environment Variables:**
    *   Create a file named `.env.local` in the project root.
    *   Add the following variables, replacing placeholder values:
        ```dotenv
        # Database (adjust user, password, port, dbname if different)
        DATABASE_URL="postgresql://user:mysecretpassword@localhost:5432/cvmatch?schema=public"

        # OpenAI
        OPENAI_API_KEY="sk-proj-..."

        # NextAuth (Generate a strong secret using: openssl rand -base64 32)
        NEXTAUTH_SECRET="YOUR_GENERATED_STRONG_SECRET"
        NEXTAUTH_URL="http://localhost:3000"

        # Stripe (Use your TEST keys)
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
        STRIPE_SECRET_KEY="sk_test_..."
        STRIPE_WEBHOOK_SECRET="whsec_..."
        STRIPE_CANDIDATE_PRICE_ID="price_..." # Get from Stripe Dashboard
        STRIPE_RECRUITER_PRICE_ID="price_..." # Get from Stripe Dashboard

        # Resend
        RESEND_API_KEY="re_..."

        # App Configuration (Optional for local, required for some features)
        # NEXT_PUBLIC_APP_URL=http://localhost:3000
        ```
4.  **Database Setup:**
    *   Ensure your local PostgreSQL server is running and accessible via the `DATABASE_URL` you configured.
    *   The database (`cvmatch` in the example URL) does not need to exist beforehand; Prisma will create it during the first migration if necessary.
5.  **Database Migrations:**
    *   Run the Prisma migrations to set up the database schema:
        ```bash
        npx prisma migrate dev
        ```
    *   This command also generates the Prisma Client.
6.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
    *   The application should now be running at `http://localhost:3000`.

## Project Structure

*   `/prisma`: Database schema (`schema.prisma`) and migration files.
*   `/public`: Static assets served directly (e.g., `apply.js` widget script, images).
*   `/src/app`: Next.js App Router pages and API routes.
    *   `/api`: Backend API route handlers.
        *   `/auth`: NextAuth.js authentication routes.
        *   `/recruit`: API endpoints specific to recruiters.
        *   `/seeker`: API endpoints specific to job seekers.
        *   `/stripe`: Stripe webhook handler.
        *   `/widget`: API endpoints for the embeddable application widget.
    *   `/my-cv`: Seeker page for managing CV.
    *   `/my-jobs`: Seeker page for analyzing jobs and viewing results.
    *   `/recruit`: Recruiter dashboard page.
    *   Other page routes...
*   `/src/components`: Reusable React components (e.g., AuthButton, forms, modals).
*   `/src/lib`: Shared utility functions, library initializations (Prisma Client, Stripe Client, OpenAI Client).
*   `/src/types`: Custom TypeScript type definitions (consider consolidation).

## Key API Endpoints

*   `POST /api/register`: User registration.
*   `POST /api/auth/[...nextauth]`: Handles user login and session management.
*   `POST /api/seeker/profile/cv`: Upload/update seeker CV (extracts text, parses JSON).
*   `GET /api/seeker/profile/cv`: Retrieve seeker's parsed CV data and raw text.
*   `POST /api/seeker/analyze-job`: Analyzes the seeker's saved CV against a provided job URL.
*   `GET /api/seeker/analysis-results`: Lists all analyses initiated by the logged-in seeker.
*   `GET /api/seeker/analysis-results/[analysisId]`: Gets detailed results for a specific analysis.
*   `DELETE /api/seeker/analysis-results/[analysisId]`: Deletes a specific analysis.
*   `POST /api/recruit/batches`: Creates a new job batch for a recruiter.
*   `POST /api/recruit/add-candidate`: Adds a candidate (with CV) to a specific job batch, triggering analysis.
*   `POST /api/recruit/feedback`: Generates AI feedback preview for candidate rejection.
*   `POST /api/widget/apply`: Handles CV submission via the external widget.
*   `POST /api/stripe/webhook`: Receives and processes events from Stripe.

## Deployment

The target deployment platform is Azure.

*   **Services:** Azure App Service (Linux, Node.js runtime), Azure Database for PostgreSQL (Flexible Server).
*   **Domain:** `fitforrole.com`
*   **Process:** Requires setting up Azure resources (Resource Group, App Service Plan, Web App, Database), configuring production environment variables (potentially using Azure Key Vault), running database migrations (`prisma migrate deploy`), and setting up a CI/CD pipeline (e.g., GitHub Actions, Azure Pipelines) to build (`prisma generate && next build`) and deploy the application from a Git repository.
