#!/bin/bash

# Set environment variables for the web app
echo "Setting environment variables for the web app..."
az webapp config appsettings set --resource-group cvmatch-v2-rg --name cvmatch-v2 --settings OPENAI_API_KEY="889510cdad9f4168add197f45ad27bd7"
az webapp config appsettings set --resource-group cvmatch-v2-rg --name cvmatch-v2 --settings WEBSITES_PORT="3000" 