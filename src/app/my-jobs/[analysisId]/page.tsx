// src/app/my-jobs/[analysisId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation'; // Hook to get dynamic route parameters
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeftIcon, ArrowPathIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
// TODO: Import specific types for resultJson later if needed
// import { CvData } from '@/types/cv'; // Example

// --- Define the interface here, within the file scope ---
// More specific types for the resultJson content based on the analysis prompt
interface AnalysisDetail { 
    name: string;
    match: number;
    required: boolean;
    reasoning: string;
}

interface AnalysisCategory { 
    name: string;
    match: number;
    categoryReasoning?: string;
    details: AnalysisDetail[];
}

interface AnalysisResultJson {
    overallMatch?: number;
    jobTitle?: string;
    companyName?: string | null;
    categories?: AnalysisCategory[];
    strengths?: string[];
    weaknesses?: string[];
    feedback?: string[];
}

interface FullAnalysisResult {
  id: string;
  jobTitle: string | null;
  jobDescriptionUrl: string | null;
  matchPercentage: number | null;
  resultJson?: AnalysisResultJson | null; // Use the specific type, allow null
  cvText?: string | null;
  jobDescriptionText?: string | null;
  strengths?: string[]; // Parsed from stringified array
  areasForImprovement?: string[]; // Parsed from stringified array
  feedback?: string[]; // Parsed from stringified array
  createdAt: string;
  // seekerStatus?: JobApplicationStatus; // Assuming JobApplicationStatus is imported or defined
}
// --- End Interface Definition ---

export default function AnalysisDetailPage() {
  console.log('[Detail Page] Component Rendering...'); // Add this top-level log
  const params = useParams();
  const { data: session, status } = useSession();
  const analysisId = params?.analysisId as string; // Get the ID from the URL
  console.log(`[Detail Page] Extracted analysisId: ${analysisId}`); // Log the extracted ID

  const [analysisResult, setAnalysisResult] = useState<FullAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalysisDetails = async () => {
      console.log(`[Detail Page] useEffect triggered. Status: ${status}, Analysis ID: ${analysisId}`); // Log effect trigger
      // Only fetch if authenticated and analysisId is available
      if (status === 'authenticated' && analysisId) {
        setIsLoading(true); // Set loading true *before* try block
        setError(null);
        try {
           // --- Fetch actual data ---
          console.log(`[Detail Page] Attempting to fetch: /api/seeker/analysis-results/${analysisId}`);
          const response = await fetch(`/api/seeker/analysis-results/${analysisId}`);
          
          console.log(`[Detail Page] Fetch response status: ${response.status}`); // Log response status

          if (!response.ok) {
            let errorMsg = `API Error (${response.status}): Kunne ikke hente analysedetaljer.`; // Include status in error
            try { // Try to parse error from API
                 const errorData = await response.json();
                 console.error('[Detail Page] API error response body:', errorData); // Log error body
                 errorMsg = errorData.error || errorMsg;
            } catch (_) { console.warn('[Detail Page] Could not parse error response body.'); /* Ignore parsing error */ }
            throw new Error(errorMsg);
          }

          console.log('[Detail Page] Fetch successful, parsing JSON...');
          const data: FullAnalysisResult = await response.json();
          console.log('[Detail Page] Data received:', data); // Log received data
          setAnalysisResult(data);

        } catch (fetchError: any) {
          console.error("[Detail Page] Error during fetch or processing:", fetchError);
          setError(fetchError.message || 'Kunne ikke laste inn analysedetaljer.');
        } finally {
          console.log('[Detail Page] Fetch attempt finished, setting loading to false.');
          setIsLoading(false); // Ensure loading is set false in finally
        }
      } else if (status === 'loading') {
          console.log('[Detail Page] Session status is loading, waiting...');
          setIsLoading(true); // Keep loading if session is loading
      } else if (status === 'unauthenticated') {
         // Handle case where user is logged out
         console.log('[Detail Page] Session status is unauthenticated.');
         setError('Du må være logget inn for å se denne siden.');
         setIsLoading(false);
      } else if (!analysisId) {
          console.log('[Detail Page] analysisId is not available yet.');
          // Optionally set error or just wait
          setIsLoading(true); // Keep loading if ID isn't ready
      }
    };

    fetchAnalysisDetails();
  }, [status, analysisId]); // Dependencies for the effect

  // Render Loading State
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 min-h-screen flex justify-center items-center">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-500">Laster analysedetaljer...</span>
      </div>
    );
  }

  // Render Error State
  if (error) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 min-h-screen">
        <Link href="/my-jobs" className="inline-flex items-center text-sm text-blue-600 hover:underline mb-4">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Tilbake til Mine Jobber
        </Link>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Feil:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  // Render Not Found (if fetch completed but no result)
  if (!analysisResult) {
     return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 min-h-screen">
        <Link href="/my-jobs" className="inline-flex items-center text-sm text-blue-600 hover:underline mb-4">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Tilbake til Mine Jobber
        </Link>
        <p className="text-center text-gray-500">Kunne ikke finne den spesifikke analysen.</p>
      </div>
    );
  }

  // Render Analysis Details
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Link href="/my-jobs" className="inline-flex items-center text-sm text-blue-600 hover:underline mb-6">
        <ArrowLeftIcon className="h-4 w-4 mr-1" />
        Tilbake til Mine Jobber
      </Link>

      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        {/* Header Section */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{analysisResult.jobTitle || 'Ukjent Stilling'}</h1>
          {analysisResult.jobDescriptionUrl && (
            <a
              href={analysisResult.jobDescriptionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline break-all"
            >
              {analysisResult.jobDescriptionUrl}
            </a>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Analysert: {new Date(analysisResult.createdAt).toLocaleDateString('nb-NO', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Body Section */}
        <div className="p-6 space-y-8">
          {/* Match Percentage */}
          <div className="text-center">
            <span className="text-5xl font-bold text-indigo-600 dark:text-indigo-400">
                {analysisResult.matchPercentage ?? '-'}%
            </span>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Match Score</p>
          </div>

          {/* Strengths */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Fremhevede Styrker</h2>
            {analysisResult.strengths && analysisResult.strengths.length > 0 ? (
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                {analysisResult.strengths.map((strength, index) => (
                  <li key={`strength-${index}`}>{strength}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">Ingen spesifikke styrker fremhevet i analysen.</p>
            )}
          </div>

          {/* Areas for Improvement */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Mulige Mismatcher / Forbedringsområder</h2>
             {analysisResult.areasForImprovement && analysisResult.areasForImprovement.length > 0 ? (
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                {analysisResult.areasForImprovement.map((weakness, index) => (
                  <li key={`weakness-${index}`}>{weakness}</li>
                ))}
              </ul>
            ) : (
               <p className="text-sm text-gray-500 dark:text-gray-400">Ingen spesifikke forbedringsområder fremhevet i analysen.</p>
            )}
          </div>

           {/* General Feedback */}
           <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Generell Tilbakemelding fra Analyse</h2>
             {analysisResult.feedback && analysisResult.feedback.length > 0 ? (
              <div className="space-y-1 text-gray-700 dark:text-gray-300">
                {analysisResult.feedback.map((fb, index) => (
                  <p key={`feedback-${index}`}>{fb}</p>
                ))}
              </div>
            ) : (
               <p className="text-sm text-gray-500 dark:text-gray-400">Ingen generell tilbakemelding gitt i analysen.</p>
            )}
          </div>

          {/* --- Detailed Category Breakdown --- */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
             <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Detaljert Analyse per Kategori</h2>
             {analysisResult?.resultJson?.categories && analysisResult.resultJson.categories.length > 0 ? (
                <div className="space-y-6">
                  {analysisResult.resultJson.categories.map((category, catIndex) => (
                    <div key={`cat-${catIndex}`} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                       {/* Category Header */} 
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">{category.name}</h3>
                        <span className="text-sm font-semibold px-2 py-1 rounded-md" style={{ backgroundColor: getMatchColor(category.match), color: 'white' }}>
                          {category.match}% Match
                        </span>
                      </div>
                      {/* Category Reasoning Text */}
                      {category.categoryReasoning && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 italic">
                              {category.categoryReasoning}
                          </p>
                      )}
                      {/* Category Details List */} 
                      {category.details && category.details.length > 0 ? (
                        <ul className="space-y-3">
                          {category.details.map((detail, detIndex) => (
                            <li key={`det-${catIndex}-${detIndex}`} className="border-b border-gray-200 dark:border-gray-600 pb-3 last:border-b-0 last:pb-0">
                              <div className="flex justify-between items-start gap-2">
                                <span className="font-medium text-gray-700 dark:text-gray-300 flex-1">
                                  {detail.name}
                                </span>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                   <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${detail.required ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'}`}>
                                     {detail.required ? 'Krav' : 'Ønske'}
                                   </span>
                                  <span className="text-sm font-semibold px-2 py-0.5 rounded-md text-white" style={{ backgroundColor: getMatchColor(detail.match) }}>
                                    {detail.match}%
                                  </span>
                                </div>
                              </div>
                              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {detail.reasoning}
                              </p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">Ingen spesifikke detaljer funnet for denne kategorien.</p>
                      )}
                    </div>
                  ))}
                </div>
             ) : (
               <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                   Ingen detaljert kategorianalyse tilgjengelig.
               </p>
             )}
          </div>

        </div>
      </div>
    </div>
  );
}

// --- Add Helper Function for Match Color ---
// Simple helper to get a color based on match percentage (adjust thresholds/colors as needed)
const getMatchColor = (percentage: number | null | undefined): string => {
    if (percentage == null || isNaN(percentage)) return '#6b7280'; // Gray for unknown
    if (percentage >= 85) return '#10b981'; // Emerald (Good)
    if (percentage >= 65) return '#f59e0b'; // Amber (Okay)
    return '#ef4444'; // Red (Low)
}; 

// ... existing helper functions (formatStatus, getStatusColor, formatDate) ...