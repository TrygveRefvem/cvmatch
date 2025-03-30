'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { JobBatch } from '@prisma/client'; // Keep Prisma import

// Optional: Define props if needed, e.g., for closing a modal
interface CreateBatchFormProps {
  onBatchCreated: (newBatch: JobBatch) => void; // Add callback prop
  onCancel: () => void;
}

export function CreateBatchForm({ onBatchCreated, onCancel }: CreateBatchFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [jobDescriptionUrl, setJobDescriptionUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isValidUrl = (urlString: string): boolean => {
    try {
      new URL(urlString);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!title.trim()) {
      setError('Tittel for batchen kan ikke være tom.');
      return;
    }
    if (!jobDescriptionUrl.trim()) {
        setError('URL for stillingsannonse kan ikke være tom.');
        return;
    }
    if (!isValidUrl(jobDescriptionUrl)) {
        setError('URL for stillingsannonse er ugyldig.');
        return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/recruit/batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), jobDescriptionUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Noe gikk galt under oppretting av batch.');
      }

      // Success!
      const newBatch = data as JobBatch;
      setSuccess(`Batch "${newBatch.title}" opprettet.`);
      setTitle('');
      setDescription('');
      setJobDescriptionUrl('');
      
      // Call the callback function with the new batch data
      onBatchCreated(newBatch); 
      
      // Optionally close the form/modal after a short delay
      // setTimeout(onCancel, 1500); // Close after 1.5 seconds

    } catch (err: any) {
      console.error("Create batch error:", err);
      setError(err.message || 'En ukjent feil oppstod.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
          <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">
            <span className="font-medium">Feil!</span> {error}
          </div>
      )}
      {success && (
          <div className="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg dark:bg-green-200 dark:text-green-800" role="alert">
             <span className="font-medium">Suksess!</span> {success}
          </div>
      )}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Batch Tittel *
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
          placeholder="F.eks. Senior Utviklere Q3 2024"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-indigo-500 dark:focus:border-indigo-500"
          disabled={isLoading}
        />
      </div>
      <div>
        <label htmlFor="jobDescriptionUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Stillingsannonse URL *
        </label>
        <input
          id="jobDescriptionUrl"
          type="url"
          value={jobDescriptionUrl}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJobDescriptionUrl(e.target.value)}
          placeholder="https://www.example.com/job-posting"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-indigo-500 dark:focus:border-indigo-500"
          disabled={isLoading}
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Beskrivelse (Valgfritt)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
          placeholder="En kort beskrivelse av denne batchen eller stillingen."
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-indigo-500 dark:focus:border-indigo-500"
          disabled={isLoading}
        />
      </div>
      <div className="flex justify-end space-x-3 pt-2">
         <button
           className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-500 disabled:opacity-50"
           onClick={onCancel} 
           disabled={isLoading}
         >
           Avbryt
         </button>
         <button type="submit"
           className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
           disabled={isLoading}
         >
           {isLoading ? 'Oppretter...' : 'Opprett Batch'}
         </button>
      </div>
    </form>
  );
} 