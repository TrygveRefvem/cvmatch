import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
// Import the new component
import AnalysisResultDisplay from '@/components/AnalysisResultDisplay'; 

const prisma = new PrismaClient();

interface ResultDetailPageProps {
  params: {
    resultId: string;
  };
}

export default async function ResultDetailPage({ params }: ResultDetailPageProps) {
  const session = await getServerSession(authOptions);
  const resultId = params.resultId;

  if (!session?.user?.id) {
    // Redirect to login if not authenticated
    redirect(`/login?callbackUrl=/account/results/${resultId}`);
  }
  const userId = session.user.id;

  // Fetch the specific analysis result
  const analysisResult = await prisma.analysisResult.findUnique({
    where: {
      id: resultId,
      // Security check: Ensure the result belongs to the logged-in user
      userId: userId, 
    },
    select: {
      id: true,
      createdAt: true,
      jobTitle: true,
      jobDescriptionUrl: true,
      resultJson: true, // Select the full JSON result
    },
  });

  // Handle cases where the result is not found or doesn't belong to the user
  if (!analysisResult) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
         <Link href="/account" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Tilbake til konto
          </Link>
        <h1 className="text-2xl font-bold mb-4">Analyse ikke funnet</h1>
        <p className="text-red-600">Kunne ikke finne analyseresultatet, eller du har ikke tilgang til det.</p>
      </div>
    );
  }

  // Ensure resultJson is a valid object before passing it
  // We need to handle the Prisma JsonValue type
  const resultData = typeof analysisResult.resultJson === 'object' && analysisResult.resultJson !== null && !Array.isArray(analysisResult.resultJson)
    ? analysisResult.resultJson 
    : {}; 

  return (
    <div className="container mx-auto px-4 py-8">
       <Link href="/account" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Tilbake til konto
      </Link>
      <h1 className="text-3xl font-bold mb-2">Analyseresultat</h1>
      <p className="text-sm text-gray-500 mb-6">
        For {analysisResult.jobTitle || 'jobb'} analysert den {new Date(analysisResult.createdAt).toLocaleDateString('nb-NO')}
      </p>
      
      {/* Use the AnalysisResultDisplay component */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
         {/* Pass the extracted resultData object */}
         <AnalysisResultDisplay resultData={resultData} /> 
      </div>
    </div>
  );
} 