"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeftIcon, DocumentArrowUpIcon, GlobeAltIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import * as pdfjsLib from 'pdfjs-dist';

// API URL konfigurasjon
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Initialiser PDF.js worker
// Dette må gjøres i en useEffect siden det er klientside-kode
let pdfWorkerInitialized = false;

export default function MatchPage() {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvText, setCvText] = useState<string>("");
  const [jobUrl, setJobUrl] = useState<string>("");
  const [jobText, setJobText] = useState<string>("");
  const [useUrl, setUseUrl] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialiser PDF.js worker
  useEffect(() => {
    if (!pdfWorkerInitialized && typeof window !== 'undefined') {
      // Bruk en lokal kopi av worker-filen
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      pdfWorkerInitialized = true;
    }
  }, []);

  // Funksjon for å lese tekst fra PDF-fil
  const extractTextFromPdf = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      
      fileReader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let fullText = '';
          
          // Hent tekst fra hver side
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
          console.error('Feil ved lesing av PDF:', error);
          reject('Kunne ikke lese PDF-filen. Prøv en annen fil eller format.');
        }
      };
      
      fileReader.onerror = () => {
        reject('Feil ved lesing av filen.');
      };
      
      fileReader.readAsArrayBuffer(file);
    });
  };

  // Funksjon for å lese tekst fra tekstfil
  const extractTextFromTextFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === 'string') {
          resolve(text);
        } else {
          reject('Kunne ikke lese filen som tekst.');
        }
      };
      
      reader.onerror = () => {
        reject('Feil ved lesing av filen.');
      };
      
      reader.readAsText(file);
    });
  };

  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCvFile(file);
      setError(null);
      
      try {
        let extractedText = '';
        
        // Håndter forskjellige filtyper
        if (file.type === 'application/pdf') {
          extractedText = await extractTextFromPdf(file);
        } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
          extractedText = await extractTextFromTextFile(file);
        } else {
          // For andre filtyper, prøv å lese som tekst
          extractedText = await extractTextFromTextFile(file);
        }
        
        setCvText(extractedText);
      } catch (error) {
        console.error('Feil ved lesing av fil:', error);
        setError(typeof error === 'string' ? error : 'Kunne ikke lese filen. Prøv en annen fil eller format.');
      }
    }
  };

  const handleSubmitCv = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    
    if (!cvText) {
      setError("Kunne ikke lese CV-filen. Prøv en annen fil eller format.");
      setIsUploading(false);
      return;
    }
    
    setError(null);
    setTimeout(() => {
      setIsUploading(false);
      setStep(2);
    }, 1000);
  };

  const handleSubmitJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // Forbered data for API-kallet
      const jobSource = useUrl 
        ? { url: jobUrl, text: "" } 
        : { url: "", text: jobText };
      
      // Send data til API-en
      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cvText,
          jobSource,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Det oppstod en feil under analysen');
      }
      
      // Hent analyseresultatet
      const result = await response.json();
      
      // Lagre resultatet i sessionStorage for å vise det på resultatsiden
      sessionStorage.setItem('analysisResult', JSON.stringify(result));
      
      // Naviger til resultatsiden
      router.push('/match/result');
    } catch (error) {
      console.error('Feil ved analyse:', error);
      setError(error instanceof Error ? error.message : 'Det oppstod en feil under analysen');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-primary">
            CV Match & Feedback
          </Link>
          <nav className="hidden md:flex space-x-6">
            <Link href="/" className="hover:text-primary transition-colors">
              Hjem
            </Link>
            <Link href="/match" className="hover:text-primary transition-colors">
              Match CV
            </Link>
            <Link href="/about" className="hover:text-primary transition-colors">
              Om oss
            </Link>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 py-12">
        <div className="container max-w-4xl">
          <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Tilbake til forsiden
          </Link>

          {/* Steps indicator */}
          <div className="mb-8">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                1
              </div>
              <div className={`h-1 flex-1 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                2
              </div>
              <div className="h-1 flex-1 bg-muted"></div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
                3
              </div>
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span className={step >= 1 ? 'text-foreground font-medium' : 'text-muted-foreground'}>Last opp CV</span>
              <span className={step >= 2 ? 'text-foreground font-medium' : 'text-muted-foreground'}>Legg inn stillingsannonse</span>
              <span className="text-muted-foreground">Resultat</span>
            </div>
          </div>

          {/* Step 1: CV Upload */}
          {step === 1 && (
            <div className="card p-8">
              <h1 className="text-2xl font-bold mb-6">Last opp CV</h1>
              <p className="text-muted-foreground mb-8">
                Last opp CV-en din i PDF, DOCX, DOC eller TXT-format. Vår AI vil automatisk analysere innholdet.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmitCv}>
                <div className="mb-8">
                  <label className="block text-sm font-medium mb-2">CV-fil</label>
                  <div className="border-2 border-dashed border-input rounded-lg p-8 text-center">
                    {!cvFile ? (
                      <>
                        <DocumentArrowUpIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">
                          Dra og slipp CV-filen din her, eller klikk for å velge fil
                        </p>
                        <input
                          type="file"
                          accept=".pdf,.docx,.doc,.txt"
                          onChange={handleCvUpload}
                          className="hidden"
                          id="cv-upload"
                          required
                        />
                        <label
                          htmlFor="cv-upload"
                          className="btn btn-secondary cursor-pointer"
                        >
                          Velg fil
                        </label>
                      </>
                    ) : (
                      <div>
                        <p className="font-medium mb-2">{cvFile.name}</p>
                        <p className="text-sm text-muted-foreground mb-4">
                          {(cvFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <button
                          type="button"
                          onClick={() => setCvFile(null)}
                          className="btn btn-secondary"
                        >
                          Velg en annen fil
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!cvFile || isUploading}
                  >
                    {isUploading ? (
                      <>
                        <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                        Laster opp...
                      </>
                    ) : (
                      "Fortsett"
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Step 2: Job Posting */}
          {step === 2 && (
            <div className="card p-8">
              <h1 className="text-2xl font-bold mb-6">Legg inn stillingsannonse</h1>
              <p className="text-muted-foreground mb-8">
                Legg inn URL-en til stillingsannonsen eller kopier og lim inn teksten fra annonsen.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmitJob}>
                <div className="mb-6">
                  <div className="flex space-x-4 mb-6">
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
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        URL til stillingsannonse
                      </label>
                      <input
                        type="url"
                        value={jobUrl}
                        onChange={(e) => setJobUrl(e.target.value)}
                        placeholder="f.eks. https://www.finn.no/job/fulltime/ad.html?finnkode=123456789"
                        className="input mb-2"
                        required
                      />
                      <p className="text-sm text-muted-foreground">
                        Lim inn URL-en til stillingsannonsen du vil matche CV-en din mot.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Tekst fra stillingsannonse
                      </label>
                      <textarea
                        value={jobText}
                        onChange={(e) => setJobText(e.target.value)}
                        placeholder="Kopier og lim inn teksten fra stillingsannonsen her..."
                        className="input min-h-[200px]"
                        required
                      ></textarea>
                    </div>
                  )}
                </div>

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn btn-secondary"
                  >
                    Tilbake
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={
                      isAnalyzing || (useUrl ? !jobUrl : !jobText)
                    }
                  >
                    {isAnalyzing ? (
                      <>
                        <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                        Analyserer...
                      </>
                    ) : (
                      "Analyser match"
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-muted-foreground">
                © 2024 CV Match & Feedback. Alle rettigheter reservert.
              </p>
            </div>
            <div className="flex space-x-6">
              <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                Om oss
              </Link>
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                Personvern
              </Link>
              <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                Vilkår
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 