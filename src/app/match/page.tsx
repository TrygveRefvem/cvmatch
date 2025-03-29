"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeftIcon, DocumentArrowUpIcon, GlobeAltIcon, ArrowPathIcon, CreditCardIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import * as pdfjsLib from 'pdfjs-dist';
import { loadStripe, Stripe } from '@stripe/stripe-js';

// API URL konfigurasjon
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Initialise Stripe.js Promise (outside component for performance)
// Ensure your public key is set in environment variables!
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : Promise.resolve<Stripe | null>(null);

// Initialiser PDF.js worker
// Dette må gjøres i en useEffect siden det er klientside-kode
let pdfWorkerInitialized = false;

// Get Price IDs from environment variables
const candidatePriceId = process.env.NEXT_PUBLIC_STRIPE_CANDIDATE_PRICE_ID; // Renamed for clarity & convention
const recruiterPriceId = process.env.NEXT_PUBLIC_STRIPE_RECRUITER_PRICE_ID; // Renamed for clarity & convention

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

  // State for subscription requirement and checkout process
  const [needsSubscription, setNeedsSubscription] = useState<boolean>(false);
  const [isRedirectingToCheckout, setIsRedirectingToCheckout] = useState<boolean>(false);

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
    setNeedsSubscription(false); // Reset subscription need on new analysis attempt
    
    try {
      const jobSource = useUrl ? { url: jobUrl, text: "" } : { url: "", text: jobText };
      
      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, jobSource }),
      });
      
      const result = await response.json(); // Always try to parse JSON

      if (!response.ok) {
        // Check for specific 402 Payment Required status
        if (response.status === 402 && result?.needsSubscription) {
            setError(result.error || 'Abonnement kreves for å fortsette analysen.');
            setNeedsSubscription(true);
        } else {
             // Handle other API errors
            setError(result.error || 'Det oppstod en feil under analysen');
        }
        // Throw an error to stop execution if response is not ok
        throw new Error(result.error || `Request failed with status ${response.status}`);
      }
      
      // If response is OK (2xx status)
      sessionStorage.setItem('analysisResult', JSON.stringify(result));
      router.push('/match/result');

    } catch (error: any) {
      // Error is already set in the !response.ok block if it came from API
      // Only set generic error if fetch itself failed or JSON parsing failed before setting error
      if (!error) {
          setError(error.message || 'Det oppstod en uventet feil under analysen');
      } 
      console.error('Feil ved analyse:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Modify function to accept priceId
  const handleSubscribeClick = async (priceId: string | undefined) => {
    setError(null);

    if (!priceId) {
      setError("Pris-ID for valgt plan er ikke konfigurert riktig.");
      console.error('Missing Price ID for selected plan.');
      return;
    }

    setIsRedirectingToCheckout(true);

    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
        setError("Stripe er ikke konfigurert riktig (manglende publiserbar nøkkel).");
        setIsRedirectingToCheckout(false);
        return;
    }

    try {
      // 1. Create a checkout session on the backend, passing the priceId
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }), // Send the selected priceId
      });

      const sessionData = await response.json();

      if (!response.ok || !sessionData.id) {
        throw new Error(sessionData.error || 'Kunne ikke opprette Stripe checkout økt.');
      }

      // 2. Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error("Stripe.js kunne ikke lastes inn.");
      }

      const { error: stripeError } = await stripe.redirectToCheckout({ 
          sessionId: sessionData.id 
      });

      if (stripeError) {
        console.error("Stripe redirectToCheckout error:", stripeError);
        setError(`Kunne ikke omdirigere til betaling: ${stripeError.message}`);
      }
      // If redirection fails, stop loading state
      setIsRedirectingToCheckout(false);

    } catch (error: any) {
      console.error("Error during subscribe click:", error);
      setError(error.message || "En feil oppstod under oppretting av abonnement.");
      setIsRedirectingToCheckout(false);
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
            <Link href="/match" className="text-primary font-medium transition-colors">
              Match
            </Link>
            <Link href="/batch" className="hover:text-primary transition-colors">
              Batch
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
                <div className="mb-6">
                  <div className="flex items-start mb-2 p-4 bg-secondary rounded-lg">
                    <input 
                      type="checkbox" 
                      id="gdprConsent"
                      className="mt-1 mr-3" 
                      defaultChecked={true}
                    />
                    <label htmlFor="gdprConsent" className="text-sm text-muted-foreground">
                      Ved å fortsette godtar jeg at min CV og stillingsdata behandles i samsvar med 
                      <Link href="/privacy" className="text-primary hover:underline ml-1">
                        personvernerklæringen
                      </Link>. 
                      Mine data slettes automatisk etter 30 dager.
                    </label>
                  </div>
                </div>
                
                <div className="space-y-8">
                  <div>
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
                <div className={`border px-4 py-3 rounded mb-6 ${needsSubscription ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  {error}
                  {needsSubscription && (
                    <p className="mt-2 text-sm">
                      Klikk på "Abonner nå" for å velge en plan og få full tilgang.
                    </p>
                  )}
                </div>
              )}

              <fieldset disabled={isRedirectingToCheckout}>
                <form onSubmit={!needsSubscription ? handleSubmitJob : (e) => e.preventDefault()}>
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
                          required={!needsSubscription}
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
                          required={!needsSubscription}
                        ></textarea>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-end pt-6">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="btn btn-secondary"
                      disabled={isAnalyzing || isRedirectingToCheckout}
                    >
                      Tilbake
                    </button>

                    <div className="flex gap-4">
                      {needsSubscription ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSubscribeClick(candidatePriceId)}
                            className="btn btn-primary bg-blue-600 hover:bg-blue-700 flex-col h-auto items-center"
                            disabled={isRedirectingToCheckout || !candidatePriceId}
                            title={!candidatePriceId ? "Candidate plan not configured" : ""}
                          >
                            {isRedirectingToCheckout ? (
                              <ArrowPathIcon className="h-5 w-5 animate-spin" />
                            ) : (
                              <>
                                <span className="text-sm font-semibold">Candidate</span>
                                <span className="text-xs">(kr 4.99/mnd)</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSubscribeClick(recruiterPriceId)}
                            className="btn btn-primary bg-green-600 hover:bg-green-700 flex-col h-auto items-center"
                            disabled={isRedirectingToCheckout || !recruiterPriceId}
                            title={!recruiterPriceId ? "Recruiter plan not configured" : ""}
                          >
                            {isRedirectingToCheckout ? (
                              <ArrowPathIcon className="h-5 w-5 animate-spin" />
                            ) : (
                              <>
                                <span className="text-sm font-semibold">Recruiter Pro</span>
                                <span className="text-xs">(kr 49/mnd)</span>
                              </>
                            )}
                          </button>
                        </>
                      ) : (
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={isAnalyzing || (useUrl ? !jobUrl : !jobText)}
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
                      )}
                    </div>
                  </div>
                </form>
              </fieldset>
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