"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import React from "react";

interface AnalysisResult {
  overallMatch: number;
  jobTitle: string;
  companyName: string;
  categories: {
    name: string;
    match: number;
    details: {
      name: string;
      match: number;
      required: boolean;
      reasoning: string;
    }[];
  }[];
  feedback: string[];
  strengths: string[];
  weaknesses: string[];
}

export default function ResultPage() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [expandedDetails, setExpandedDetails] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    const storedResult = sessionStorage.getItem('analysisResult');
    if (storedResult) {
      try {
        const parsedData = JSON.parse(storedResult);

        // Check if the expected nested structure exists
        if (parsedData && parsedData.analysisResult) {
          setResult(parsedData.analysisResult as AnalysisResult);
        } else {
          // Handle cases where the structure might be different or directly stored (less likely now)
          console.warn("Could not find 'analysisResult' key in stored data. Attempting to use root object.");
          // Fallback: Try using the parsed data directly if analysisResult key is missing
          // This might happen if an error object was stored directly
          if (parsedData && typeof parsedData.overallMatch !== 'undefined') { 
             setResult(parsedData as AnalysisResult);
          } else {
             setError(parsedData?.error || 'Uventet dataformat mottatt.'); 
          }
        }
      } catch (error) {
        console.error('Feil ved parsing av resultat:', error);
        setError('Kunne ikke laste analyseresultatet (parsing feilet).');
      }
    } else {
      setError('Ingen analyseresultat funnet i sessionStorage.');
    }
  }, []);

  const toggleDetail = (categoryName: string, detailIndex: number) => {
    const key = `${categoryName}-${detailIndex}`;
    setExpandedDetails(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Funksjon for å bestemme fargeklasse basert på matchprosent
  const getMatchColorClass = (percentage: number) => {
    if (percentage >= 80) return "text-green-500";
    if (percentage >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-border">
          <div className="container py-4 flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-primary">
              CV Match & Feedback
            </Link>
          </div>
        </header>
        <main className="flex-1 py-12">
          <div className="container max-w-4xl">
            <div className="card p-8">
              <h1 className="text-2xl font-bold mb-6">Feil</h1>
              <p className="text-red-600 mb-6">{error}</p>
              <Link href="/match" className="btn btn-primary">
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Gå tilbake
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-border">
          <div className="container py-4 flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-primary">
              CV Match & Feedback
            </Link>
          </div>
        </header>
        <main className="flex-1 py-12">
          <div className="container max-w-4xl">
            <div className="card p-8">
              <h1 className="text-2xl font-bold mb-6">Laster...</h1>
            </div>
          </div>
        </main>
      </div>
    );
  }

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
          <Link href="/match" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Tilbake til CV-analyse
          </Link>

          <div className="card p-8 mb-8">
            <div className="flex flex-col md:flex-row items-center justify-between mb-8">
              <div className="flex items-center mb-4 md:mb-0">
                <div className="h-12 w-12 text-primary mr-4" />
                <div>
                  <h1 className="text-2xl font-bold">Analyseresultat</h1>
                  <p className="text-muted-foreground">{result.jobTitle} hos {result.companyName}</p>
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-1 flex items-center justify-center">
                  <span className={getMatchColorClass(result.overallMatch)}>
                    {result?.overallMatch ?? '-'}%
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Total match</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-border mb-6">
              <div className="flex space-x-8">
                <button
                  className={`pb-2 px-1 ${
                    activeTab === "overview"
                      ? "border-b-2 border-primary text-foreground font-medium"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setActiveTab("overview")}
                >
                  Oversikt
                </button>
                <button
                  className={`pb-2 px-1 ${
                    activeTab === "details"
                      ? "border-b-2 border-primary text-foreground font-medium"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setActiveTab("details")}
                >
                  Detaljer
                </button>
                <button
                  className={`pb-2 px-1 ${
                    activeTab === "feedback"
                      ? "border-b-2 border-primary text-foreground font-medium"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setActiveTab("feedback")}
                >
                  Tilbakemelding
                </button>
              </div>
            </div>

            {/* Tab content */}
            {activeTab === "overview" && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {result.categories && result.categories.length > 0 ? (
                    result.categories.map((category) => (
                      <div key={category.name} className="bg-secondary rounded-lg p-4">
                        <h3 className="font-medium mb-2">{category.name}</h3>
                        <div className="flex items-center justify-between">
                          <div className="w-full bg-muted rounded-full h-2.5 mr-4">
                            <div
                              className="bg-primary h-2.5 rounded-full"
                              style={{ width: `${category.match}%` }}
                            ></div>
                          </div>
                          <span className={`text-sm font-medium ${getMatchColorClass(category.match)}`}>
                            {category.match}%
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-3 text-center py-4">
                      <p className="text-muted-foreground">Ingen kategorier funnet</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-medium mb-4 flex items-center">
                      <div className="h-5 w-5 text-green-500 mr-2" />
                      Styrker
                    </h3>
                    <ul className="space-y-2">
                      {result.strengths && result.strengths.length > 0 ? (
                        result.strengths.map((strength, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-green-500 mr-2">•</span>
                            {strength}
                          </li>
                        ))
                      ) : (
                        <li className="text-muted-foreground">Ingen styrker funnet</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-4 flex items-center">
                      <div className="h-5 w-5 text-red-500 mr-2" />
                      Forbedringsområder
                    </h3>
                    <ul className="space-y-2">
                      {result.weaknesses && result.weaknesses.length > 0 ? (
                        result.weaknesses.map((weakness, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-red-500 mr-2">•</span>
                            {weakness}
                          </li>
                        ))
                      ) : (
                        <li className="text-muted-foreground">Ingen forbedringsområder funnet</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "details" && (
              <div>
                {result.categories && result.categories.length > 0 ? (
                  result.categories.map((category) => (
                    <div key={category.name} className="mb-8">
                      <h3 className="text-lg font-medium mb-4">{category.name}</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-2 px-4">Navn</th>
                              <th className="text-left py-2 px-4">Match</th>
                              <th className="text-left py-2 px-4">Krav</th>
                              <th className="text-left py-2 px-4">Begrunnelse</th>
                            </tr>
                          </thead>
                          <tbody>
                            {category.details && category.details.length > 0 ? (
                              category.details.map((detail, detailIndex) => {
                                const key = `${category.name}-${detailIndex}`;
                                const isExpanded = expandedDetails[key];
                                return (
                                  <React.Fragment key={`${detail.name}-${detailIndex}`}>
                                    <tr className="border-b border-border">
                                      <td className="py-2 px-4">{detail.name}</td>
                                      <td className="py-2 px-4">
                                        <div className="flex items-center">
                                          <div className="w-24 bg-muted rounded-full h-2 mr-3">
                                            <div
                                              className="bg-primary h-2 rounded-full"
                                              style={{ width: `${detail.match}%` }}
                                            ></div>
                                          </div>
                                          <span className={getMatchColorClass(detail.match)}>
                                            {detail.match}%
                                          </span>
                                        </div>
                                      </td>
                                      <td className="py-2 px-4">
                                        {detail.required ? (
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                            Påkrevd
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                            Ønskelig
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-2 px-4">
                                        {detail.reasoning ? (
                                          <button 
                                            onClick={() => toggleDetail(category.name, detailIndex)}
                                            className="flex items-center text-primary hover:text-primary-dark transition-colors"
                                          >
                                            <span className="mr-2">Vis begrunnelse</span>
                                            {isExpanded ? (
                                              <ChevronUpIcon className="h-4 w-4" />
                                            ) : (
                                              <ChevronDownIcon className="h-4 w-4" />
                                            )}
                                          </button>
                                        ) : (
                                          <span className="text-muted-foreground">Ingen begrunnelse</span>
                                        )}
                                      </td>
                                    </tr>
                                    {isExpanded && detail.reasoning && (
                                      <tr>
                                        <td colSpan={4} className="py-4 px-4 bg-secondary">
                                          <p className="text-sm">{detail.reasoning}</p>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={4} className="py-4 text-center text-muted-foreground">
                                  Ingen detaljer funnet
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">Ingen kategorier funnet</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "feedback" && (
              <div>
                <h3 className="text-lg font-medium mb-4">Personlig tilbakemelding</h3>
                <div className="bg-secondary rounded-lg p-6">
                  <ul className="space-y-4">
                    {result.feedback && result.feedback.length > 0 ? (
                      result.feedback.map((item, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-primary font-bold mr-2">{index + 1}.</span>
                          <p>{item}</p>
                        </li>
                      ))
                    ) : (
                      <li className="text-muted-foreground">Ingen tilbakemelding funnet</li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Link href="/match" className="btn btn-secondary">
              Prøv en annen stilling
            </Link>
            <button className="btn btn-primary">
              Last ned rapport
            </button>
          </div>
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