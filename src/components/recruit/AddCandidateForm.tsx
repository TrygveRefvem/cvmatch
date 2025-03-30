'use client'

import { useState, FormEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface AddCandidateFormProps {
  batchId: string; // The ID of the batch to add the candidate to
  onSuccess?: () => void; // Callback on success (e.g., close modal)
}

export default function AddCandidateForm({ batchId, onSuccess }: AddCandidateFormProps) {
  const router = useRouter();
  const [candidateEmail, setCandidateEmail] = useState('');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setCvFile(event.target.files[0]);
    } else {
      setCvFile(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cvFile) {
      setError('Vennligst velg en CV-fil.');
      return;
    }
    if (!candidateEmail.trim()) {
      setError('Kandidatens e-post er påkrevd.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('batchId', batchId);
    formData.append('candidateEmail', candidateEmail.trim());
    formData.append('cvFile', cvFile);

    try {
      const response = await fetch('/api/recruit/add-candidate', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Kunne ikke legge til kandidat. Prøv igjen.');
        setIsLoading(false);
      } else {
        setCandidateEmail('');
        setCvFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        setIsLoading(false);
        console.log('Candidate added successfully:', data);
        router.refresh(); 
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err) {
      console.error('Error submitting add candidate form:', err);
      setError('En uventet feil oppstod.');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="candidate-email" className="block text-sm font-medium leading-6 text-gray-900">
          Kandidatens E-post <span className="text-red-500">*</span>
        </label>
        <div className="mt-2">
          <input
            type="email"
            id="candidate-email"
            name="candidate-email"
            value={candidateEmail}
            onChange={(e) => setCandidateEmail(e.target.value)}
            required
            disabled={isLoading}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 disabled:opacity-50"
            placeholder="kandidat@epost.no"
          />
        </div>
      </div>

      <div>
        <label htmlFor="cv-file" className="block text-sm font-medium leading-6 text-gray-900">
          Last opp CV <span className="text-red-500">*</span>
        </label>
        <div className="mt-2">
           <input
            type="file"
            id="cv-file"
            name="cv-file"
            ref={fileInputRef} // Attach ref
            onChange={handleFileChange}
            required
            disabled={isLoading}
            accept=".txt,.pdf,.doc,.docx" // Specify acceptable file types (backend needs support!)
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">Godtatte filtyper: PDF, DOCX, TXT.</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isLoading || !cvFile}
          className="inline-flex justify-center rounded-md bg-indigo-600 py-2 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
        >
          {isLoading ? 'Analyserer og legger til...' : 'Legg til Kandidat'}
        </button>
      </div>
    </form>
  );
} 