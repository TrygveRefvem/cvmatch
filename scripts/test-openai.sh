#!/bin/bash

# Load environment variables from .env.local
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
  echo "Loaded environment variables from .env.local"
else
  echo "No .env.local file found. Create one from .env.local.example"
  exit 1
fi

# Check if we're using Azure OpenAI
if [ -n "$OPENAI_API_BASE_URL" ]; then
  echo "Using Azure OpenAI with base URL: $OPENAI_API_BASE_URL"
else
  echo "Using standard OpenAI API"
fi

# Run the test API endpoint
echo "Testing OpenAI integration..."
curl -s http://localhost:3000/api/test | jq 