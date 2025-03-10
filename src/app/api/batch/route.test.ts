import { POST } from './route';
import { NextRequest } from 'next/server';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai', () => {
  const mockCreate = jest.fn();
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      }
    }))
  };
});

describe('Batch API Route', () => {
  let mockOpenAICreate: jest.Mock;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
    
    // Get reference to the mocked create function
    mockOpenAICreate = new OpenAI({ apiKey: 'test' }).chat.completions.create as jest.Mock;
    
    // Set default successful response
    mockOpenAICreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            overallMatch: 75,
            jobTitle: "Utvikler",
            companyName: "TestSelskap AS",
            categories: [
              {
                name: "Ferdigheter",
                match: 80,
                details: [
                  {
                    name: "JavaScript",
                    match: 85,
                    required: true,
                    reasoning: "God erfaring med JavaScript"
                  }
                ]
              }
            ],
            feedback: ["God teknisk kompetanse"],
            strengths: ["JavaScript-erfaring"],
            weaknesses: ["Mangler TypeScript-erfaring"],
            recommendationLetter: {
              positive: "Anbefaler kandidaten",
              negative: "Beklager, ikke kvalifisert"
            }
          })
        }
      }]
    });
  });

  it('should return 400 when no CVs are provided', async () => {
    const request = new NextRequest('http://localhost/api/batch', {
      method: 'POST',
      body: JSON.stringify({
        jobSource: { text: 'Test job posting' }
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Ingen CV-er ble sendt med forespørselen');
  });

  it('should return 400 when no job posting is provided', async () => {
    const request = new NextRequest('http://localhost/api/batch', {
      method: 'POST',
      body: JSON.stringify({
        cvs: [{ text: 'Test CV', name: 'test.pdf' }],
        jobSource: {}
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Stillingsannonse mangler');
  });

  it('should process multiple CVs successfully', async () => {
    const request = new NextRequest('http://localhost/api/batch', {
      method: 'POST',
      body: JSON.stringify({
        cvs: [
          { text: 'Test CV 1', name: 'cv1.pdf' },
          { text: 'Test CV 2', name: 'cv2.pdf' }
        ],
        jobSource: { text: 'Test job posting' }
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalProcessed).toBe(2);
    expect(data.successfulAnalyses).toBe(2);
    expect(data.failedAnalyses).toBe(0);
    expect(data.results).toHaveLength(2);
    expect(data.results[0].analysis.overallMatch).toBe(75);
  });

  it('should handle URL-based job postings', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('Test job posting from URL')
    });

    const request = new NextRequest('http://localhost/api/batch', {
      method: 'POST',
      body: JSON.stringify({
        cvs: [{ text: 'Test CV', name: 'test.pdf' }],
        jobSource: { url: 'https://example.com/job' }
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith('https://example.com/job');
    expect(data.results).toHaveLength(1);
  });

  it('should handle failed CV analysis gracefully', async () => {
    // Mock first call to succeed and second to fail
    mockOpenAICreate
      .mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              overallMatch: 75,
              jobTitle: "Utvikler",
              categories: []
            })
          }
        }]
      })
      .mockRejectedValueOnce(new Error('Analysis failed'));

    const request = new NextRequest('http://localhost/api/batch', {
      method: 'POST',
      body: JSON.stringify({
        cvs: [
          { text: 'Test CV 1', name: 'cv1.pdf' },
          { text: 'Test CV 2', name: 'cv2.pdf' }
        ],
        jobSource: { text: 'Test job posting' }
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalProcessed).toBe(2);
    expect(data.successfulAnalyses).toBe(1);
    expect(data.failedAnalyses).toBe(1);
    expect(data.results).toHaveLength(2);
    expect(data.results[0].analysis).toBeDefined();
    expect(data.results[1].error).toBeDefined();
  });

  it('should truncate long CVs and job postings', async () => {
    const longText = 'a'.repeat(20000);
    
    const request = new NextRequest('http://localhost/api/batch', {
      method: 'POST',
      body: JSON.stringify({
        cvs: [{ text: longText, name: 'long.pdf' }],
        jobSource: { text: longText }
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results[0].analysis.overallMatch).toBe(75);
  });
}); 