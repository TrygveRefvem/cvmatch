import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import BatchPage from './page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

// Mock File.prototype.text
const mockFileText = jest.fn().mockResolvedValue('test cv content');
File.prototype.text = mockFileText;

describe('BatchPage', () => {
  const mockPush = jest.fn();
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    
    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();
    (global.fetch as jest.Mock).mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          results: [
            {
              name: 'test.pdf',
              analysis: {
                overallMatch: 75
              }
            }
          ],
          totalProcessed: 1,
          successfulAnalyses: 1,
          failedAnalyses: 0
        })
      })
    );
  });

  it('rendrer batch-siden med riktige elementer', () => {
    render(<BatchPage />);
    
    expect(screen.getByText('Batch CV-analyse')).toBeInTheDocument();
    expect(screen.getByText('Last opp CV-er')).toBeInTheDocument();
    expect(screen.getByText('Start batch-analyse')).toBeInTheDocument();
  });

  it('håndterer filopplasting', () => {
    render(<BatchPage />);
    
    const file = new File(['test cv content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/Last opp CV-er/i);
    
    fireEvent.change(input, { target: { files: [file] } });
    
    expect(screen.getByText('test.pdf')).toBeInTheDocument();
  });

  it('fjerner opplastet fil når X-knappen klikkes', () => {
    render(<BatchPage />);
    
    const file = new File(['test cv content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/Last opp CV-er/i);
    
    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByText('test.pdf')).toBeInTheDocument();
    
    const removeButton = screen.getByText('×');
    fireEvent.click(removeButton);
    
    expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
  });

  it('bytter mellom URL og tekst input for stillingsannonse', () => {
    render(<BatchPage />);
    
    // Start med URL (default)
    expect(screen.getByPlaceholderText(/Lim inn URL/i)).toBeInTheDocument();
    
    // Bytt til tekst
    fireEvent.click(screen.getByText('Tekst'));
    expect(screen.getByPlaceholderText(/Lim inn teksten/i)).toBeInTheDocument();
    
    // Bytt tilbake til URL
    fireEvent.click(screen.getByText('URL'));
    expect(screen.getByPlaceholderText(/Lim inn URL/i)).toBeInTheDocument();
  });

  it('sender data til API-en og navigerer til resultatsiden ved vellykket analyse', async () => {
    render(<BatchPage />);
    
    // Last opp en fil
    const file = new File(['test cv content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/Last opp CV-er/i);
    fireEvent.change(input, { target: { files: [file] } });
    
    // Legg inn stillingsannonse URL
    const urlInput = screen.getByPlaceholderText(/Lim inn URL/i);
    fireEvent.change(urlInput, { target: { value: 'https://example.com/job' } });
    
    // Send skjemaet
    const submitButton = screen.getByText('Start batch-analyse');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/batch', expect.any(Object));
      expect(mockPush).toHaveBeenCalledWith('/batch/result');
    });
  });

  it('viser feilmelding ved API-feil', async () => {
    const errorMessage = 'Det oppstod en feil under analysen';
    // Mock API-feil
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: errorMessage })
      })
    );
    
    render(<BatchPage />);
    
    // Last opp en fil
    const file = new File(['test cv content'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/Last opp CV-er/i);
    fireEvent.change(input, { target: { files: [file] } });
    
    // Legg inn stillingsannonse URL
    const urlInput = screen.getByPlaceholderText(/Lim inn URL/i);
    fireEvent.change(urlInput, { target: { value: 'https://example.com/job' } });
    
    // Send skjemaet
    const submitButton = screen.getByText('Start batch-analyse');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });
}); 