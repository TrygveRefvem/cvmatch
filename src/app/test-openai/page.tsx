'use client';

import React, { useState, useEffect } from 'react';

export default function TestOpenAiPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testOpenAI = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/test');
      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error('Error testing OpenAI:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-6">OpenAI API Test</h1>
      
      <button 
        onClick={testOpenAI}
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-6 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test OpenAI Connection'}
      </button>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 max-w-2xl">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
        </div>
      )}
      
      {result && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 max-w-2xl">
          <h2 className="font-bold text-xl mb-2">
            {result.success ? 'Success!' : 'Failed!'}
          </h2>
          <p className="mb-2">{result.message}</p>
          
          <h3 className="font-bold mt-4 mb-2">Configuration:</h3>
          <ul className="list-disc list-inside">
            <li>API Type: {result.config?.baseUrl}</li>
            <li>API Key Set: {result.config?.apiKeySet ? 'Yes' : 'No'}</li>
          </ul>
          
          {result.models && (
            <>
              <h3 className="font-bold mt-4 mb-2">Available Models:</h3>
              <ul className="list-disc list-inside">
                {result.models.map((model: string) => (
                  <li key={model}>{model}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      
      <div className="mt-8 text-sm text-gray-600 max-w-2xl">
        <h3 className="font-semibold mb-2">Troubleshooting:</h3>
        <ul className="list-disc list-inside">
          <li>Make sure your OpenAI API key is set in <code>.env.local</code></li>
          <li>If using Azure OpenAI, ensure that the base URL and API version are correctly configured</li>
          <li>Check the browser console for additional error information</li>
        </ul>
      </div>
    </div>
  );
} 