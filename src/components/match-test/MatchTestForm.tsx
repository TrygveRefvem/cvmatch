'use client';

import { useState, FormEvent } from 'react';

interface MatchResult {
    matchPercentage: number | null;
    feedback: string | null;
}

export default function MatchTestForm() {
  const [cvText, setCvText] = useState('');
  const [jobText, setJobText] = useState('');
  const [result, setResult] = useState<MatchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cvText.trim() || !jobText.trim()) {
      setError('Vennligst lim inn tekst for både CV og stillingsannonse.');
      setResult(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/match-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, jobText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Kunne ikke utføre analysen.');
      }
      
      setResult({ 
          matchPercentage: data.matchPercentage,
          feedback: data.feedback
       });

    } catch (err) {
      console.error("Error in match test form:", err);
      setError(err instanceof Error ? err.message : 'En uventet feil oppstod.');
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getMatchColorClass = (percentage: number | null) => {
    if (percentage === null) return "text-gray-500";
    if (percentage >= 70) return "text-green-600 font-semibold";
    if (percentage >= 40) return "text-yellow-600 font-semibold";
    return "text-red-600 font-semibold";
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="cv-text" className="block text-sm font-medium leading-6 text-gray-900 mb-1">
            CV-tekst <span className="text-red-500">*</span>
          </label>
          <textarea
            id="cv-text"
            name="cv-text"
            rows={15}
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
            required
            disabled={isLoading}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 disabled:opacity-50"
            placeholder="Lim inn teksten fra din CV her..."
          />
        </div>
        <div>
          <label htmlFor="job-text" className="block text-sm font-medium leading-6 text-gray-900 mb-1">
            Stillingsannonse-tekst <span className="text-red-500">*</span>
          </label>
          <textarea
            id="job-text"
            name="job-text"
            rows={15}
            value={jobText}
            onChange={(e) => setJobText(e.target.value)}
            required
            disabled={isLoading}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 disabled:opacity-50"
            placeholder="Lim inn teksten fra stillingsannonsen her..."
          />
        </div>
      </div>

      <div className="flex justify-center pt-4">
        <button
          type="submit"
          disabled={isLoading || !cvText.trim() || !jobText.trim()}
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
        >
          {isLoading ? 'Analyserer...' : 'Test Match'}
        </button>
      </div>

      {/* Results Area */} 
      {(result || error) && (
          <div className={`mt-8 p-6 rounded-lg border ${error ? 'border-red-300 bg-red-50' : 'border-indigo-300 bg-indigo-50'}`}>
              {error && (
                <p className="text-sm font-medium text-red-800 text-center">Feil: {error}</p>
              )}
              {result && (
                  <div className="text-center space-y-3">
                      <p className={`text-4xl font-bold ${getMatchColorClass(result.matchPercentage)}`}>
                          {result.matchPercentage !== null ? `${result.matchPercentage}%` : '?%'}
                      </p>
                      <p className="text-sm text-gray-700">
                          {result.feedback || (result.matchPercentage === null ? 'Kunne ikke beregne match.' : 'Ingen spesifikk tilbakemelding mottatt.')}
                      </p>
                  </div>
              )}
          </div>
      )}
    </form>
  );
} 