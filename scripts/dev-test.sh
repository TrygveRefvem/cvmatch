#!/bin/bash

# Load environment variables from .env.local
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
  echo "Loaded environment variables from .env.local"
else
  echo "No .env.local file found. Using default environment."
fi

# Run tests with environment variables
npm test "$@" 