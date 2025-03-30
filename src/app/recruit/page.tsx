'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, PlusIcon, XMarkIcon, PlusCircleIcon, EyeIcon, TrashIcon, BuildingOffice2Icon } from "@heroicons/react/24/outline";
import { JobBatch } from "@prisma/client";
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { CreateBatchForm } from '@/components/recruit/CreateBatchForm';
import { Prisma } from '@prisma/client';

// Helper function to format dates
const formatDate = (date: Date | string | null): string => {
  if (!date) return 'N/A';
  // Handle potential string dates from client-side fetch
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  try {
    return format(dateObj, 'PPP', { locale: nb });
  } catch (error) {
    console.error("Error formatting date:", date, error);
    return 'Invalid Date';
  }
};

// Use Prisma helper type for better type safety
type BatchWithCount = Prisma.JobBatchGetPayload<{
  include: { _count: { select: { analysisResults: true } } }
}>;

export default function RecruitDashboardPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [jobBatches, setJobBatches] = useState<BatchWithCount[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errorLoadingData, setErrorLoadingData] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Function to fetch job batches
  const fetchJobBatches = async () => {
    setIsLoadingData(true); 
    setErrorLoadingData(null); 
     try {
      const response = await fetch('/api/recruit/my-batches');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); 
        throw new Error(errorData.error || 'Kunne ikke hente batches');
      }
      const data: BatchWithCount[] = await response.json();
      setJobBatches(data);
    } catch (error) {
      console.error('Failed to fetch batches:', error);
      setErrorLoadingData(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoadingData(false);
    }
  };

  // Handler for when a new batch is created via the form
  const handleBatchCreated = (newBatch: JobBatch) => {
    console.log(`Batch ${newBatch.id} created, adding to list...`);
    const newBatchWithCount: BatchWithCount = {
      ...newBatch,
      _count: { analysisResults: 0 } // Initialize count
    };
    // Add to the top of the list
    setJobBatches(prevBatches => [newBatchWithCount, ...prevBatches]);
    setIsCreateModalOpen(false);
  };

  // --- Add Delete Handler --- 
  const handleDeleteBatch = async (batchId: string, batchTitle: string) => {
    if (window.confirm(`Er du sikker på at du vil slette batchen "${batchTitle}" og alle tilhørende kandidatanalyser? Handlingen kan ikke angres.`)) {
      setIsLoadingData(true); // Indicate loading during delete
       try {
         const response = await fetch(`/api/recruit/batches/${batchId}`, {
           method: 'DELETE',
         });

         if (!response.ok) {
           const errorData = await response.json().catch(() => ({}));
           throw new Error(errorData.error || `Kunne ikke slette batch: ${response.statusText}`);
         }

         // Remove the batch from the state on successful deletion
         setJobBatches(prevBatches => prevBatches.filter(batch => batch.id !== batchId));
         console.log(`Batch ${batchId} deleted successfully.`);
         // Consider using a toast notification library instead of alert for better UX
         // alert('Batch slettet!'); 

       } catch (err: any) {
         console.error("Delete batch error:", err);
         alert(`Feil ved sletting av batch: ${err.message}`); // Keep alert for errors for now
       } finally {
          setIsLoadingData(false); // Stop loading indicator
       }
    }
  };
  // --- End Delete Handler --- 

  const handleOpenModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
  };

  // --- Data Fetching Effect ---
  useEffect(() => {
    // Redirect if not authenticated or not a recruiter
    if (sessionStatus === 'unauthenticated') {
      router.replace('/auth/signin?callbackUrl=/recruit');
      return;
    }
    if (sessionStatus === 'authenticated' && session.user.role !== 'RECRUITER') {
      console.log(`User ${session.user.email} with role ${session.user.role} attempted to access /recruit. Redirecting.`);
      router.replace('/');
      return;
    }

    // Fetch data only when session is loaded and user is a recruiter
    if (sessionStatus === 'authenticated' && session.user.role === 'RECRUITER') {
      fetchJobBatches();
    }

  }, [sessionStatus, session, router]);
  // --- End Data Fetching ---

  // Show loading state while session is loading
  if (sessionStatus === 'loading' || (sessionStatus === 'authenticated' && session.user.role !== 'RECRUITER' && !isLoadingData)) {
    // Display a minimal loading state or null until redirection happens
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p> { /* Or a proper spinner component */}
      </div>
    );
  }
  
  // Render dashboard content
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 py-12">
        <div className="container max-w-6xl"> 
          <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Tilbake til forsiden
          </Link>

          <div className="card bg-card text-card-foreground shadow-lg rounded-lg p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Rekrutterer Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                  Administrer dine stillings-batcher og kandidater her.
                </p>
              </div>
              <button 
                onClick={handleOpenModal}
                className="btn btn-primary w-full sm:w-auto flex items-center justify-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Opprett ny batch</span>
              </button>
            </div>
            
            {/* Job Batches List */}
            <div className="border-t border-border pt-6">
              <h2 className="text-xl font-semibold mb-4">Dine Batcher</h2>
              {isLoadingData ? (
                  <p>Laster batcher...</p>
              ) : errorLoadingData ? (
                  <p className="text-red-600">Feil ved lasting: {errorLoadingData}</p>
              ) : jobBatches.length === 0 ? (
                <div className="text-center py-10 px-4 border border-dashed rounded-md">
                  <p className="text-muted-foreground italic">Du har ingen aktive batcher ennå.</p>
                  <p className="text-sm text-muted-foreground mt-2">Klikk på "Opprett ny batch" for å komme i gang.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                      <tr>
                        <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Tittel</th>
                        <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Kandidater</th>
                        <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Opprettet</th>
                        <th scope="col" className="relative px-4 sm:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Handlinger</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {jobBatches.map((batch) => (
                        <tr key={batch.id} className="hover:bg-muted/50">
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-foreground">{batch.title}</div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-muted-foreground">{batch._count.analysisResults}</div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-muted-foreground">{formatDate(batch.createdAt)}</div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            <Link href={`/recruit/batches/${batch.id}`} className="text-primary hover:underline inline-flex items-center px-2 py-1 rounded hover:bg-muted"
                                  title="Vis detaljer"
                            >
                              <EyeIcon className="h-4 w-4 mr-1"/> Vis
                            </Link>
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent triggering other row/link actions
                                handleDeleteBatch(batch.id, batch.title); // Pass title for confirmation dialog
                              }}
                              className="text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400 inline-flex items-center px-2 py-1 rounded hover:bg-destructive/10"
                              title="Slett batch"
                              aria-label={`Slett batch ${batch.title}`}
                            >
                              <TrashIcon className="h-4 w-4 mr-1" /> Slett
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
        </div>
      </main>

      {/* Create Batch Modal */} 
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-card rounded-lg shadow-xl p-6 w-full max-w-md relative">
            <button 
              onClick={handleCloseModal}
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <h2 className="text-xl font-semibold mb-4">Opprett Ny Batch</h2>
            <CreateBatchForm 
              onBatchCreated={handleBatchCreated} 
              onCancel={() => setIsCreateModalOpen(false)} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
