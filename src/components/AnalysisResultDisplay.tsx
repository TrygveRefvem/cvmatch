'use client'

import { useState } from "react";
import Link from "next/link";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import React from "react";

// Type definition (can be shared or redefined here)
interface AnalysisResult {
  overallMatch?: number | null;
  jobTitle?: string | null;
  companyName?: string | null;
  categories?: {
    name: string;
    match: number;
    details: {
      name: string;
      match: number;
      required: boolean;
      reasoning: string;
    }[];
  }[];
  feedback?: string[];
  strengths?: string[];
  weaknesses?: string[];
}

interface AnalysisResultDisplayProps {
  resultData: AnalysisResult;
}

export default function AnalysisResultDisplay({ resultData }: AnalysisResultDisplayProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [expandedDetails, setExpandedDetails] = useState<{ [key: string]: boolean }>({});

  const toggleDetail = (categoryName: string, detailIndex: number) => {
    const key = `${categoryName}-${detailIndex}`;
    setExpandedDetails(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Function to determine color class based on match percentage
  const getMatchColorClass = (percentage: number | null | undefined) => {
    if (percentage === null || typeof percentage === 'undefined') return "text-gray-500"; // Default for missing data
    if (percentage >= 70) return "text-green-600 font-semibold";
    if (percentage >= 40) return "text-yellow-600 font-semibold";
    return "text-red-600 font-semibold";
  };

   // Function to get background color for match badge
  const getMatchBgColorClass = (percentage: number | null | undefined) => {
    if (percentage === null || typeof percentage === 'undefined') return "bg-gray-100 text-gray-800"; 
    if (percentage >= 70) return "bg-green-100 text-green-800";
    if (percentage >= 40) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  // Handle potentially missing result data gracefully
  if (!resultData || Object.keys(resultData).length === 0) {
     return <p className="text-center text-gray-500">Kunne ikke laste resultatdata.</p>;
  }

  // Default values for potentially missing fields
  const overallMatch = resultData.overallMatch ?? null;
  const jobTitle = resultData.jobTitle ?? 'Ukjent jobb';
  const companyName = resultData.companyName ?? 'Ukjent firma';
  const categories = resultData.categories ?? [];
  const feedback = resultData.feedback ?? [];
  const strengths = resultData.strengths ?? [];
  const weaknesses = resultData.weaknesses ?? [];

  return (
    <div className="w-full">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-8">
        <div className="flex items-center mb-4 md:mb-0">
          {/* Optional: Add an icon or logo? */}
          <div>
            <h2 className="text-xl font-semibold">{jobTitle}</h2>
            <p className="text-muted-foreground">{companyName}</p>
          </div>
        </div>
        <div className="text-center">
          <div className={`text-4xl font-bold mb-1 ${getMatchColorClass(overallMatch)}`}>
            {overallMatch !== null ? `${overallMatch}%` : '-%'}
          </div>
          <p className="text-sm text-muted-foreground">Total match</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <div className="flex space-x-8">
          <button
            className={`pb-2 px-1 ${activeTab === "overview" ? "border-b-2 border-primary text-foreground font-medium" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("overview")}
          >
            Oversikt
          </button>
          <button
            className={`pb-2 px-1 ${activeTab === "details" ? "border-b-2 border-primary text-foreground font-medium" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("details")}
          >
            Detaljer
          </button>
          <button
            className={`pb-2 px-1 ${activeTab === "feedback" ? "border-b-2 border-primary text-foreground font-medium" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("feedback")}
          >
            Tilbakemelding
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Styrker</h3>
              {strengths.length > 0 ? (
                <ul className="list-disc list-inside space-y-1 text-green-700">
                  {strengths.map((item, index) => <li key={`strength-${index}`}>{item}</li>)}
                </ul>
              ) : <p className="text-muted-foreground italic">Ingen spesifikke styrker fremhevet.</p>}
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3">Svakheter / Forbedringsområder</h3>
              {weaknesses.length > 0 ? (
                <ul className="list-disc list-inside space-y-1 text-red-700">
                  {weaknesses.map((item, index) => <li key={`weakness-${index}`}>{item}</li>)}
                </ul>
              ) : <p className="text-muted-foreground italic">Ingen spesifikke svakheter fremhevet.</p>}
            </div>
          </div>
        )}

        {activeTab === "details" && (
          <div className="space-y-6">
            {categories.length > 0 ? categories.map((category, catIndex) => (
              <div key={catIndex} className="border rounded-md p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-md font-semibold">{category.name}</h4>
                  <span className={`text-lg font-bold ${getMatchColorClass(category.match)}`}>{category.match}%</span>
                </div>
                <ul className="space-y-2 mt-2">
                  {category.details.map((detail, detailIndex) => {
                    const isExpanded = expandedDetails[`${category.name}-${detailIndex}`];
                    return (
                      <li key={detailIndex} className="border-t pt-2">
                        <div className="flex justify-between items-start">
                          <span className="flex-1 mr-2">
                            {detail.name} {detail.required && <span className="text-xs text-red-500">(Påkrevd)</span>}
                          </span>
                          <button 
                            onClick={() => toggleDetail(category.name, detailIndex)}
                            className="flex items-center text-xs text-indigo-600 hover:text-indigo-800"
                          >
                            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getMatchBgColorClass(detail.match)}`}>
                              {detail.match}% match
                            </span>
                             {isExpanded ? 
                               <ChevronUpIcon className="h-4 w-4 ml-2" /> :
                               <ChevronDownIcon className="h-4 w-4 ml-2" />
                             }
                          </button>
                        </div>
                        {isExpanded && (
                          <p className="text-sm text-muted-foreground mt-1 pl-2 border-l-2 border-gray-200">
                            {detail.reasoning}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )) : <p className="text-muted-foreground italic">Ingen detaljerte kategorier funnet.</p>}
          </div>
        )}

        {activeTab === "feedback" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-3">Generell Tilbakemelding</h3>
             {feedback.length > 0 ? (
                <ul className="list-disc list-inside space-y-1">
                  {feedback.map((item, index) => <li key={`feedback-${index}`}>{item}</li>)}
                </ul>
              ) : <p className="text-muted-foreground italic">Ingen generell tilbakemelding gitt.</p>}
          </div>
        )}
      </div>
    </div>
  );
} 