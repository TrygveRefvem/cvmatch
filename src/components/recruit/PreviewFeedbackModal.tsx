'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import RejectionEmail from '@/components/emails/RejectionEmail'; // Import the email template

interface PreviewFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisResultId: string | null; 
}

interface PreviewData {
    candidateEmail: string;
    candidateName: string | null;
    jobTitle: string;
    recruiterName: string | null;
    baseFeedback: string;
}

export default function PreviewFeedbackModal({ isOpen, onClose, analysisResultId }: PreviewFeedbackModalProps) {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && analysisResultId) {
      setIsLoading(true);
      setError(null);
      setPreviewData(null); // Clear previous data
      setCustomMessage(''); // Reset custom message

      const fetchPreview = async () => {
        try {
          const response = await fetch('/api/recruit/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ analysisResultId }),
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'Kunne ikke hente forhåndsvisningsdata.');
          }
          setPreviewData(data.previewData);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'En uventet feil oppstod.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchPreview();
    }
  }, [isOpen, analysisResultId]); // Re-fetch when modal opens or target changes

  if (!isOpen || !analysisResultId) {
    return null; // Don't render anything if not open or no ID
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Forhåndsvis Avslags-epost</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */} 
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading && <p className="text-center text-muted-foreground">Laster forhåndsvisning...</p>}
          {error && <p className="text-center text-red-600">Feil: {error}</p>}
          
          {previewData && (
            <div className="space-y-4">
                {/* Display Base Feedback */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Basert på analyse (forslag):
                    </label>
                    <p className="text-sm p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
                        {previewData.baseFeedback}
                    </p>
                </div>

                {/* Custom Message Input */}
                <div>
                    <label htmlFor="customMessage" className="block text-sm font-medium text-gray-700 mb-1">
                        Legg til ytterligere personlig melding (valgfritt):
                    </label>
                    <textarea
                        id="customMessage"
                        rows={3}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        placeholder="F.eks. 'Vi oppfordrer deg til å søke på stilling X i stedet...'"
                    />
                </div>

                {/* Email Preview */}
                <div className="border rounded-md p-1 bg-gray-100">
                     <p className="text-xs text-center text-gray-500 mb-2">E-post forhåndsvisning:</p>
                    <RejectionEmail 
                        candidateName={previewData.candidateName}
                        jobTitle={previewData.jobTitle}
                        baseFeedback={previewData.baseFeedback}
                        customMessage={customMessage || null}
                        recruiterName={previewData.recruiterName}
                    />
                </div>
            </div>
          )}
        </div>

        {/* Footer - just close button for now */}
        <div className="p-4 border-t border-border text-right">
           <button 
             type="button"
             onClick={onClose}
             className="btn btn-outline"
           >
             Lukk
           </button>
           {/* TODO: Add actual 'Send' button later if needed */}
        </div>
      </div>
    </div>
  );
} 