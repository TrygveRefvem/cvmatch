'use client';

import { useEffect, useState, useRef } from 'react';

interface WidgetTesterProps {
  batchTitle: string;
  widgetToken: string;
}

export default function WidgetTester({ batchTitle, widgetToken }: WidgetTesterProps) {
  const [showEmbedCode, setShowEmbedCode] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const scriptAddedRef = useRef(false); // Ref to track if script has been added

  // Construct URLs safely, ensuring NEXT_PUBLIC_APP_URL is defined
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const widgetApiUrl = `${appUrl}/api/widget/apply`;
  // Use a root-relative path for the script URL
  const widgetScriptUrl = '/apply.js';

  const embedCode = `<div id="cvmatch-apply-widget-container"></div>
<script>
  // Ensure window object exists (runs in browser)
  if (typeof window !== 'undefined') {
    window.cvMatchConfig = {
      token: "${widgetToken}",
      apiUrl: "${widgetApiUrl}"
      // Optional: Add button text customization here
      // buttonText: "Apply with CVMatch"
    };
    (function() {
      var script = document.createElement('script');
      script.src = "${widgetScriptUrl}";
      script.async = true;
      // Append to body to ensure it loads after the container div exists
      document.body.appendChild(script);
    })();
  }
</script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    }, (err) => {
      console.error('Failed to copy embed code: ', err);
      // Maybe show a small error message to the user briefly
    });
  };

  // Effect to load the widget script when the component mounts
  useEffect(() => {
    // Only run in the browser, ensure token is valid, and script hasn't been added yet
    if (typeof window !== 'undefined' && widgetToken && !scriptAddedRef.current) {
        console.log("WidgetTester: Attempting to load widget script.");

        // Set config on window object
        (window as any).cvMatchConfig = {
            token: widgetToken,
            apiUrl: widgetApiUrl
        };

        // Check if script already exists (e.g., due to fast refresh)
        let existingScript = document.querySelector(`script[src="${widgetScriptUrl}"]`);
        if (existingScript) {
             console.log("WidgetTester: Script already exists, not adding again.");
             scriptAddedRef.current = true; // Mark as added if found
             return; // Don't add another one
        }


        const script = document.createElement('script');
        script.src = widgetScriptUrl;
        script.async = true;
        script.onload = () => console.log("WidgetTester: Widget script loaded successfully.");
        script.onerror = (e) => console.error("WidgetTester: Failed to load widget script:", e);

        document.body.appendChild(script);
        scriptAddedRef.current = true; // Mark script as added

        // Cleanup function to remove the script when the component unmounts
        return () => {
            console.log("WidgetTester: Cleaning up widget script.");
            // Find the script again might be necessary if the reference is lost
            existingScript = document.querySelector(`script[src="${widgetScriptUrl}"]`);
            if (existingScript && document.body.contains(existingScript)) {
                document.body.removeChild(existingScript);
                console.log("WidgetTester: Removed widget script from body.");
            }
            // Optionally clear the config
            delete (window as any).cvMatchConfig;
            scriptAddedRef.current = false; // Reset ref on unmount
        };
    }
  }, [widgetToken, widgetApiUrl, widgetScriptUrl]); // Dependencies for the effect

  return (
    <div className="container mx-auto p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-200">Widget Test Page</h1>
      <p className="text-center text-gray-600 dark:text-gray-400">
          Tester widget for batch: <span className="font-semibold">{batchTitle}</span>
      </p>

      {/* Section simulating the external job ad */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Simulert Jobbannonse Innhold</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Nedenfor ser du hvordan "Søk med CVMatch"-knappen vil se ut når den er integrert.
          Klikk på knappen for å teste søknadsprosessen.
        </p>
        {/* The container where the widget script expects to place the button */}
        <div ref={widgetContainerRef} id="cvmatch-apply-widget-container" className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          {/* Button will be injected here by apply.js */}
          {/* Add a fallback message in case the script fails */}
          <noscript>
            <p className="text-xs text-red-500">JavaScript er nødvendig for å vise søkeknappen.</p>
          </noscript>
           <p className="text-xs text-gray-500 dark:text-gray-500" id="widget-placeholder">
                (Laster CVMatch widget... Hvis knappen ikke vises, sjekk konsollen for feil.)
           </p>
        </div>
      </div>

      {/* Section to show the embed code itself */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <button
            onClick={() => setShowEmbedCode(!showEmbedCode)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-3"
        >
          {showEmbedCode ? 'Skjul' : 'Vis'} integreringskode
        </button>
        {showEmbedCode && (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Lim inn denne koden på din eksterne nettside:
            </p>
            <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md overflow-x-auto relative border border-gray-300 dark:border-gray-600">
              <pre className="text-sm font-mono whitespace-pre-wrap break-words text-gray-700 dark:text-gray-300">
                <code>{embedCode}</code>
              </pre>
              <button
                onClick={copyToClipboard}
                className="absolute top-2 right-2 px-2 py-1 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors duration-150"
                aria-label="Kopier kode"
              >
                {isCopied ? 'Kopiert!' : 'Kopier'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}