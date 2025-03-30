'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, XMarkIcon, ChevronDownIcon, ChevronUpIcon, TrashIcon, EnvelopeIcon, EyeIcon, PlusCircleIcon } from "@heroicons/react/24/outline";
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import AddCandidateForm from '@/components/recruit/AddCandidateForm';
import React from 'react';
import PreviewFeedbackModal from '@/components/recruit/PreviewFeedbackModal';
import { JobBatch, AnalysisResult, User } from "@prisma/client";

// --- Types (Adapted for Detailed Comparison) ---
interface AnalysisDetail {
  name: string;
  match: number;
  required: boolean;
  reasoning: string;
}

interface AnalysisCategory {
  name: string;
  match: number;
  details: AnalysisDetail[];
}

const formatDate = (date: Date | string | null): string => {
  if (!date) return 'N/A';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  try {
    return format(dateObj, 'PPP', { locale: nb });
  } catch (error) {
    console.error("Error formatting date:", error);
    return 'Invalid Date';
  }
};

interface DetailedAnalysisJson {
  overallMatch: number | null;
  jobTitle?: string;
  companyName?: string;
  categories: AnalysisCategory[];
  feedback: string[];
  strengths: string[];
  weaknesses: string[];
}

interface JobDescriptionText {
  // Define structure if specific parsing is done, otherwise string is fine
}

// Combined type for Candidate Row Data
type CandidateResult = AnalysisResult & {
  user: Pick<User, 'id' | 'name' | 'email'>;
  parsedJson?: DetailedAnalysisJson | null;
  strengthsCount: number;
  areasForImprovementCount: number;
};

// Type for the full batch details with parsed candidates
// Use analysisResults consistently
type BatchDetailsWithParsedCandidates = Omit<JobBatch, 'analysisResults'> & {
  analysisResults: CandidateResult[];
  jobDescriptionUrl?: string;
};

// Type for the state holding fetched batch data from the API
// Use analysisResults consistently
type BatchData = JobBatch & {
  widgetToken: string;
  // Expect analysisResults from the API based on route.ts
  analysisResults: (AnalysisResult & {
    user: Pick<User, 'id' | 'name' | 'email'> | null;
    strengthsCount: number;
    areasForImprovementCount: number;
  })[];
};

// --- Helper Functions for Comparison View ---
interface UniqueDetailInfo {
    name: string;
    isRequired: boolean;
}

function getAllUniqueDetails(candidates: CandidateResult[]) {
    const detailsMap = new Map<string, boolean>();

    candidates.forEach(candidate => {
        candidate.parsedJson?.categories?.forEach((category: AnalysisCategory) => {
            category.details?.forEach((detail: AnalysisDetail) => {
                const currentIsRequired = detailsMap.get(detail.name) || false;
                detailsMap.set(detail.name, currentIsRequired || detail.required);
            });
        });
    });

    return Array.from(detailsMap, ([name, isRequired]) => ({ name, isRequired }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

const getMatchColorClass = (percentage: number | null | undefined) => {
  if (percentage === null || typeof percentage === 'undefined') return "text-gray-500";
  if (percentage >= 70) return "text-green-600 font-semibold";
  if (percentage >= 40) return "text-yellow-600 font-semibold";
  return "text-red-600 font-semibold";
};
// --- End Helper Functions ---

// --- Sub-Components (BatchDetailsView, ComparisonView) ---

interface BatchDetailsViewProps {
    batchDetails: BatchDetailsWithParsedCandidates | null; 
    selectedCandidates: string[];
    onSelectCandidate: (candidateId: string) => void;
    onCompare: () => void;
    onAddCandidate: () => void;
    onPreviewFeedback: (candidateId: string) => void; 
}

const BatchDetailsView: React.FC<BatchDetailsViewProps> = (
    { batchDetails, selectedCandidates, onSelectCandidate, onCompare, onAddCandidate, onPreviewFeedback } 
) => {
    const analysisResults = batchDetails?.analysisResults || []; 

    if (!batchDetails) {
        return <div className="text-center text-gray-500">Kunne ikke laste batch detaljer for visning.</div>;
    }

    return (
        <div>
             {/* Batch Header & Metadata Card (using standard div styling) */}
            <div className="mb-6 p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{batchDetails.title}</h1>
                        {batchDetails.description && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{batchDetails.description}</p>}
                    </div>
                    <button 
                        onClick={onAddCandidate}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                         <PlusCircleIcon className="mr-2 h-5 w-5" />
                        Legg til Kandidat
                    </button>
                </div>
                 <div className="text-xs text-gray-500 dark:text-gray-500">
                    <p>Opprettet: {format(new Date(batchDetails.createdAt), 'PPP', { locale: nb })}</p>
                    {batchDetails.jobDescriptionUrl && (
                        <p>Stilling: <a href={batchDetails.jobDescriptionUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{batchDetails.jobDescriptionUrl}</a></p>
                    )}
                </div>
            </div>

            {/* Candidates Table Card (using standard div styling) */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Kandidater ({analysisResults.length})</h2>
                    {selectedCandidates.length >= 2 && (
                        <button 
                            onClick={onCompare} 
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Sammenlign valgte ({selectedCandidates.length})
                        </button>
                    )}
                </div>

                {analysisResults.length === 0 ? (
                     <p className="text-center py-10 text-gray-500 dark:text-gray-400">Ingen kandidater er lagt til i denne batchen ennå.</p>
                ) : (
                     <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                         {/* ... table contents ... */}
                     </table>
                 )}
            </div>
        </div>
    );
};

// --- ComparisonView Component ---

export default function BatchDetailPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const batchId = params.batchId as string;

  const [batchDetails, setBatchDetails] = useState<BatchDetailsWithParsedCandidates | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddCandidateModalOpen, setIsAddCandidateModalOpen] = useState(false);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<{ [detailName: string]: boolean }>({});
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const [feedbackCandidateId, setFeedbackCandidateId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [batchData, setBatchData] = useState<BatchData | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!batchId) return;
    if (sessionStatus === 'unauthenticated') {
      router.push(`/auth/signin?callbackUrl=/recruit/batches/${batchId}`);
      return;
    }
    if (sessionStatus === 'authenticated' && session.user.role !== 'RECRUITER') {
      router.push('/');
      return;
    }

    if (sessionStatus === 'authenticated' && session.user.role === 'RECRUITER') {
      const fetchBatchDetails = async () => {
        setIsLoading(true);
        setError(null);
        setDeleteError(null);
        try {
          const response = await fetch(`/api/recruit/batches/${batchId}`);
          if (response.status === 404) throw new Error('Batch ikke funnet eller ikke tilgang.');
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch batch details');
          }
          const data: BatchData = await response.json();
          setBatchData(data);

          // Use data.analysisResults, default to [] if missing/null
          const resultsToProcess = data.analysisResults || []; 
          
          const processedCandidates = resultsToProcess.map((res: any) => {
            let parsedJson: DetailedAnalysisJson | null = null;
            try {
                if (res.resultJson && typeof res.resultJson === 'object' && res.resultJson !== null) {
                    if ('categories' in res.resultJson && 'overallMatch' in res.resultJson) {
                         parsedJson = res.resultJson as DetailedAnalysisJson;
                    } else {
                         console.warn(`Result ${res.id} has unexpected JSON structure in object.`);
                    }
                } else if (typeof res.resultJson === 'string') {
                    const tempParsed = JSON.parse(res.resultJson);
                     if ('categories' in tempParsed && 'overallMatch' in tempParsed) {
                        parsedJson = tempParsed;
                    } else {
                         console.warn(`Result ${res.id} has unexpected JSON structure in string.`);
                    }
                }
            } catch (parseError) {
                console.error(`Error parsing resultJson for analysis ${res.id}:`, parseError, res.resultJson);
            }
             try {
                if(parsedJson && typeof res.strengths === 'string') parsedJson.strengths = JSON.parse(res.strengths);
                if(parsedJson && typeof res.feedback === 'string') parsedJson.feedback = JSON.parse(res.feedback);
                if(parsedJson && typeof res.areasForImprovement === 'string') parsedJson.weaknesses = JSON.parse(res.areasForImprovement);
             } catch (arrayParseError) {
                  console.error(`Error parsing stringified array fields for analysis ${res.id}:`, arrayParseError);
             }

            return { ...res, parsedJson, strengthsCount: res.strengthsCount, areasForImprovementCount: res.areasForImprovementCount };
          });

          setBatchDetails({ 
              ...data, 
              analysisResults: processedCandidates
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Could not load batch details.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchBatchDetails();
    }
  }, [sessionStatus, session, router, batchId, refetchTrigger]);

  const handleCandidateAdded = () => {
    setIsAddCandidateModalOpen(false);
    setRefetchTrigger(prev => prev + 1);
  };
  
  const handleCloseModal = () => setIsAddCandidateModalOpen(false);

  const handleSelectCandidate = (candidateId: string) => {
    setSelectedCandidateIds(prev =>
      prev.includes(candidateId)
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const selectAllCandidates = () => {
    setSelectedCandidateIds(batchDetails?.analysisResults.map(c => c.id) || []);
  };

  const clearSelection = () => {
    setSelectedCandidateIds([]);
  };

  const handleDeleteCandidate = async (candidateResultId: string, candidateName: string) => {
    if (deletingId) return;
    const confirmed = window.confirm(
      `Er du sikker på at du vil slette analysen for ${candidateName}? Handlingen kan ikke angres.`
    );
    if (confirmed) {
      setDeletingId(candidateResultId);
      setDeleteError(null);
      try {
        const response = await fetch(`/api/recruit/analysis/${candidateResultId}`, { method: 'DELETE' });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Kunne ikke slette analyse');
        }
        setBatchDetails((prev: BatchDetailsWithParsedCandidates | null) => {
          if (!prev) return null;
          return {
            ...prev,
            analysisResults: prev.analysisResults.filter((res: CandidateResult) => res.id !== candidateResultId)
          };
        });
        setSelectedCandidateIds((prev: string[]) => prev.filter((id: string) => id !== candidateResultId));
      } catch (err) {
        console.error("Error deleting candidate analysis:", err);
        setDeleteError(err instanceof Error ? err.message : 'En feil oppstod ved sletting.');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const toggleDetailExpansion = (detailName: string) => {
    setExpandedDetails(prev => ({
      ...prev,
      [detailName]: !prev[detailName]
    }));
  };

  const handleOpenFeedbackModal = (candidateId: string) => {
    setFeedbackCandidateId(candidateId);
  };
  const handleCloseFeedbackModal = () => {
    setFeedbackCandidateId(null);
  };

  const widgetApiUrl = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/widget/apply` : '/api/widget/apply';

  const embedCode = batchData?.widgetToken
    ? `<div id="cvmatch-apply-widget-container"></div>
<script>
  window.cvMatchConfig = {
    token: "${batchData.widgetToken}",
    apiUrl: "${widgetApiUrl}"
  };
  (function() {
    var script = document.createElement('script');
    script.src = "${process.env.NEXT_PUBLIC_APP_URL || ''}/widget/apply.js";
    script.async = true;
    document.body.appendChild(script);
  })();
</script>`
    : '';

  const copyToClipboard = () => {
    if (embedCode) {
      navigator.clipboard.writeText(embedCode).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }, (err) => {
        console.error('Failed to copy embed code: ', err);
      });
    }
  };

  if (isLoading || sessionStatus === 'loading') {
    return <div className="flex items-center justify-center min-h-screen"><p>Laster inn...</p></div>;
  }
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Feil</h1>
          <p className="text-muted-foreground mt-2">{error}</p>
          <Link href="/recruit" className="mt-4 inline-block text-primary hover:underline">Tilbake til Dashboard</Link>
        </div>
      </div>
    );
  }
  if (!batchDetails) {
    return <div className="flex items-center justify-center min-h-screen"><p>Kunne ikke laste batch detaljer.</p></div>;
  }

  const allCandidates = batchDetails.analysisResults;
  const candidatesToCompare = allCandidates.filter(c => selectedCandidateIds.includes(c.id));
  const uniqueDetails = getAllUniqueDetails(candidatesToCompare);

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 py-12">
        <div className="container max-w-7xl">
          <Link href="/recruit" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />Tilbake til Dashboard
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-1">{batchDetails.title}</h1>
            {batchDetails.jobDescriptionUrl && (
                 <p className="text-sm text-muted-foreground mb-2">
                   <a href={batchDetails.jobDescriptionUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">Se opprinnelig stillingsannonse</a>
                 </p>
            )}
            {batchDetails.description && <p className="text-muted-foreground">{batchDetails.description}</p>}
          </div>

          {embedCode && (
            <div className="mt-8 p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Integrer "Søk nå"-knapp (Widget)</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Lim inn følgende kode på nettsiden der stillingsannonsen din vises for å la kandidater søke direkte via CVMatch.
                </p>
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-x-auto relative border border-gray-300 dark:border-gray-600">
                    <pre className="text-sm font-mono whitespace-pre-wrap break-words text-gray-700 dark:text-gray-300">
                    <code>{embedCode}</code>
                    </pre>
                    <button
                    onClick={copyToClipboard}
                    className="absolute top-2 right-2 px-2 py-1 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors duration-150"
                    >
                    {isCopied ? 'Kopiert!' : 'Kopier kode'}
                    </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    Merk: Du må sørge for at widget-skriptet (`/widget/apply.js`) er tilgjengelig fra din server/hosting.
                </p>
                 {/* Add Test Widget Link */} 
                 <div className="mt-4">
                     <Link 
                         href={`/recruit/widget-test/${batchDetails.id}`}
                         className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                     >
                         Test Widget på en demosider &rarr;
                     </Link>
                 </div>
            </div>
          )}

          <div className="card bg-card text-card-foreground shadow-lg rounded-lg p-6 sm:p-8 mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h2 className="text-xl font-semibold">Kandidater i Batchen ({allCandidates.length})</h2>
                <p className="text-sm text-muted-foreground">Velg kandidater for å sammenligne nedenfor.</p>
              </div>
              <div className="flex gap-2 flex-wrap w-full sm:w-auto">
                <button onClick={() => setIsAddCandidateModalOpen(true)} className="btn btn-secondary btn-sm flex-1 sm:flex-none">Legg til Kandidat</button>
                <button onClick={selectAllCandidates} className="btn btn-outline btn-sm flex-1 sm:flex-none" disabled={allCandidates.length === 0}>Velg alle</button>
                <button onClick={clearSelection} className="btn btn-outline btn-sm flex-1 sm:flex-none" disabled={selectedCandidateIds.length === 0}>Tøm valg</button>
              </div>
            </div>

            {deleteError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm my-4">
                Feil ved sletting: {deleteError}
              </div>
            )}

            {allCandidates.length === 0 ? (
              <p className="text-muted-foreground italic text-center py-6">Ingen kandidater er lagt til i denne batchen ennå.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allCandidates.map((candidate: CandidateResult) => (
                  <div key={candidate.id} className={`rounded-lg border hover:border-primary/50 ${selectedCandidateIds.includes(candidate.id) ? 'border-primary bg-primary/5' : 'border-muted'} ${deletingId === candidate.id ? 'opacity-50 animate-pulse' : ''}`}>
                    <label className={`flex items-center p-3 cursor-pointer`}>
                      <input
                        type="checkbox"
                        className="mr-3 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                        checked={selectedCandidateIds.includes(candidate.id)}
                        onChange={() => handleSelectCandidate(candidate.id)}
                        disabled={!!deletingId}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate" title={candidate.user?.name || candidate.user?.email || 'Ukjent'}>{candidate.user?.name || candidate.user?.email || 'Ukjent'}</p>
                        <p className="text-xs text-muted-foreground">{candidate.user?.email}</p>
                      </div>
                      <div className="ml-auto flex items-center space-x-1 flex-shrink-0 pl-2">
                        <Link
                          href={`/recruit/batches/${batchId}/results/${candidate.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded text-primary hover:bg-primary/10"
                          target="_blank"
                          title="Vis detaljer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Zm3.75 11.625a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
                        </Link>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleOpenFeedbackModal(candidate.id);
                          }}
                          disabled={!!deletingId || !!candidate.rejectionSentAt}
                          className={`text-muted-foreground hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed p-1 rounded`}
                          title={candidate.rejectionSentAt ? `Avslag sendt ${formatDate(candidate.rejectionSentAt)}` : "Forhåndsvis avslag"}
                        >
                          <EnvelopeIcon className={`h-4 w-4 ${candidate.rejectionSentAt ? 'text-green-600' : ''}`} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleDeleteCandidate(candidate.id, candidate.user?.name || candidate.user?.email || 'denne kandidaten');
                          }}
                          disabled={!!deletingId}
                          className={`text-muted-foreground hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed p-1 rounded`}
                          title="Slett analyse"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <span className={`ml-2 text-sm font-semibold ${getMatchColorClass(candidate.matchPercentage)} flex-shrink-0`}>
                        {candidate.matchPercentage ?? '-'}%
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedCandidateIds.length > 0 && (
            <div className="card bg-card text-card-foreground shadow-lg rounded-lg p-0 overflow-hidden">
              <h2 className="text-xl font-semibold p-6 border-b">Sammenligning av valgte kandidater ({selectedCandidateIds.length})</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/50 sticky top-0 z-10">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider sticky left-0 bg-inherit z-20 min-w-[200px]">Kriterie</th>
                      {candidatesToCompare.map(candidate => (
                        <th key={candidate.id} scope="col" className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[150px]">
                          <div className="flex flex-col items-center">
                            <span className="font-semibold text-foreground text-sm truncate max-w-[140px]" title={candidate.user.name || candidate.user.email || 'Ukjent'}>
                              {candidate.user.name || candidate.user.email || 'Ukjent'}
                            </span>
                            <span className={`text-lg font-bold ${getMatchColorClass(candidate.matchPercentage)}`}>
                              {candidate.matchPercentage ?? '-'}%
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {uniqueDetails.map((detailInfo: UniqueDetailInfo, detailIndex: number) => {
                      const isExpanded = expandedDetails[detailInfo.name];
                      return (
                        <React.Fragment key={detailInfo.name}>
                          <tr className={detailIndex % 2 ? 'bg-muted/50' : 'bg-card'}>
                            <td 
                              className="px-4 py-3 whitespace-nowrap text-sm font-medium text-foreground sticky left-0 z-10 bg-inherit cursor-pointer hover:bg-muted/80" 
                              onClick={() => toggleDetailExpansion(detailInfo.name)}
                              title={`Klikk for ${isExpanded ? 'å lukke' : 'å vise'} begrunnelse`}
                            >
                              <div className="flex items-center justify-between">
                                <span>
                                  {detailInfo.name}
                                  {detailInfo.isRequired && <span className="text-red-500 ml-1" title="Påkrevd">*</span>}
                                </span>
                                {isExpanded ? <ChevronUpIcon className="h-4 w-4 ml-1 text-muted-foreground" /> : <ChevronDownIcon className="h-4 w-4 ml-1 text-muted-foreground" />}
                              </div>
                            </td>
                            {candidatesToCompare.map((candidate: CandidateResult) => {
                              let detailMatch: number | null = null;
                              candidate.parsedJson?.categories?.forEach((category: AnalysisCategory) => {
                                const foundDetail = category.details?.find((d: AnalysisDetail) => d.name === detailInfo.name);
                                if (foundDetail) detailMatch = foundDetail.match;
                              });
                              return (
                                <td key={`${candidate.id}-${detailInfo.name}`} className="px-4 py-3 whitespace-nowrap text-sm text-center text-muted-foreground">
                                  {detailMatch !== null ? (<span className={getMatchColorClass(detailMatch)}>{detailMatch}%</span>) : (<span>—</span>)}
                                </td>
                              );
                            })}
                          </tr>
                          {isExpanded && (
                            <tr className={`bg-muted/20 ${detailIndex % 2 ? '' : 'border-t'}`}>
                              <td className="px-4 py-2 text-xs font-semibold text-muted-foreground sticky left-0 z-10 bg-inherit italic">Begrunnelse:</td>
                              {candidatesToCompare.map((candidate: CandidateResult) => {
                                let reasoning: string | null = null;
                                candidate.parsedJson?.categories?.forEach((category: AnalysisCategory) => {
                                  const foundDetail = category.details?.find((d: AnalysisDetail) => d.name === detailInfo.name);
                                  if (foundDetail?.reasoning) reasoning = foundDetail.reasoning;
                                });
                                return (
                                  <td key={`${candidate.id}-${detailInfo.name}-reasoning`} className="px-4 py-2 text-xs text-muted-foreground align-top">
                                    {reasoning}
                                  </td>
                                );
                              })}
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                    <tr className={uniqueDetails.length % 2 ? 'bg-muted/50' : 'bg-card'}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-foreground align-top sticky left-0 z-10 bg-inherit">Styrker</td>
                      {candidatesToCompare.map((candidate: CandidateResult) => (
                        <td key={`${candidate.id}-strengths`} className="px-4 py-3 text-xs text-muted-foreground align-top">
                          {candidate.parsedJson?.strengths && candidate.parsedJson.strengths.length > 0 ? (
                            <ul className="list-disc pl-4 space-y-1">
                              {candidate.parsedJson.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                            </ul>
                          ) : (
                            <span>—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className={(uniqueDetails.length + 1) % 2 ? 'bg-muted/50' : 'bg-card'}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-foreground align-top sticky left-0 z-10 bg-inherit">Forbedringsområder</td>
                      {candidatesToCompare.map((candidate: CandidateResult) => (
                        <td key={`${candidate.id}-weaknesses`} className="px-4 py-3 text-xs text-muted-foreground align-top">
                          {candidate.parsedJson?.weaknesses && candidate.parsedJson.weaknesses.length > 0 ? (
                            <ul className="list-disc pl-4 space-y-1">
                              {candidate.parsedJson.weaknesses.map((w: string, i: number) => <li key={i}>{w}</li>)}
                            </ul>
                          ) : (
                            <span>—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className={(uniqueDetails.length + 2) % 2 ? 'bg-muted/50' : 'bg-card'}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-foreground align-top sticky left-0 z-10 bg-inherit">Tilbakemelding</td>
                      {candidatesToCompare.map((candidate: CandidateResult) => (
                        <td key={`${candidate.id}-feedback`} className="px-4 py-3 text-xs text-muted-foreground align-top">
                          {candidate.parsedJson?.feedback && candidate.parsedJson.feedback.length > 0 ? (
                            <ul className="list-disc pl-4 space-y-1">
                              {candidate.parsedJson.feedback.map((f: string, i: number) => <li key={i}>{f}</li>)}
                            </ul>
                          ) : (
                            <span>—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {isAddCandidateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-lg shadow-xl p-6 w-full max-w-md relative">
            <button
              onClick={handleCloseModal}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold mb-4">Legg til ny kandidat</h2>
            <AddCandidateForm batchId={batchId} onSuccess={handleCandidateAdded} />
          </div>
        </div>
      )}

      {feedbackCandidateId && (
        <PreviewFeedbackModal 
          isOpen={!!feedbackCandidateId}
          onClose={handleCloseFeedbackModal}
          analysisResultId={feedbackCandidateId}
        />
      )}
    </div>
  );
} 