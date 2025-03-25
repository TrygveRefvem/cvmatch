#!/usr/bin/env node

// Load environment variables
require('dotenv').config({ path: '.env.local' });
const express = require('express');
const { OpenAI } = require('openai');
const cors = require('cors');

// Check for required environment variables
if (!process.env.OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY is not set in .env.local');
  process.exit(1);
}

console.log('API Key is set');

// Configure OpenAI client
const openaiConfig = {
  apiKey: process.env.OPENAI_API_KEY,
};

// Azure OpenAI configuration
if (process.env.OPENAI_API_BASE_URL) {
  console.log('Using Azure OpenAI with base URL:', process.env.OPENAI_API_BASE_URL);
  openaiConfig.baseURL = process.env.OPENAI_API_BASE_URL;
  
  const apiVersion = process.env.OPENAI_API_VERSION || '2023-05-15';
  openaiConfig.defaultQuery = { "api-version": apiVersion };
} else {
  console.log('Using standard OpenAI API');
}

// Initialize client
const openai = new OpenAI(openaiConfig);

// Create express app
const app = express();
const PORT = 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Root endpoint with HTML interface
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>OpenAI API Test</title>
      <style>
        body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #333; }
        button { background: #0070f3; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0051a2; }
        pre { background: #f4f4f4; padding: 10px; border-radius: 4px; white-space: pre-wrap; }
        .success { color: green; }
        .error { color: red; }
      </style>
    </head>
    <body>
      <h1>OpenAI API Test</h1>
      <p>This standalone server tests the OpenAI API connection.</p>
      
      <div>
        <button id="testButton">Test OpenAI Connection</button>
      </div>
      
      <h2>Results:</h2>
      <pre id="results">Click the button to test the connection.</pre>
      
      <script>
        document.getElementById('testButton').addEventListener('click', async () => {
          const resultsElement = document.getElementById('results');
          resultsElement.textContent = 'Testing...';
          
          try {
            const response = await fetch('/api/test', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            const data = await response.json();
            resultsElement.innerHTML = '<span class="' + (data.success ? 'success' : 'error') + '">' + 
              (data.success ? 'SUCCESS' : 'ERROR') + '</span>\\n\\n' + 
              JSON.stringify(data, null, 2);
          } catch (error) {
            resultsElement.innerHTML = '<span class="error">ERROR</span>\\n\\n' + error.message;
          }
        });
      </script>
    </body>
    </html>
  `);
});

// Test API endpoint
app.get('/api/test', async (req, res) => {
  try {
    console.log('Testing connection to OpenAI API...');
    const models = await openai.models.list();
    
    console.log('✓ Successfully connected to OpenAI API');
    console.log('Available models (up to 5):');
    models.data.slice(0, 5).forEach(model => {
      console.log(`- ${model.id}`);
    });
    
    res.json({
      success: true,
      message: 'Successfully connected to OpenAI API',
      models: models.data.slice(0, 5).map(model => model.id),
      config: {
        baseUrl: process.env.OPENAI_API_BASE_URL ? 'Azure OpenAI' : 'Standard OpenAI',
        apiKeySet: !!process.env.OPENAI_API_KEY
      }
    });
  } catch (error) {
    console.error('✗ Failed to connect to OpenAI API:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      config: {
        baseUrl: process.env.OPENAI_API_BASE_URL ? 'Azure OpenAI' : 'Standard OpenAI',
        apiKeySet: !!process.env.OPENAI_API_KEY
      }
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Standalone OpenAI test server running at http://localhost:${PORT}`);
  console.log(`Test API endpoint available at http://localhost:${PORT}/api/test`);
}); 