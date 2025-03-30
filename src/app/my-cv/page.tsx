'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, DocumentArrowUpIcon, BriefcaseIcon, AcademicCapIcon, SparklesIcon, PhoneIcon, EnvelopeIcon, LinkIcon, MapPinIcon, LanguageIcon } from "@heroicons/react/24/outline";
import React from 'react';

// --- Define CV Data Structure (Matching API) ---
interface CvContactInfo {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    linkedin?: string;
    website?: string;
}

interface CvExperience {
    jobTitle?: string;
    company?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
}

interface CvEducation {
    degree?: string;
    institution?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
}

interface CvData {
    contactInfo?: CvContactInfo;
    summary?: string;
    skills?: string[];
    experience?: CvExperience[];
    education?: CvEducation[];
    languages?: string[];
}

export default function MyCvPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [structuredCv, setStructuredCv] = useState<CvData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Fetch existing CV profile on load ---
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.replace('/auth/signin?callbackUrl=/my-cv');
      return;
    }

    if (sessionStatus === 'authenticated') {
      const fetchProfile = async () => {
         setIsLoading(true);
         setError(null);
         setSuccessMessage(null);
         try {
            const response = await fetch('/api/seeker/profile/cv');
            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || "Kunne ikke hente lagret CV.");
            }
            
            if (data.profile) {
               setStructuredCv(data.profile.structuredCvJson || null);
               console.log("Existing profile loaded, last updated:", data.profile.updatedAt);
               if (!data.profile.structuredCvJson) {
                   console.warn("Loaded profile is missing structuredCvJson");
               }
            } else {
               setStructuredCv(null);
               console.log("No existing profile found for user.");
            }

         } catch (err) {
            setError(err instanceof Error ? err.message : "En feil oppstod ved henting av CV.");
            setStructuredCv(null);
         } finally {
            setIsLoading(false);
         }
      };
      fetchProfile();
    }
  }, [sessionStatus, session, router]);

  // --- Handle file selection ---
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccessMessage(null);
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  // --- Handle form submission ---
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      setError('Vennligst velg en CV-fil å laste opp.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append('cvFile', selectedFile);

    try {
      const response = await fetch('/api/seeker/profile/cv', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Opplasting feilet.');
      }

      setStructuredCv(data.structuredCvJson || null);
      setSuccessMessage(data.message || 'CV lastet opp og parset!');
      if (!data.structuredCvJson) {
          console.warn("API response missing structuredCvJson after upload");
          setError("CV lastet opp, men strukturering feilet delvis. Viser råtekst.");
      }

      setSelectedFile(null);
      if (fileInputRef.current) {
          fileInputRef.current.value = "";
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'En uventet feil oppstod under opplasting.');
      setStructuredCv(null);
    } finally {
      setIsUploading(false);
    }
  };

  // --- Render Loading/Content ---
  if (sessionStatus === 'loading' || (sessionStatus === 'authenticated' && isLoading)) {
     return <div className="flex items-center justify-center min-h-screen"><p>Laster...</p></div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 py-12">
        <div className="container max-w-4xl">
          <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Tilbake til forsiden
          </Link>

          <div className="card bg-card text-card-foreground shadow-lg rounded-lg p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6">Min CV</h1>

            <p className="text-muted-foreground mb-6">
              Last opp din primære CV her. Denne CV-en vil bli brukt når du analyserer
              stillingsannonser du lagrer. Vi støtter PDF, DOCX og TXT-filer.
            </p>

            {/* Upload Form */}
            <form onSubmit={handleSubmit} className="space-y-4 border-t pt-6">
               {error && (
                 <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>
               )}
               {successMessage && (
                 <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">{successMessage}</div>
               )}
               <div>
                 <label htmlFor="cv-upload" className="block text-sm font-medium text-foreground mb-1">
                   Velg CV-fil
                 </label>
                 <input
                    type="file"
                    id="cv-upload"
                    name="cvFile"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.txt"
                    required
                    disabled={isUploading}
                    className="block w-full text-sm text-foreground border border-muted rounded-lg cursor-pointer bg-muted/50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                 />
               </div>
               <div className="text-right">
                  <button
                    type="submit"
                    disabled={isUploading || !selectedFile}
                    className="btn btn-primary inline-flex items-center gap-2"
                  >
                    <DocumentArrowUpIcon className="h-5 w-5" />
                    {isUploading ? 'Laster opp...' : 'Lagre CV'}
                  </button>
               </div>
            </form>

            {/* --- Display Structured CV --- */}
            {structuredCv && !isLoading && (
              <div className="mt-8 border-t pt-6 space-y-8">
                <h2 className="text-xl font-semibold mb-4">Nåværende Lagret CV</h2>

                {/* Contact Info */}
                {structuredCv.contactInfo && (
                  <section>
                    <h3 className="text-lg font-semibold mb-3 border-b pb-1">Kontaktinformasjon</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {structuredCv.contactInfo.name && <p><strong className="text-foreground">Navn:</strong> {structuredCv.contactInfo.name}</p>}
                      {structuredCv.contactInfo.address && <p className="flex items-start"><MapPinIcon className="h-4 w-4 mr-2 mt-0.5 text-primary flex-shrink-0"/> {structuredCv.contactInfo.address}</p>}
                      {structuredCv.contactInfo.phone && <p className="flex items-center"><PhoneIcon className="h-4 w-4 mr-2 text-primary"/> {structuredCv.contactInfo.phone}</p>}
                      {structuredCv.contactInfo.email && <p className="flex items-center"><EnvelopeIcon className="h-4 w-4 mr-2 text-primary"/> <a href={`mailto:${structuredCv.contactInfo.email}`} className="hover:underline">{structuredCv.contactInfo.email}</a></p>}
                      {structuredCv.contactInfo.linkedin && <p className="flex items-center"><LinkIcon className="h-4 w-4 mr-2 text-primary"/> <a href={structuredCv.contactInfo.linkedin} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">{structuredCv.contactInfo.linkedin}</a></p>}
                      {structuredCv.contactInfo.website && <p className="flex items-center"><LinkIcon className="h-4 w-4 mr-2 text-primary"/> <a href={structuredCv.contactInfo.website} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">{structuredCv.contactInfo.website}</a></p>}
                    </div>
                  </section>
                )}

                {/* Summary */}
                {structuredCv.summary && (
                  <section>
                    <h3 className="text-lg font-semibold mb-3 border-b pb-1">Sammendrag</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{structuredCv.summary}</p>
                  </section>
                )}

                {/* Experience */}
                {structuredCv.experience && structuredCv.experience.length > 0 && (
                  <section>
                    <h3 className="text-lg font-semibold mb-3 border-b pb-1 flex items-center"><BriefcaseIcon className="h-5 w-5 mr-2 text-primary"/> Arbeidserfaring</h3>
                    <div className="space-y-6">
                      {structuredCv.experience.map((exp, index) => (
                        <div key={index} className="text-sm">
                          <h4 className="font-semibold text-foreground">{exp.jobTitle || 'Ukjent Stilling'}</h4>
                          <p className="text-muted-foreground">{exp.company}{exp.location ? `, ${exp.location}` : ''}</p>
                          <p className="text-xs text-muted-foreground">{exp.startDate}{exp.endDate ? ` - ${exp.endDate}` : ' - Nåværende'}</p>
                          {exp.description && <p className="mt-2 text-muted-foreground whitespace-pre-line">{exp.description}</p>}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Education */}
                {structuredCv.education && structuredCv.education.length > 0 && (
                  <section>
                    <h3 className="text-lg font-semibold mb-3 border-b pb-1 flex items-center"><AcademicCapIcon className="h-5 w-5 mr-2 text-primary"/> Utdanning</h3>
                    <div className="space-y-4">
                      {structuredCv.education.map((edu, index) => (
                        <div key={index} className="text-sm">
                          <h4 className="font-semibold text-foreground">{edu.degree || 'Ukjent Grad'}</h4>
                          <p className="text-muted-foreground">{edu.institution}{edu.location ? `, ${edu.location}` : ''}</p>
                          <p className="text-xs text-muted-foreground">{edu.startDate}{edu.endDate ? ` - ${edu.endDate}` : ''}</p>
                          {edu.description && <p className="mt-1 text-muted-foreground whitespace-pre-line">{edu.description}</p>}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Skills */}
                {structuredCv.skills && structuredCv.skills.length > 0 && (
                  <section>
                    <h3 className="text-lg font-semibold mb-3 border-b pb-1 flex items-center"><SparklesIcon className="h-5 w-5 mr-2 text-primary"/> Ferdigheter</h3>
                    <div className="flex flex-wrap gap-2">
                      {structuredCv.skills.map((skill, index) => (
                        <span key={index} className="inline-block bg-primary/10 text-primary text-xs font-medium px-2.5 py-0.5 rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {/* Languages */}
                {structuredCv.languages && structuredCv.languages.length > 0 && (
                  <section>
                    <h3 className="text-lg font-semibold mb-3 border-b pb-1 flex items-center"><LanguageIcon className="h-5 w-5 mr-2 text-primary"/> Språk</h3>
                     <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                       {structuredCv.languages.map((lang, index) => (
                         <li key={index}>{lang}</li>
                       ))}
                     </ul>
                  </section>
                )}

              </div>
            )}
            {/* --- End Structured CV Display --- */}

            {/* Fallback message if no CV loaded */}
            {!structuredCv && !isLoading && !error && (
                 <p className="mt-8 border-t pt-6 text-center text-muted-foreground italic">
                     Du har ikke lastet opp en CV ennå.
                 </p>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}