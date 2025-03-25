"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

interface AnalysisDetail {
  name: string;
  match: number;
  required: boolean;
  reasoning: string;
}

interface AnalysisCategory {
  name: string;
  match: number;
  details: AnalysisDetail[];
}

interface AnalysisResult {
  overallMatch: number;
  jobTitle?: string;
  companyName?: string;
  categories: AnalysisCategory[];
  feedback: string[];
  strengths: string[];
  weaknesses: string[];
}

interface BatchAnalysisResponse {
  totalProcessed: number;
  successfulAnalyses: number;
  failedAnalyses: number;
  results: {
    name: string;
    analysis: AnalysisResult;
    error?: string;
  }[];
}

export default function ResultPage() {
  const [batchResult, setBatchResult] = useState<BatchAnalysisResponse | null>(null);
  const [selectedResults, setSelectedResults] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [expandedDetails, setExpandedDetails] = useState<{[key: string]: boolean}>({});
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'detail'>('table');
  const [detailViewIndex, setDetailViewIndex] = useState<number>(0);

  useEffect(() => {
    const storedResult = sessionStorage.getItem('batchAnalysisResult');
    if (storedResult) {
      try {
        const parsedResult = JSON.parse(storedResult);
        setBatchResult(parsedResult);
        
        // Initialize with first 2 results selected or all if less than 2
        if (parsedResult && parsedResult.results) {
          const initialSelected = parsedResult.results
            .filter((r: any) => !r.error)
            .slice(0, Math.min(3, parsedResult.results.length))
            .map((_: any, index: number) => index);
          setSelectedResults(initialSelected);
        }
      } catch (error) {
        console.error('Feil ved parsing av resultat:', error);
        setError('Kunne ikke laste analyseresultatet');
      }
    } else {
      setError('Ingen analyseresultat funnet');
    }
  }, []);

  const toggleResult = (index: number) => {
    setSelectedResults(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index].sort((a, b) => a - b);
      }
    });
  };

  const selectAllResults = () => {
    if (!batchResult?.results) return;
    const allValidIndices = batchResult.results
      .map((r, index) => r.error ? -1 : index)
      .filter(index => index !== -1);
    setSelectedResults(allValidIndices);
  };

  const clearSelectedResults = () => {
    setSelectedResults([]);
  };

  const toggleDetail = (categoryName: string, detailIndex: number) => {
    const key = `${categoryName}-${detailIndex}`;
    setExpandedDetails(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const getMatchColorClass = (percentage: number) => {
    if (percentage >= 80) return "text-green-500";
    if (percentage >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getMatchBgClass = (percentage: number) => {
    if (percentage >= 80) return "bg-green-100";
    if (percentage >= 60) return "bg-yellow-100";
    return "bg-red-100";
  };

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

  if (!batchResult || !batchResult.results || !batchResult.results.length) {
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

  // Get filtered results for comparison
  const comparisonResults = selectedResults
    .map(index => batchResult.results[index])
    .filter(r => r && !r.error);

  // Individual detail view result
  const detailResult = viewMode === 'detail' && batchResult.results[detailViewIndex]?.analysis;

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 py-12">
        <div className="container max-w-6xl">
          <Link href="/batch" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Tilbake til batch-analyse
          </Link>

          <div className="card p-8 mb-6">
            <h1 className="text-2xl font-bold mb-6">Batch Analyseresultat</h1>
            
            <div className="mb-6 bg-secondary/50 p-4 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Totalt behandlet</p>
                  <p className="text-xl font-bold">{batchResult.totalProcessed}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Suksessfullt</p>
                  <p className="text-xl font-bold text-green-600">{batchResult.successfulAnalyses}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Feilet</p>
                  <p className="text-xl font-bold text-red-600">{batchResult.failedAnalyses}</p>
                </div>
              </div>
            </div>
            
            {/* View toggle */}
            <div className="flex justify-between items-center mb-6">
              <div className="space-x-4">
                <button 
                  className={`px-3 py-1 rounded-md ${viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
                  onClick={() => setViewMode('table')}
                >
                  Sammenligning
                </button>
                <button 
                  className={`px-3 py-1 rounded-md ${viewMode === 'detail' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
                  onClick={() => setViewMode('detail')}
                >
                  Detaljer
                </button>
              </div>

              {viewMode === 'table' && (
                <div className="space-x-2">
                  <button 
                    className="text-sm text-blue-600 hover:underline"
                    onClick={selectAllResults}
                    disabled={!batchResult?.results || batchResult.results.length === 0}
                  >
                    Velg alle
                  </button>
                  <button 
                    className="text-sm text-blue-600 hover:underline"
                    onClick={clearSelectedResults}
                    disabled={selectedResults.length === 0}
                  >
                    Tøm valg
                  </button>
                </div>
              )}

              {viewMode === 'detail' && (
                <select 
                  className="border border-input rounded-md p-2"
                  value={detailViewIndex}
                  onChange={(e) => setDetailViewIndex(Number(e.target.value))}
                >
                  {batchResult.results.map((res, index) => (
                    <option key={index} value={index} disabled={!!res.error}>
                      {res.name} {res.error ? '(Feil)' : `(${res.analysis?.overallMatch || 0}% match)`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Table comparison view */}
            {viewMode === 'table' && (
              <>
                {/* CV Selector */}
                <div className="mb-6">
                  <h2 className="text-lg font-medium mb-3">Velg CV-er for sammenligning</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {batchResult.results.map((res, index) => (
                      <label key={index} className={`flex items-center p-3 rounded-lg border ${selectedResults.includes(index) ? 'border-primary bg-primary/5' : 'border-muted'} ${res.error ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input 
                          type="checkbox" 
                          className="mr-3" 
                          checked={selectedResults.includes(index)} 
                          onChange={() => !res.error && toggleResult(index)}
                          disabled={!!res.error}
                        />
                        <div className="flex-1">
                          <div className="font-medium truncate" title={res.name}>{res.name}</div>
                          {res.error ? (
                            <div className="text-sm text-red-500">Feil: Kunne ikke analysere</div>
                          ) : (
                            <div className="text-sm">
                              <span className={getMatchColorClass(res.analysis?.overallMatch || 0)}>
                                {res.analysis?.overallMatch || 0}% match
                              </span>
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Comparison table */}
                {comparisonResults.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-secondary">
                          <th className="p-3 text-left font-medium border-b border-border">Kategori</th>
                          {comparisonResults.map((res, index) => (
                            <th key={index} className="p-3 text-center font-medium border-b border-border">
                              <div className="truncate max-w-xs" title={res.name}>{res.name}</div>
                              <div className={`text-lg font-bold ${getMatchColorClass(res.analysis?.overallMatch || 0)}`}>
                                {res.analysis?.overallMatch || 0}%
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {/* Overall Row */}
                        <tr className="bg-secondary/30">
                          <td className="p-3 font-medium border-b border-border">Total Score</td>
                          {comparisonResults.map((res, index) => (
                            <td key={index} className="p-3 text-center border-b border-border">
                              <div className={`text-lg font-bold ${getMatchColorClass(res.analysis?.overallMatch || 0)}`}>
                                {res.analysis?.overallMatch || 0}%
                              </div>
                            </td>
                          ))}
                        </tr>

                        {/* Categories */}
                        {getAllUniqueCategories(comparisonResults).map((category, catIndex) => (
                          <tr key={catIndex} className={catIndex % 2 === 0 ? 'bg-white' : 'bg-secondary/10'}>
                            <td className="p-3 font-medium border-b border-border">{category}</td>
                            {comparisonResults.map((res, resIndex) => {
                              const categoryData = res.analysis?.categories?.find(c => c.name === category);
                              return (
                                <td key={resIndex} className="p-3 text-center border-b border-border">
                                  {categoryData ? (
                                    <span className={getMatchColorClass(categoryData.match)}>
                                      {categoryData.match}%
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                        
                        {/* Strengths */}
                        <tr className="bg-secondary/30">
                          <td className="p-3 font-medium border-b border-border">Styrker</td>
                          {comparisonResults.map((res, index) => (
                            <td key={index} className="p-3 border-b border-border">
                              {res.analysis?.strengths && res.analysis.strengths.length > 0 ? (
                                <ul className="list-disc pl-4 text-sm">
                                  {res.analysis.strengths.slice(0, 3).map((str, idx) => (
                                    <li key={idx}>{str}</li>
                                  ))}
                                  {res.analysis.strengths.length > 3 && (
                                    <li className="text-muted-foreground">+{res.analysis.strengths.length - 3} mer</li>
                                  )}
                                </ul>
                              ) : (
                                <span className="text-muted-foreground">Ingen identifisert</span>
                              )}
                            </td>
                          ))}
                        </tr>
                        
                        {/* Weaknesses */}
                        <tr className={comparisonResults.length % 2 === 0 ? 'bg-white' : 'bg-secondary/10'}>
                          <td className="p-3 font-medium border-b border-border">Utviklingsområder</td>
                          {comparisonResults.map((res, index) => (
                            <td key={index} className="p-3 border-b border-border">
                              {res.analysis?.weaknesses && res.analysis.weaknesses.length > 0 ? (
                                <ul className="list-disc pl-4 text-sm">
                                  {res.analysis.weaknesses.slice(0, 3).map((w, idx) => (
                                    <li key={idx}>{w}</li>
                                  ))}
                                  {res.analysis.weaknesses.length > 3 && (
                                    <li className="text-muted-foreground">+{res.analysis.weaknesses.length - 3} mer</li>
                                  )}
                                </ul>
                              ) : (
                                <span className="text-muted-foreground">Ingen identifisert</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-secondary/10 rounded-lg">
                    <p className="text-muted-foreground">Velg minst én CV for å se sammenligning</p>
                  </div>
                )}
              </>
            )}

            {/* Detail view */}
            {viewMode === 'detail' && detailResult && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-1">
                    {batchResult.results[detailViewIndex].name}
                  </h2>
                  {detailResult.jobTitle && detailResult.companyName && (
                    <p className="text-muted-foreground">
                      {detailResult.jobTitle} hos {detailResult.companyName}
                    </p>
                  )}
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

                {/* Score overview */}
                <div className="flex items-center justify-center mb-8">
                  <div className="flex items-center">
                    <div className="text-5xl font-bold mr-3 flex items-center">
                      <span className={getMatchColorClass(detailResult.overallMatch)}>
                        {detailResult.overallMatch}%
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      Total match
                    </div>
                  </div>
                </div>

                {/* Tab content */}
                {activeTab === "overview" && (
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      {detailResult.categories && detailResult.categories.length > 0 ? (
                        detailResult.categories.map((category) => (
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
                        <h3 className="text-lg font-medium mb-4">Styrker</h3>
                        <ul className="space-y-2">
                          {detailResult.strengths && detailResult.strengths.length > 0 ? (
                            detailResult.strengths.map((strength, index) => (
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
                        <h3 className="text-lg font-medium mb-4">Forbedringsområder</h3>
                        <ul className="space-y-2">
                          {detailResult.weaknesses && detailResult.weaknesses.length > 0 ? (
                            detailResult.weaknesses.map((weakness, index) => (
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
                  <div className="space-y-6">
                    {detailResult.categories && detailResult.categories.length > 0 ? (
                      detailResult.categories.map((category) => (
                        <div key={category.name} className="border border-border rounded-lg">
                          <div className="flex justify-between items-center p-4 bg-secondary/30">
                            <h3 className="font-medium">{category.name}</h3>
                            <span className={`font-medium ${getMatchColorClass(category.match)}`}>
                              {category.match}%
                            </span>
                          </div>
                          <div className="p-4">
                            {category.details && category.details.length > 0 ? (
                              <div className="space-y-4">
                                {category.details.map((detail, detailIndex) => {
                                  const isExpanded = expandedDetails[`${category.name}-${detailIndex}`];
                                  return (
                                    <div key={detailIndex} className="border border-border rounded-lg">
                                      <button
                                        className="w-full flex justify-between items-center p-3 text-left"
                                        onClick={() => toggleDetail(category.name, detailIndex)}
                                      >
                                        <div className="font-medium">{detail.name}</div>
                                        <div className="flex items-center">
                                          <span className={`mr-2 ${getMatchColorClass(detail.match)}`}>
                                            {detail.match}%
                                          </span>
                                          {isExpanded ? (
                                            <ChevronUpIcon className="h-4 w-4" />
                                          ) : (
                                            <ChevronDownIcon className="h-4 w-4" />
                                          )}
                                        </div>
                                      </button>
                                      {!!isExpanded && (
                                        <div className="p-3 pt-0 border-t border-border">
                                          <p className="text-sm text-muted-foreground">{detail.reasoning}</p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-muted-foreground">Ingen detaljer tilgjengelig</p>
                            )}
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
                    <h3 className="text-lg font-medium mb-4">Tilbakemeldinger</h3>
                    <div className="space-y-4">
                      {detailResult.feedback && detailResult.feedback.length > 0 ? (
                        detailResult.feedback.map((item, index) => (
                          <div key={index} className="bg-secondary p-4 rounded-lg">
                            <p>{item}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground">Ingen tilbakemeldinger tilgjengelig</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Helper function to get all unique category names across all results
function getAllUniqueCategories(results: { analysis: AnalysisResult }[]) {
  const categories = new Set<string>();
  
  results.forEach(result => {
    if (result.analysis?.categories) {
      result.analysis.categories.forEach(category => {
        categories.add(category.name);
      });
    }
  });
  
  return Array.from(categories);
} 