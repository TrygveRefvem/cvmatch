"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ArrowRightIcon, 
  DocumentTextIcon, 
  UserGroupIcon, 
  SparklesIcon,
  CodeBracketIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

export default function HomePage() {
  const router = useRouter();

  const handleRecruiterStart = () => {
    router.push('/recruit');
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-20 px-4 md:py-28">
          <div className="container mx-auto max-w-6xl">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-12"
            >
              <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
                Effektiviser rekrutteringen med <span className="text-primary">AI-analyse</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
                Få dyp innsikt i kandidater på sekunder. Sammenlign og velg de beste talentene ved hjelp av AI.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-24">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="space-y-6"
              >
                <div className="space-y-5">
                  <ImageCarousel />
                  
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">Kraften av AI i rekruttering</h3>
                    <p className="text-sm text-muted-foreground">Se hvordan CV Match transformerer din ansettelsesprosess.</p>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="flex flex-col justify-center space-y-6"
              >
                <div className="space-y-2">
                  <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                    <DocumentTextIcon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold">Integrert AI-Analyse</h3>
                  <p className="text-muted-foreground">
                    Motta automatisk analyse av hver CV mot stillingsbeskrivelsen for raskere screening.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                    <SparklesIcon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold">Kandidatrangering & Sammenligning</h3>
                  <p className="text-muted-foreground">
                    Ranger kandidater basert på match og sammenlign de beste side-om-side for enklere beslutninger.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                    <UserGroupIcon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold">Sømløs Kandidathåndtering</h3>
                  <p className="text-muted-foreground">
                    Organiser kandidater i egne batcher, oppdater status og administrer hele prosessen på ett sted.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                    <CodeBracketIcon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold">Enkel Integrasjon (Widget)</h3>
                  <p className="text-muted-foreground">
                    Legg til "Søk med CVMatch"-knappen direkte på dine stillingsannonser for å motta søknader effektivt.
                  </p>
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="bg-card p-8 rounded-2xl shadow-sm max-w-3xl mx-auto"
            >
              <h2 className="text-2xl font-semibold mb-6 text-center">Klar til å ansette smartere?</h2>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleRecruiterStart}
                  className="btn btn-primary flex items-center justify-center py-6 px-8 rounded-full text-lg"
                >
                  Gå til Rekrutterer-Dashboard
                  <ArrowRightIcon className="ml-2 h-5 w-5" />
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="bg-secondary py-20">
          <div className="container mx-auto max-w-6xl px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Hva brukerne sier</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-card p-6 rounded-2xl shadow-sm">
                <p className="mb-4">
                  "CV Match hjalp meg å forstå nøyaktig hvordan min profil matchet stillingskravene. Jeg forbedret CV-en min basert på anbefalingene og fikk jobben!"
                </p>
                <p className="font-semibold">- Mari L., Oslo</p>
              </div>
              <div className="bg-card p-6 rounded-2xl shadow-sm">
                <p className="mb-4">
                  "Som rekrutterer sparer batch-analysen meg for mange timer. Nå kan jeg raskt se hvilke kandidater som best matcher stillingen."
                </p>
                <p className="font-semibold">- Kristian S., HR-direktør</p>
              </div>
              <div className="bg-card p-6 rounded-2xl shadow-sm">
                <p className="mb-4">
                  "Den detaljerte analysen viste meg hvilke ferdigheter jeg burde fokusere på å utvikle for å nå karrieremålene mine."
                </p>
                <p className="font-semibold">- Thomas B., Utvikler</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-muted py-8">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-xl font-bold text-primary">CV Match</h3>
              <p className="text-sm text-muted-foreground">AI-drevet CV-analyse og jobbmatching</p>
            </div>
            <div className="flex flex-col md:flex-row gap-4 md:gap-8">
              <Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                Personvern
              </Link>
              <Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                Vilkår
              </Link>
              <Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">
                Om oss
              </Link>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-border text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} CV Match. Alle rettigheter reservert.
          </div>
        </div>
      </footer>
    </div>
  );
}

// Image Carousel Component
function ImageCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const images = [
    {
      src: "/images/cv-analysis-form.png",
      alt: "CV Analyse Skjema",
      caption: "1. Last opp CV"
    },
    {
      src: "/images/cv-analysis-results.png",
      alt: "CV Analyse Resultat",
      caption: "2. Se matchresultat"
    },
    {
      src: "/images/cv-analysis-details.png",
      alt: "CV Analyse Detaljer",
      caption: "3. Utforsk detaljer"
    }
  ];
  
  // Auto-scroll through images
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
    }, 4000); // Change image every 4 seconds
    
    return () => clearInterval(interval);
  }, [images.length]);
  
  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };
  
  const goToNext = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };
  
  return (
    <div className="relative">
      <div className="rounded-xl shadow-md overflow-hidden border border-border aspect-[16/10]">
        <motion.img 
          key={currentIndex}
          src={images[currentIndex].src}
          alt={images[currentIndex].alt}
          className="w-full h-full object-contain"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        />
      </div>
      
      {/* Navigation controls */}
      <div className="flex justify-between mt-4">
        <button 
          onClick={goToPrevious}
          className="bg-primary/10 hover:bg-primary/20 text-primary p-2 rounded-full transition-colors"
          aria-label="Forrige bilde"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        
        <div className="flex space-x-2 items-center">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? "bg-primary" : "bg-gray-300"
              }`}
              aria-label={`Gå til bilde ${index + 1}`}
            />
          ))}
        </div>
        
        <button 
          onClick={goToNext}
          className="bg-primary/10 hover:bg-primary/20 text-primary p-2 rounded-full transition-colors"
          aria-label="Neste bilde"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
