#!/bin/bash

# Load environment variables from .env.local
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
  echo "Loaded environment variables from .env.local"
else
  echo "No .env.local file found. Create one from .env.local.example"
  exit 1
fi

# Start the development server
npm run dev 