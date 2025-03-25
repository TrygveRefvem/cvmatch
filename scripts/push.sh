#!/bin/bash

# Run linting and tests
echo "Running linting and tests..."
npm run lint || { echo "Linting failed"; exit 1; }
npm run test:local || { echo "Tests failed"; exit 1; }

# Add changes to Git
echo "Adding changes to Git..."
git add .

# Prompt for commit message
echo "Enter commit message:"
read -r commit_message

# Commit changes with the provided message
git commit -m "$commit_message"

# Push changes to the remote repository
echo "Pushing changes to remote repository..."
git push origin main

echo "Done! Changes have been pushed to GitHub." 