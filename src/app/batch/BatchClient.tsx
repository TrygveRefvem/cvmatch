'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  DocumentArrowUpIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';

// API URL konfigurasjon
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Initialiser PDF.js worker
let pdfWorkerInitialized = false;

export default function BatchClient() {
  const router = useRouter();
  const [cvFiles, setCvFiles] = useState<File[]>([]);
  const [jobUrl, setJobUrl] = useState('');
  const [jobText, setJobText] = useState('');
  const [useUrl, setUseUrl] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialiser PDF.js worker
  useEffect(() => {
    if (!pdfWorkerInitialized && typeof window !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      pdfWorkerInitialized = true;
    }
  }, []);

  const extractTextFromPdf = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      
      fileReader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let fullText = '';
          
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map(item => {
                if (typeof item === 'object' && item !== null && 'str' in item) {
                  return (item as { str: string }).str;
                }
                return '';
              })
              .join(' ');
            fullText += pageText + '\n\n';
          }
          
          resolve(fullText);
        } catch (error) {
          console.error('Error reading PDF:', error);
          reject('Kunne ikke lese filen');
        }
      };
      
      fileReader.onerror = () => {
        reject('Kunne ikke lese filen');
      };
      
      fileReader.readAsArrayBuffer(file);
    });
  };

  const extractTextFromTextFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === 'string') {
          resolve(text);
        } else {
          reject('Kunne ikke lese filen');
        }
      };
      
      reader.onerror = () => {
        reject('Kunne ikke lese filen');
      };
      
      reader.readAsText(file);
    });
  };

  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    const newFiles = Array.from(e.target.files);
    const processedFiles: { file: File; text: string }[] = [];
    
    for (const file of newFiles) {
      try {
        let extractedText = '';
        
        if (file.type === 'application/pdf') {
          extractedText = await extractTextFromPdf(file);
        } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
          extractedText = await extractTextFromTextFile(file);
        } else {
          extractedText = await extractTextFromTextFile(file);
        }
        
        processedFiles.push({ file, text: extractedText });
      } catch (error) {
        console.error('Error processing file:', file.name, error);
        setError(`Kunne ikke lese filen (${file.name})`);
        return;
      }
    }
    
    setCvFiles(prev => [...prev, ...newFiles]);
  };

  const removeCv = (index: number) => {
    setCvFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);
    setError(null);
    
    try {
      console.log('Starter batch-analyse...');
      console.log('Antall CV-filer:', cvFiles.length);
      console.log('Jobbkilde:', useUrl ? 'URL' : 'Tekst');
      
      // Forbered data for API-kallet
      const jobSource = useUrl 
        ? { url: jobUrl, text: "" } 
        : { url: "", text: jobText };

      console.log('Ekstraherer tekst fra CV-filer...');
      // Ekstraher tekst fra CV-filene
      const cvPromises = cvFiles.map(async file => {
        console.log(`Behandler fil: ${file.name}`);
        try {
          const text = file.type === 'application/pdf' 
            ? await extractTextFromPdf(file) 
            : await extractTextFromTextFile(file);
          console.log(`Tekst ekstrahert fra ${file.name}, lengde: ${text.length}`);
          return {
            text,
            name: file.name
          };
        } catch (error) {
          console.error(`Feil ved ekstrahering av tekst fra ${file.name}:`, error);
          throw error;
        }
      });

      const cvs = await Promise.all(cvPromises);
      console.log('Alle CV-filer er behandlet');
      
      // Send data til API-en
      console.log('Sender data til API...');
      const response = await fetch(`${API_URL}/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cvs,
          jobSource,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API-feil:', errorData);
        throw new Error(errorData.error || 'Det oppstod en feil under analysen');
      }
      
      // Hent analyseresultatet
      const result = await response.json();
      console.log('Mottok analyseresultat:', result);
      
      // Lagre resultatet i sessionStorage for å vise det på resultatsiden
      sessionStorage.setItem('batchAnalysisResult', JSON.stringify(result));
      
      // Naviger til resultatsiden
      router.push('/batch/result');
    } catch (error) {
      console.error('Feil ved analyse:', error);
      if (error instanceof Error) {
        console.error('Feilmelding:', error.message);
        console.error('Stack trace:', error.stack);
      }
      setError(error instanceof Error ? error.message : 'Det oppstod en feil under analysen');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex-1 py-12">
      <div className="container max-w-4xl">
        <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Tilbake til forsiden
        </Link>

        <div className="card p-8">
          <h1 className="text-2xl font-bold mb-6">Batch CV-analyse</h1>
          <p className="text-muted-foreground mb-8">
            Last opp flere CV-er og en stillingsannonse for å analysere dem samtidig.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-8">
              <label className="block text-sm font-medium mb-2">Last opp CV-er</label>
              <div className="border-2 border-dashed border-input rounded-lg p-8">
                <div className="space-y-4">
                  {cvFiles.length > 0 && (
                    <div className="space-y-2">
                      {cvFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-secondary rounded">
                          <span className="text-sm">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeCv(index)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-center">
                    <label className="cursor-pointer inline-flex items-center">
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.txt"
                        multiple
                        onChange={handleCvUpload}
                      />
                      <div className="btn btn-secondary">
                        <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
                        Last opp CV-er
                      </div>
                    </label>
                    <p className="text-sm text-muted-foreground mt-2">
                      Støtter PDF, DOC, DOCX og TXT
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-medium mb-2">Stillingsannonse</label>
              <div className="flex space-x-4 mb-4">
                <button
                  type="button"
                  className={`flex-1 py-2 px-4 rounded-md ${
                    useUrl
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                  onClick={() => setUseUrl(true)}
                >
                  <GlobeAltIcon className="h-5 w-5 inline-block mr-2" />
                  URL
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 px-4 rounded-md ${
                    !useUrl
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                  onClick={() => setUseUrl(false)}
                >
                  <DocumentArrowUpIcon className="h-5 w-5 inline-block mr-2" />
                  Tekst
                </button>
              </div>

              {useUrl ? (
                <input
                  type="url"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  placeholder="Lim inn URL til stillingsannonse"
                  className="input w-full"
                />
              ) : (
                <textarea
                  value={jobText}
                  onChange={(e) => setJobText(e.target.value)}
                  placeholder="Lim inn tekst fra stillingsannonse"
                  className="input min-h-[200px]"
                />
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  isAnalyzing ||
                  cvFiles.length === 0 ||
                  (useUrl ? !jobUrl : !jobText)
                }
              >
                {isAnalyzing ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                    Analyserer...
                  </>
                ) : (
                  'Start analyse'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 