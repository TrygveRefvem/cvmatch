import getOpenAIClient from "@/lib/openai-client";

export default async function OpenAITestPage() {
  let result: any = { error: null, models: [], success: false };
  let error = null;
  
  try {
    // Get OpenAI client
    const openai = getOpenAIClient();
    
    // Test connection by listing models
    const models = await openai.models.list();
    
    // Update result with success data
    result = {
      success: true,
      models: models.data.slice(0, 5).map(model => model.id),
      config: {
        baseUrl: process.env.OPENAI_API_BASE_URL ? 'Azure OpenAI' : 'Standard OpenAI',
        apiKeySet: !!process.env.OPENAI_API_KEY
      }
    };
  } catch (err) {
    console.error('Error connecting to OpenAI:', err);
    error = err;
    result.error = err instanceof Error ? err.message : 'Unknown error';
  }
  
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">OpenAI API Test (Server Component)</h1>
      
      {error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error occurred:</p>
          <p>{result.error}</p>
        </div>
      ) : (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <h2 className="font-bold text-xl mb-2">
            {result.success ? 'Success!' : 'Testing...'}
          </h2>
          
          <h3 className="font-bold mt-4 mb-2">Configuration:</h3>
          <ul className="list-disc list-inside">
            <li>API Type: {result.config?.baseUrl}</li>
            <li>API Key Set: {result.config?.apiKeySet ? 'Yes' : 'No'}</li>
          </ul>
          
          {result.models && result.models.length > 0 && (
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
      
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Testing Details</h2>
        <p>This is a server component that directly tests the OpenAI API connection.</p>
        <p className="mt-2">The connection is made directly from the server-side during page load.</p>
      </div>
    </div>
  );
} 