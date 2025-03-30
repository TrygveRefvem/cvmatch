// src/app/my-jobs/page.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation'; // Use next/navigation for App Router
import {
    InformationCircleIcon,
    ArrowPathIcon,
    DocumentMagnifyingGlassIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { JobApplicationStatus } from '@prisma/client'; // Import enum

// --- Types ---
// Type for the summary returned by the API and stored in state
interface AnalysisResultSummary {
  id: string;
  jobTitle: string | null;
  matchPercentage: number | null;
  seekerStatus: JobApplicationStatus;
  createdAt: string; // ISO date string
}

export default function MyJobsPage() {
  const { data: session, status: sessionStatus } = useSession(); // Renamed status to avoid conflict
  const router = useRouter();
  const [jobUrl, setJobUrl] = useState('');
  const [analysisResults, setAnalysisResults] = useState<AnalysisResultSummary[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false); // For form submission loading
  const [isFetchingList, setIsFetchingList] = useState(true); // For initial list loading
  const [deletingId, setDeletingId] = useState<string | null>(null); // Track which item is being deleted
  const [listError, setListError] = useState<string | null>(null); // Error for fetching list
  const [submitError, setSubmitError] = useState<string | null>(null); // Error for form submission
  const [deleteError, setDeleteError] = useState<string | null>(null); // Error for deletion
  const [message, setMessage] = useState<string | null>(null); // For success/info messages

  // Redirect if not authenticated
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/my-jobs'); // Redirect to signin, then back here
    }
  }, [sessionStatus, router]);

  // --- Fetch existing analysis results on load ---
  useEffect(() => {
    const fetchResults = async () => {
      console.log(`[List Page] useEffect fetchResults triggered. Status: ${sessionStatus}`);
      if (sessionStatus === 'authenticated') {
        setIsFetchingList(true);
        setListError(null); // Clear previous list errors
        try {
          // --- Fetch actual list data ---
          console.log('[List Page] Attempting to fetch: /api/seeker/analysis-results');
          const response = await fetch('/api/seeker/analysis-results');

          console.log(`[List Page] List fetch response status: ${response.status}`);

          if (!response.ok) {
             let errorMsg = `API Error (${response.status}): Kunne ikke hente analyseliste.`;
             try {
                  const errorData = await response.json();
                  console.error('[List Page] List API error response body:', errorData);
                  errorMsg = errorData.error || errorMsg;
             } catch (_) { console.warn('[List Page] Could not parse list error response body.'); }
             throw new Error(errorMsg);
          }

          console.log('[List Page] List fetch successful, parsing JSON...');
          const data: AnalysisResultSummary[] = await response.json();
          console.log(`[List Page] List data received (${data.length} items):`, data);
          setAnalysisResults(data);

        } catch (fetchError: any) {
          console.error("[List Page] Error fetching analysis results list:", fetchError);
          setListError(fetchError.message || 'Kunne ikke laste inn tidligere analyser.'); // Set error state for the list
        } finally {
           console.log('[List Page] List fetch attempt finished, setting list loading to false.');
          setIsFetchingList(false);
        }
      } else if (sessionStatus === 'loading') {
          console.log('[List Page] Session status is loading, waiting to fetch list...');
          setIsFetchingList(true); // Keep list loading true if session is loading
      } else { // Unauthenticated
          console.log('[List Page] Session status is unauthenticated, not fetching list.');
          setIsFetchingList(false); // Not loading if not authenticated
      }
    };
    fetchResults();
  }, [sessionStatus]); // Re-fetch list if session status changes


  // --- Handle Form Submission ---
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null); // Clear previous submission errors
    setMessage(null);

    if (!jobUrl.trim()) {
      setSubmitError('Jobb-URL kan ikke være tom.');
      return;
    }
    try {
        new URL(jobUrl);
    } catch (_) {
        setSubmitError('Vennligst skriv inn en gyldig URL.');
        return;
    }

    setIsSubmitting(true); // Use separate loading state for submission

    try {
      const response = await fetch('/api/seeker/analyze-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobUrl }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'En ukjent feil oppstod under analysen.');
      }

      // Add the new result to the top of the list
      if (result.success && result.analysisSummary) {
        setAnalysisResults(prevResults => [result.analysisSummary, ...prevResults]);
        setMessage(result.message || 'Jobb analysert!');
        setJobUrl(''); // Clear input field on success
      } else {
         throw new Error('Fikk et uventet svar fra serveren.');
      }

    } catch (error: any) {
      console.error('Error submitting job for analysis:', error);
      setSubmitError(error.message || 'Kunne ikke sende jobb for analyse.');
    } finally {
      setIsSubmitting(false); // Set submission loading false
    }
  };

  // --- Handle Delete Action ---
  const handleDelete = async (idToDelete: string) => {
    // Basic confirmation prompt
    if (!window.confirm('Er du sikker på at du vil slette denne analysen?')) {
      return;
    }

    setDeletingId(idToDelete); // Set loading state for this specific item
    setDeleteError(null); // Clear previous delete errors
    setMessage(null); // Clear previous success messages

    try {
      const response = await fetch(`/api/seeker/analysis-results/${idToDelete}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Kunne ikke slette analysen.');
      }

      // Remove the item from the state
      setAnalysisResults(prevResults => prevResults.filter(result => result.id !== idToDelete));
      setMessage(result.message || 'Analyse slettet!'); // Show success message

    } catch (error: any) {
      console.error('Error deleting analysis:', error);
      setDeleteError(error.message || 'En feil oppstod under sletting.');
    } finally {
      setDeletingId(null); // Clear loading state regardless of outcome
    }
  };


  // --- Render Logic ---
  if (sessionStatus === 'loading') {
    // Show a simple loading state while session is loading
    return (
         <div className="container mx-auto p-4 sm:p-6 lg:p-8 min-h-screen flex justify-center items-center">
             <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-500" />
             <span className="ml-2 text-gray-500">Laster...</span>
         </div>
    );
  }

  // If unauthenticated after loading, router should have redirected, but show message just in case
  if (sessionStatus === 'unauthenticated') {
      return (
         <div className="container mx-auto p-4 sm:p-6 lg:p-8 min-h-screen">
              <p className="text-center text-red-600">Du må være logget inn for å se denne siden.</p>
              {/* Optional: Add a link to login */}
              <div className="text-center mt-4">
                  <Link href="/auth/signin?callbackUrl=/my-jobs" className="btn btn-primary">
                       Logg inn
                  </Link>
              </div>
         </div>
      );
  }

  // Authenticated view
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">

      {/* Form Section */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Analyser en ny jobb</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Lim inn URL-en til en stillingsannonse for å analysere din CV mot den.</p>

        {/* Submission Error/Success Messages */}
        {submitError && <p className="text-sm text-red-600 dark:text-red-400 mt-3">{submitError}</p>}
        {message && <p className="text-sm text-green-600 dark:text-green-400 mt-3">{message}</p>}

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col sm:flex-row items-start gap-3">
          <div className="flex-grow w-full sm:w-auto">
             <label htmlFor="jobUrl" className="sr-only">Jobbannonse URL</label>
             <input
                id="jobUrl"
                name="jobUrl"
                type="url"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="https://www.example.com/job-posting"
                required
                disabled={isSubmitting}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:focus:ring-indigo-500 sm:text-sm sm:leading-6 disabled:opacity-50"
             />
          </div>
          <button
             type="submit"
             disabled={isSubmitting}
             className="btn btn-primary inline-flex items-center justify-center gap-2 flex-shrink-0 w-full sm:w-auto"
          >
            {isSubmitting ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
            ) : (
                <DocumentMagnifyingGlassIcon className="h-5 w-5" />
            )}
            {isSubmitting ? 'Analyserer...' : 'Analyser Jobb'}
          </button>
        </form>
      </div>

      {/* Analysis Results List Section */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Dine Lagrede Analyser</h2>

        {/* Display Delete Error if any */}
        {deleteError && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Slettefeil:</strong>
                <span className="block sm:inline"> {deleteError}</span>
                <button onClick={() => setDeleteError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3">
                   <span className="text-2xl" aria-hidden="true">&times;</span>
                </button>
            </div>
        )}

        {/* List Loading State */}
        {isFetchingList && (
           <div className="flex justify-center items-center py-6">
                <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-500 dark:text-gray-400" />
                <span className="ml-2 text-gray-500 dark:text-gray-400">Laster analyser...</span>
           </div>
        )}

        {/* List Error State */}
        {!isFetchingList && listError && (
             <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Feil:</strong>
                <span className="block sm:inline"> {listError}</span>
             </div>
        )}

        {/* Empty List State */}
        {!isFetchingList && !listError && analysisResults.length === 0 && (
          <div className="text-center py-6">
             <InformationCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
             <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">Ingen analyser funnet</h3>
             <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Start med å analysere en jobb ved å lime inn URL-en over.</p>
          </div>
        )}

        {/* Results Table */}
        {!isFetchingList && !listError && analysisResults.length > 0 && (
          <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Jobbtittel
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Match
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Status
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Analysert
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Handlinger
                          </th>
                      </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {analysisResults.map(result => (
                          <tr key={result.id}>
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {result.jobTitle || 'Ukjent Stilling'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                  {result.matchPercentage != null ? `${result.matchPercentage}%` : '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(result.seekerStatus)}`}>
                                    {formatStatus(result.seekerStatus)}
                                  </span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                  {formatDate(result.createdAt)}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                  <Link href={`/my-jobs/${result.id}`} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                                    Detaljer
                                  </Link>
                                  <button
                                     onClick={() => handleDelete(result.id)}
                                     disabled={deletingId === result.id} // Disable button while deleting this specific item
                                     className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                     title="Slett analyse"
                                   >
                                    {deletingId === result.id ? (
                                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <TrashIcon className="h-4 w-4" />
                                    )}
                                   </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
        )}
      </div>
    </div>
  );
}


// --- Helper Functions ---

// Function to format the JobApplicationStatus enum
const formatStatus = (status: JobApplicationStatus): string => {
  switch (status) {
    case JobApplicationStatus.NOT_APPLIED: return 'Ikke søkt';
    case JobApplicationStatus.APPLIED: return 'Søkt';
    case JobApplicationStatus.INTERVIEWING: return 'Intervju'; // Corrected
    case JobApplicationStatus.OFFER_RECEIVED: return 'Tilbud'; // Corrected
    case JobApplicationStatus.REJECTED_BY_COMPANY: return 'Avslått'; // Corrected
    case JobApplicationStatus.WITHDRAWN: return 'Trukket';
    // Add ACCEPTED if it exists in your enum
    // case JobApplicationStatus.ACCEPTED: return 'Akseptert';
    default: return status; // Fallback
  }
};

// Function to get tailwind color classes based on status
const getStatusColor = (status: JobApplicationStatus): string => {
  switch (status) {
    case JobApplicationStatus.NOT_APPLIED: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    case JobApplicationStatus.APPLIED: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case JobApplicationStatus.INTERVIEWING: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'; // Corrected
    case JobApplicationStatus.OFFER_RECEIVED: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'; // Corrected
    case JobApplicationStatus.REJECTED_BY_COMPANY: return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'; // Corrected
    case JobApplicationStatus.WITHDRAWN: return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
     // Add ACCEPTED if it exists in your enum
    // case JobApplicationStatus.ACCEPTED: return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200\';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'; // Default/Fallback
  }
};

// Function to format date string
const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleDateString('nb-NO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (e) {
    console.error("Error formatting date:", dateString, e);
    return 'Ugyldig dato';
  }
};