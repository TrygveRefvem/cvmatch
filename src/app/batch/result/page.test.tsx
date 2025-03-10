import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import BatchResultPage from './page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

const mockResults = {
  results: [
    {
      name: 'cv1.pdf',
      analysis: {
        overallMatch: 85,
        jobTitle: 'Utvikler',
        companyName: 'TestSelskap AS',
        categories: [
          {
            name: 'Ferdigheter',
            match: 80,
            details: [
              {
                name: 'JavaScript',
                match: 85,
                required: true,
                reasoning: 'God erfaring med JavaScript'
              }
            ]
          }
        ],
        feedback: ['God teknisk kompetanse'],
        strengths: ['JavaScript-erfaring'],
        weaknesses: ['Mangler TypeScript-erfaring'],
        recommendationLetter: {
          positive: 'Anbefaler kandidaten',
          negative: 'Beklager, ikke kvalifisert'
        }
      }
    },
    {
      name: 'cv2.pdf',
      error: 'Feil under analyse'
    }
  ],
  totalProcessed: 2,
  successfulAnalyses: 1,
  failedAnalyses: 1
};

describe('BatchResultPage', () => {
  const mockPush = jest.fn();
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    
    // Mock sessionStorage
    const mockGetItem = jest.spyOn(Storage.prototype, 'getItem');
    mockGetItem.mockReturnValue(JSON.stringify(mockResults));
  });

  it('navigerer tilbake til batch-siden hvis ingen resultater finnes', () => {
    // Overstyr sessionStorage mock for denne testen
    const mockGetItem = jest.spyOn(Storage.prototype, 'getItem');
    mockGetItem.mockReturnValue(null);
    
    render(<BatchResultPage />);
    
    expect(mockPush).toHaveBeenCalledWith('/batch');
  });

  it('viser liste over analyserte CV-er', () => {
    render(<BatchResultPage />);
    
    expect(screen.getByText('cv1.pdf')).toBeInTheDocument();
    expect(screen.getByText('cv2.pdf')).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      if (!element) return false;
      const parent = element.parentElement;
      if (!parent) return false;
      const button = parent.parentElement;
      if (!button) return false;
      return element.tagName.toLowerCase() === 'span' && 
             element.className.includes('text-sm') && 
             parent.className.includes('flex items-center justify-between') &&
             button.tagName.toLowerCase() === 'button' &&
             button.className.includes('bg-primary') &&
             content.includes('85%');
    })).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      if (!element) return false;
      return element.tagName.toLowerCase() === 'p' && 
             element.className.includes('text-sm') && 
             element.className.includes('text-red-500') && 
             content === 'Feil under analyse';
    })).toBeInTheDocument();
  });

  it('viser statistikk for batch-analysen', () => {
    render(<BatchResultPage />);
    
    expect(screen.getByText('Totalt analysert: 2')).toBeInTheDocument();
    expect(screen.getByText('Vellykkede: 1')).toBeInTheDocument();
    expect(screen.getByText('Feilet: 1')).toBeInTheDocument();
  });

  it('viser detaljert analyse når en CV velges', () => {
    render(<BatchResultPage />);
    
    // Første CV er valgt som standard
    expect(screen.getByText('Utvikler - TestSelskap AS')).toBeInTheDocument();
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
    expect(screen.getByText('God erfaring med JavaScript')).toBeInTheDocument();
    expect(screen.getByText('Anbefaler kandidaten')).toBeInTheDocument();
  });

  it('bytter mellom CV-er når man klikker på dem', () => {
    render(<BatchResultPage />);
    
    // Klikk på den andre CV-en
    fireEvent.click(screen.getByText('cv2.pdf'));
    
    // Sjekk at feilmeldingen vises
    expect(screen.getByText((content, element) => {
      return element?.tagName.toLowerCase() === 'h2' && 
             element?.className.includes('text-red-600') && 
             content === 'Feil under analyse';
    })).toBeInTheDocument();
    
    // Klikk tilbake på den første CV-en
    fireEvent.click(screen.getByText('cv1.pdf'));
    
    // Sjekk at analysen vises igjen
    expect(screen.getByText('Utvikler - TestSelskap AS')).toBeInTheDocument();
  });

  it('viser positiv anbefaling for høy match', () => {
    render(<BatchResultPage />);
    
    expect(screen.getByText('Anbefaler kandidaten')).toBeInTheDocument();
    expect(screen.queryByText('Beklager, ikke kvalifisert')).not.toBeInTheDocument();
  });
}); 