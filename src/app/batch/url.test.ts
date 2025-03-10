import fetch from 'node-fetch';

describe('Batch URL Tilgjengelighet', () => {
  const BASE_URL = 'https://cvmatch-test-container.bluesky-b0ef8150.westeurope.azurecontainerapps.io';
  
  // Øk timeout for nettverksforespørsler
  jest.setTimeout(30000);

  it('batch-endepunktet skal være tilgjengelig', async () => {
    try {
      const response = await fetch(`${BASE_URL}/batch`);
      console.log('Batch status:', response.status);
      console.log('Batch headers:', response.headers);
      expect(response.status).not.toBe(404);
    } catch (error) {
      console.error('Feil ved testing av batch-endepunkt:', error);
      throw error;
    }
  });

  it('batch-endepunktet skal returnere HTML', async () => {
    try {
      const response = await fetch(`${BASE_URL}/batch`);
      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);
      expect(contentType?.toLowerCase()).toContain('text/html');
    } catch (error) {
      console.error('Feil ved testing av content-type:', error);
      throw error;
    }
  });

  it('batch-endepunktet med trailing slash skal også fungere', async () => {
    try {
      const response = await fetch(`${BASE_URL}/batch/`);
      console.log('Batch/ status:', response.status);
      expect(response.status).not.toBe(404);
    } catch (error) {
      console.error('Feil ved testing av batch/ endepunkt:', error);
      throw error;
    }
  });

  it('batch/result-endepunktet skal være tilgjengelig', async () => {
    try {
      const response = await fetch(`${BASE_URL}/batch/result`);
      console.log('Batch/result status:', response.status);
      expect(response.status).not.toBe(404);
    } catch (error) {
      console.error('Feil ved testing av batch/result endepunkt:', error);
      throw error;
    }
  });

  // Test andre relaterte ruter for å sammenligne
  it('hovedsiden skal være tilgjengelig', async () => {
    try {
      const response = await fetch(BASE_URL);
      console.log('Hovedside status:', response.status);
      expect(response.status).not.toBe(404);
    } catch (error) {
      console.error('Feil ved testing av hovedsiden:', error);
      throw error;
    }
  });

  it('match-endepunktet skal være tilgjengelig', async () => {
    try {
      const response = await fetch(`${BASE_URL}/match`);
      console.log('Match status:', response.status);
      expect(response.status).not.toBe(404);
    } catch (error) {
      console.error('Feil ved testing av match-endepunkt:', error);
      throw error;
    }
  });
}); 