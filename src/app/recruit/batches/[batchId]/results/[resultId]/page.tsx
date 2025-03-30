import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { PrismaClient, AnalysisResult, User, JobBatch } from "@prisma/client"; // Assuming imports work at runtime despite linter
import Link from 'next/link';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

const prisma = new PrismaClient();

// Helper function to format dates (duplicate - centralize later)
const formatDate = (date: Date | null): string => {
  if (!date) return 'N/A';
  return format(date, 'PPP', { locale: nb });
};

// Helper to safely parse JSON string fields
const safeParseJson = (jsonString: string | null | undefined): any[] | null => {
  if (!jsonString) return null;
  try {
    const parsed = JSON.parse(jsonString);
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    console.error("Failed to parse JSON string:", jsonString, error);
    return null;
  }
};

interface RecruiterResultDetailPageProps {
  params: {
    batchId: string;
    resultId: string;
  };
}

// Define structure including related batch and candidate user
type AnalysisResultForRecruiter = AnalysisResult & {
  user: Pick<User, 'id' | 'name' | 'email'>;
  jobBatch: Pick<JobBatch, 'id' | 'title' | 'userId'> | null;
};

export default async function RecruiterResultDetailPage({ params }: RecruiterResultDetailPageProps) {
  const session = await getServerSession(authOptions);
  const { batchId, resultId } = params;

  // 1. Auth Checks: Ensure user is logged in and is a recruiter
  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=/recruit/batches/${batchId}/results/${resultId}`);
  }
  if (session.user.role !== 'RECRUITER') {
    console.log(`Non-recruiter ${session.user.email} attempted to access recruiter result ${resultId}. Redirecting.`);
    redirect('/');
  }
  const recruiterUserId = session.user.id;

  // 2. Fetch Analysis Result with Batch and Candidate User info
  const analysisResult = await prisma.analysisResult.findUnique({
    where: {
      id: resultId,
    },
    include: {
      user: { // Candidate User
        select: { id: true, name: true, email: true },
      },
      jobBatch: { // Include the batch to verify ownership
        select: { id: true, title: true, userId: true }
      }
    },
  });

  // 3. Validation & Authorization Checks
  if (!analysisResult) {
     return <NotFound message="Kunne ikke finne analyseresultatet." backLink={`/recruit/batches/${batchId}`} />;
  }
  // Check if the result belongs to the specified batch AND that batch belongs to the logged-in recruiter
  if (!analysisResult.jobBatch || analysisResult.jobBatch.id !== batchId || analysisResult.jobBatch.userId !== recruiterUserId) {
     console.warn(`Recruiter ${recruiterUserId} denied access to result ${resultId} (batch mismatch or ownership fail). Result Batch: ${analysisResult.jobBatch?.id}, Requested Batch: ${batchId}`);
     return <NotFound message="Du har ikke tilgang til dette analyseresultatet via denne batchen." backLink={`/recruit/batches/${batchId}`} />;
  }

  // Cast type for easier access
  const resultData = analysisResult as AnalysisResultForRecruiter;
  const candidate = resultData.user;
  const batch = resultData.jobBatch;

  // Safely parse JSON fields from the result
  const strengths = safeParseJson(resultData.strengths);
  const areasForImprovement = safeParseJson(resultData.areasForImprovement);
  const questionsToAsk = safeParseJson(resultData.questionsToAsk);

  // 4. Render Analysis Details
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 py-12">
        <div className="container max-w-4xl">
          {/* Back Navigation to the specific Batch Detail page */}
          <Link href={`/recruit/batches/${batchId}`} className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Tilbake til Batch: {batch.title}
          </Link>

          <div className="card bg-card text-card-foreground shadow-lg rounded-lg p-6 sm:p-8">
            <div className="mb-6 border-b pb-4">
                <h1 className="text-2xl font-bold mb-1">Analyse for: {candidate.name || candidate.email}</h1>
                <p className="text-muted-foreground text-sm">Stilling: {resultData.jobTitle || batch.title}</p>
                <p className="text-muted-foreground text-sm">Analysert: {formatDate(resultData.createdAt)}</p>
                {resultData.jobDescriptionUrl && (
                     <p className="text-xs text-muted-foreground mt-1">
                       <a href={resultData.jobDescriptionUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">Se stillingsannonse</a>
                     </p>
                )}
            </div>

            {/* Match Percentage and Overall Feedback */}
            <div className="mb-6 p-4 rounded-md bg-muted/50 border">
              <h2 className="text-lg font-semibold mb-2">Sammendrag</h2>
              <p className="text-3xl font-bold text-center mb-3">
                {resultData.matchPercentage !== null ? `${resultData.matchPercentage}% Match` : "Match ikke beregnet"}
              </p>
              {resultData.feedback && <p className="text-center text-muted-foreground">{resultData.feedback}</p>}
            </div>

            {/* Strengths */}
            {strengths && strengths.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2 flex items-center">
                  <CheckCircleIcon className="h-5 w-5 mr-2 text-green-500" /> Styrker
                </h3>
                <ul className="list-disc list-inside space-y-1 pl-4 text-muted-foreground">
                  {strengths.map((item, index) => <li key={`strength-${index}`}>{item}</li>)}
                </ul>
              </div>
            )}

            {/* Areas for Improvement */}
            {areasForImprovement && areasForImprovement.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2 flex items-center">
                    <XCircleIcon className="h-5 w-5 mr-2 text-red-500" /> Forbedringsområder
                </h3>
                <ul className="list-disc list-inside space-y-1 pl-4 text-muted-foreground">
                   {areasForImprovement.map((item, index) => <li key={`improve-${index}`}>{item}</li>)}
                </ul>
              </div>
            )}

             {/* Questions to Ask */}
            {questionsToAsk && questionsToAsk.length > 0 && (
              <div className="mb-6">
                 <h3 className="text-lg font-semibold mb-2 flex items-center">
                    <QuestionMarkCircleIcon className="h-5 w-5 mr-2 text-blue-500" /> Spørsmål kandidaten kan stille
                 </h3>
                 <ul className="list-disc list-inside space-y-1 pl-4 text-muted-foreground">
                   {questionsToAsk.map((item, index) => <li key={`question-${index}`}>{item}</li>)}
                 </ul>
              </div>
            )}
            
            {/* TODO: Add recruiter actions like sending feedback? */}

            {/* Raw JSON Output - Collapsible */}
            <div className="mt-8 border-t pt-6">
              <details>
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                  Vis rå JSON-analyse
                </summary>
                <pre className="mt-2 text-xs bg-muted text-muted-foreground p-4 rounded-md overflow-x-auto">
                  <code>
                    {JSON.stringify(resultData.resultJson, null, 2)}
                  </code>
                </pre>
              </details>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

// Simple Not Found component for reuse
function NotFound({ message, backLink }: { message: string, backLink: string }) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Ikke Funnet</h1>
          <p className="text-muted-foreground mt-2">{message}</p>
          <Link href={backLink} className="mt-4 inline-block text-primary hover:underline">
            Tilbake
          </Link>
        </div>
      </div>
    );
} 