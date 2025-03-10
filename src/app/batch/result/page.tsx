"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

interface AnalysisResult {
  overallMatch: number;
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

  useEffect(() => {
    const storedResult = sessionStorage.getItem('batchAnalysisResult');
    if (storedResult) {
      try {
        setResult(JSON.parse(storedResult));
      } catch (error) {
        console.error('Feil ved parsing av resultat:', error);
        setError('Kunne ikke laste analyseresultatet');
      }
    } else {
      setError('Ingen analyseresultat funnet');
    }
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 py-12">
          <div className="container max-w-4xl">
            <div className="card p-8">
              <h1 className="text-2xl font-bold mb-6">Feil</h1>
              <p className="text-red-600 mb-6">{error}</p>
              <Link href="/batch" className="btn btn-primary">
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
      <main className="flex-1 py-12">
        <div className="container max-w-4xl">
          <Link href="/batch" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Tilbake til batch-analyse
          </Link>

          <div className="card p-8">
            <h1 className="text-2xl font-bold mb-6">Analyseresultat</h1>
            
            <div className="mb-8">
              <div className="flex items-center justify-center">
                <div className="text-4xl font-bold text-primary">
                  {result.overallMatch}%
                </div>
                <div className="ml-4 text-muted-foreground">
                  Match med stillingen
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {result.categories.map((category, index) => (
                <div key={index} className="border-t border-border pt-6">
                  <h2 className="text-xl font-semibold mb-4">{category.name}</h2>
                  <div className="flex items-center mb-4">
                    <div className="text-2xl font-bold text-primary">
                      {category.match}%
                    </div>
                    <div className="ml-4 text-muted-foreground">
                      Match i denne kategorien
                    </div>
                  </div>
                  <div className="space-y-4">
                    {category.details.map((detail, detailIndex) => (
                      <div key={detailIndex} className="bg-secondary p-4 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium">{detail.name}</h3>
                          <div className="text-sm text-muted-foreground">
                            {detail.match}% match
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {detail.reasoning}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="border-t border-border pt-6">
                <h2 className="text-xl font-semibold mb-4">Tilbakemeldinger</h2>
                <div className="space-y-4">
                  {result.feedback.map((item, index) => (
                    <div key={index} className="bg-secondary p-4 rounded-lg">
                      <p className="text-sm">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-xl font-semibold mb-4">Styrker</h2>
                  <ul className="space-y-2">
                    {result.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-4">Utviklingsområder</h2>
                  <ul className="space-y-2">
                    {result.weaknesses.map((weakness, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-red-500 mr-2">×</span>
                        <span>{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 