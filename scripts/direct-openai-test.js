#!/usr/bin/env node

// Load environment variables
require('dotenv').config({ path: '.env.local' });
const { OpenAI } = require('openai');

console.log('Starting direct OpenAI API test...');

// Check for API key
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
  
  const apiVersion = '2023-05-15'; // Default version if not specified
  openaiConfig.defaultQuery = { "api-version": apiVersion };
} else {
  console.log('Using standard OpenAI API');
}

// Initialize client
const openai = new OpenAI(openaiConfig);

// Test connection
async function testConnection() {
  try {
    console.log('Testing connection to OpenAI API...');
    const models = await openai.models.list();
    
    console.log('✓ Successfully connected to OpenAI API');
    console.log('Available models (up to 5):');
    models.data.slice(0, 5).forEach(model => {
      console.log(`- ${model.id}`);
    });
    
    return { success: true, models: models.data.slice(0, 5) };
  } catch (error) {
    console.error('✗ Failed to connect to OpenAI API:');
    console.error(error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    return { success: false, error };
  }
}

// Run the test
testConnection()
  .then(result => {
    if (!result.success) {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  }); 