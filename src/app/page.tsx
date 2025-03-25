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
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

export default function HomePage() {
  const router = useRouter();
  const [consentChecked, setConsentChecked] = useState(false);
  const [showConsentError, setShowConsentError] = useState(false);

  const handleStartClick = () => {
    if (consentChecked) {
      router.push('/match');
    } else {
      setShowConsentError(true);
    }
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
                Din CV. Din mulighet. <span className="text-primary">Forbedret.</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
                AI-drevet CV-analyse som gir deg innsikt i hvordan din profil matcher drømmejobben.
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
                  {/* Image Carousel */}
                  <ImageCarousel />
                  
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">Se hvordan det fungerer</h3>
                    <p className="text-sm text-muted-foreground">Fra jobbsøk til detaljert CV-analyse på sekunder</p>
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
                  <h3 className="text-2xl font-semibold">Detaljert CV-analyse</h3>
                  <p className="text-muted-foreground">
                    Last opp din CV og få en detaljert analyse av dine ferdigheter, erfaringer og styrker.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                    <SparklesIcon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold">Stillingssamsvar</h3>
                  <p className="text-muted-foreground">
                    Matchverdier for hver kompetanse og erfaring mot stillingsannonsen, med konkrete forbedringsforslag.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                    <UserGroupIcon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold">Batch-analyse</h3>
                  <p className="text-muted-foreground">
                    Analysér flere kandidater mot samme stilling og få en sammenligningsrapport.
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
              <h2 className="text-2xl font-semibold mb-6 text-center">Kom i gang</h2>

              <div className="mb-6">
                <div className="flex items-start mb-2">
                  <input 
                    type="checkbox" 
                    id="gdprConsent"
                    className="mt-1 mr-3" 
                    checked={consentChecked}
                    onChange={() => {
                      setConsentChecked(!consentChecked);
                      if (showConsentError) setShowConsentError(false);
                    }}
                  />
                  <label htmlFor="gdprConsent" className="text-sm text-muted-foreground">
                    Jeg godtar at min CV og stillingsdata behandles i samsvar med 
                    <Link href="/privacy" className="text-primary hover:underline ml-1">
                      personvernerklæringen
                    </Link>. Dataene blir slettet etter 30 dager.
                  </label>
                </div>
                {showConsentError && (
                  <p className="text-red-500 text-sm mt-1">
                    Du må godkjenne personvernerklæringen for å fortsette.
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleStartClick}
                  className={`btn btn-primary flex items-center justify-center py-6 px-8 rounded-full text-lg ${!consentChecked ? 'opacity-50' : ''}`}
                >
                  Start analysen
                  <ArrowRightIcon className="ml-2 h-5 w-5" />
                </button>
                <Link 
                  href="/batch" 
                  className={`btn btn-secondary flex items-center justify-center py-6 px-8 rounded-full text-lg ${!consentChecked ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={(e) => !consentChecked && e.preventDefault()}
                >
                  Batch-analyse
                </Link>
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
